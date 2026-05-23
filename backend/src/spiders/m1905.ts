import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider, VideoSource, VideoType } from './base.js';

const BASE = 'https://www.1905.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 1905电影网 spider — Chinese classic/modern movies from www.1905.com.
 * Many videos are free to play with direct video URLs embedded in the page.
 */
export class M1905Spider implements Spider {
  name = 'm1905';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get(`${BASE}/search`, {
        params: { q: query },
        headers: {
          'User-Agent': UA,
          Referer: BASE,
        },
        timeout: 10000,
      });

      const html = resp.data;
      if (typeof html !== 'string' || html.length < 50) return [];

      const $ = cheerio.load(html);
      const results: SearchResult[] = [];

      // 1905 search results are in div.movie_box containers
      // Actual HTML: div.movie_box > div.new_content > div.subject-box.subject-movie-box
      //   > h2.title-mv > a[title]  (title with <b>(year)</b>)
      //   > div.main > div.movie-pic > a.img-a > img  (poster)
      //   > div.main > div.movie-pic > b.jb  (rating)
      //   > ul.cont > li.star  (actors/description)
      $('.subject-box.subject-movie-box').each((_i, el) => {
        const $el = $(el);
        const linkEl = $el.find('h2.title-mv > a').first();
        const href = linkEl.attr('href');
        const title = linkEl.attr('title') || linkEl.text().trim();
        const imgEl = $el.find('.movie-pic img').first();
        const poster = imgEl.attr('src') || imgEl.attr('data-original') || '';
        const ratingText = $el.find('.jb').first().text().trim();
        const yearMatch = linkEl.text().match(/\b(19\d{2}|20\d{2})\b/);
        const descText = $el.find('.cont').text().trim();

        if (!title || !href) return;

        const fullUrl = href.startsWith('http') ? href :
          `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
        const posterUrl = poster.startsWith('//') ? `https:${poster}` :
          (poster.startsWith('http') || !poster) ? poster : `${BASE}${poster}`;
        const rating = parseFloat(ratingText);

        results.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          year: yearMatch ? parseInt(yearMatch[1]) : undefined,
          type: 'movie',
          poster: posterUrl || undefined,
          rating: isNaN(rating) ? undefined : Math.min(10, Math.max(0, rating)),
          description: descText.replace(/简介：/, '').slice(0, 200) || undefined,
          sourceName: this.name,
          sourceUrl: fullUrl,
          sources: [{ url: fullUrl, quality: '720p', format: 'embed' }],
        });
      });

      return results;
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    try {
      const resp = await axios.get(url, {
        headers: {
          'User-Agent': UA,
          Referer: BASE,
        },
        timeout: 10000,
      });

      const html = resp.data;
      if (typeof html !== 'string') return null;

      const $ = cheerio.load(html);

      const title = $('h1, .title, .film-title, .vod-title').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') || '';
      const poster = $('meta[property="og:image"]').attr('content') ||
        $('.poster img, .cover img, .thumb img').first().attr('src') || '';
      const description = $('meta[property="og:description"]').attr('content') ||
        $('.desc, .summary, .intro, .film-desc').first().text().trim() || undefined;
      const yearText = $('.year, .info-year, .meta-year, .film-year').first().text().match(/\d{4}/)?.[0];
      const ratingText = $('.rating, .score, .star').first().text().trim();

      // Parse richer metadata
      const infoText = $('.info, .detail-info, .film-info, .meta, .movie-info').text();
      const director = this.parseMeta(infoText, '导演');
      const actorsRaw = this.parseMeta(infoText, '主演') || this.parseMeta(infoText, '演员');
      const actors = actorsRaw ? actorsRaw.split(/[,，\/、]/).map((a) => a.trim()).filter(Boolean) : undefined;
      const region = this.parseMeta(infoText, '地区') || this.parseMeta(infoText, '国家') || this.parseMeta(infoText, '产地');
      const language = this.parseMeta(infoText, '语言');
      const duration = this.parseMeta(infoText, '时长') || this.parseMeta(infoText, '片长');
      const directorEl = $('.director, .info-director').first().text().trim().replace(/^导演[：:]?\s*/, '');
      const actorsEl = $('.actor, .info-actor, .cast').first().text().trim().replace(/^主演[：:]?\s*/, '');
      const regionEl = $('.region, .info-region').first().text().trim().replace(/^地区[：:]?\s*/, '');
      const durationEl = $('.duration, .info-duration, .runtime').first().text().trim().replace(/^(时长|片长)[：:]?\s*/, '');

      if (!title) return null;

      const posterUrl = poster.startsWith('//') ? `https:${poster}` :
        poster.startsWith('http') ? poster : '';
      const rating = parseFloat(ratingText);

      // Extract video sources — 1905 puts video URLs in config
      const sources = this.extractSources($, html);

      return {
        title: title.replace(/<[^>]+>/g, '').trim(),
        year: yearText ? parseInt(yearText) : undefined,
        type: 'movie',
        poster: posterUrl || undefined,
        rating: isNaN(rating) ? undefined : Math.min(10, Math.max(0, rating)),
        description,
        director: director || directorEl || undefined,
        actors: actors || (actorsEl ? actorsEl.split(/[,，\/、]/).map((a) => a.trim()).filter(Boolean) : undefined),
        region: region || regionEl || undefined,
        language: language || undefined,
        duration: duration || durationEl || undefined,
        sourceName: this.name,
        sourceUrl: url,
        sources: sources.length > 0 ? sources : [{ url, quality: '720p', format: 'embed' }],
      };
    } catch {
      return null;
    }
  }

  private extractSources($: cheerio.CheerioAPI, html: string): VideoSource[] {
    const sources: VideoSource[] = [];

    // 1. 1905-specific: the video config is often embedded in a script as a player object
    // Look for patterns like: "url": "http..." or "playurl": "http..." or "videoUrl": "http..."
    const configPatterns = [
      /["'](?:url|playurl|videoUrl|file|src|mp4)["']\s*:\s*["'](https?:\/\/[^"']+)["']/g,
      /["'](?:url|playurl|videoUrl|file|src|mp4)["']\s*:\s*["'](\/\/[^"']+)["']/g,
    ];

    for (const pattern of configPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        let videoUrl = match[1];
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!sources.some((s) => s.url === videoUrl)) {
          sources.push({
            url: videoUrl,
            quality: '720p',
            format: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
          });
        }
      }
    }

    // 2. <video> tag sources
    $('video source').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src || sources.some((s) => s.url === src)) return;
      sources.push({
        url: src,
        quality: '720p',
        format: src.includes('.m3u8') ? 'hls' : 'mp4',
      });
    });

    // 3. data attributes
    $('[data-url], [data-src], [data-playurl]').each((_i, el) => {
      const src = $(el).attr('data-url') || $(el).attr('data-src') || $(el).attr('data-playurl') || '';
      if (!src || sources.some((s) => s.url === src)) return;
      const fullSrc = src.startsWith('//') ? `https:${src}` : src;
      sources.push({
        url: fullSrc,
        quality: '720p',
        format: fullSrc.includes('.m3u8') ? 'hls' : 'mp4',
      });
    });

    // 4. Iframe player
    $('iframe[src*="player"], iframe[src*="play"], iframe[src*="vod"]').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src || sources.some((s) => s.url === src)) return;
      const fullSrc = src.startsWith('http') ? src :
        `https:${src.startsWith('//') ? '' : '//'}${src}`;
      sources.push({ url: fullSrc, quality: '720p', format: 'embed' });
    });

    // Deduplicate
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  /** Extract a metadata field from info text by label */
  private parseMeta(text: string, label: string): string | undefined {
    const patterns = [
      new RegExp(`${label}[：:]\\s*([^\\n]+)`, 'i'),
      new RegExp(`${label}\\s*([^\\n]+)`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const val = match[1].trim();
        if (val && val.length < 100) return val;
      }
    }
    return undefined;
  }
}
