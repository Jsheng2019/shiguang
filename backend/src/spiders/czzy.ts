import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider, VideoSource, VideoType } from './base.js';

const BASE = 'https://www.czspp.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 厂长资源 (czspp.com / czzy.tv) spider — Chinese movies and TV series.
 * Search results contain play links that resolve to iframe-based video players.
 */
export class CzzySpider implements Spider {
  name = 'czzy';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get(`${BASE}/search`, {
        params: { wd: query },
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

      // czspp search results are typically in a list
      $('.search-list li, .result-list li, .video-list li, .list-item, ul li').each((_i, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href');
        const title = linkEl.attr('title') || linkEl.text().trim() || $el.find('.title, .name, h3').text().trim();
        const imgEl = $el.find('img').first();
        const poster = imgEl.attr('data-original') || imgEl.attr('data-src') || imgEl.attr('src') || '';
        const metaText = $el.find('.meta, .info, .desc, .tag').text().trim();
        const yearMatch = metaText.match(/\b(19\d{2}|20\d{2})\b/);
        const ratingText = $el.find('.rating, .score').first().text().trim();

        if (!title || !href) return;

        const fullUrl = href.startsWith('http') ? href :
          `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
        const posterUrl = poster.startsWith('//') ? `https:${poster}` :
          (poster.startsWith('http') || !poster) ? poster : `${BASE}${poster}`;

        results.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          year: yearMatch ? parseInt(yearMatch[1]) : undefined,
          type: this.detectType(metaText || title),
          poster: posterUrl || undefined,
          rating: ratingText ? parseFloat(ratingText) : undefined,
          description: metaText || undefined,
          sourceName: this.name,
          sourceUrl: fullUrl,
          sources: [{ url: fullUrl, quality: '720p', format: 'embed' }],
        });
      });

      // Fallback: direct link matching
      if (results.length === 0) {
        $('a[href*="/vod/"], a[href*="/play/"], a[href*="/detail/"], a[href*="/movie/"]').each((_i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const title = $el.attr('title') || $el.text().trim();
          if (!title || !href) return;

          const fullUrl = href.startsWith('http') ? href :
            `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
          if (results.some((r) => r.sourceUrl === fullUrl)) return;

          const imgEl = $el.find('img').first();
          const poster = imgEl.attr('data-original') || imgEl.attr('src') || '';
          const posterUrl = poster.startsWith('//') ? `https:${poster}` :
            (poster.startsWith('http') || !poster) ? poster : `${BASE}${poster}`;

          results.push({
            title: title.replace(/<[^>]+>/g, '').trim(),
            type: this.detectType(title),
            poster: posterUrl || undefined,
            sourceName: this.name,
            sourceUrl: fullUrl,
            sources: [{ url: fullUrl, quality: '720p', format: 'embed' }],
          });
        });
      }

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

      const title = $('h1, .title, .vod-title, .detail-title').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') || '';
      const poster = $('meta[property="og:image"]').attr('content') ||
        $('.poster img, .cover img, .thumb img').first().attr('src') || '';
      const description = $('meta[property="og:description"]').attr('content') ||
        $('.desc, .summary, .intro, .vod-desc').first().text().trim() || undefined;
      const yearText = $('.year, .info-year').first().text().match(/\d{4}/)?.[0];
      const typeText = $('.type, .info-type, .category, .tag').first().text().trim();

      // Parse richer metadata from info section
      const infoText = $('.info, .detail-info, .vod-info, .meta-info').text();
      const director = this.parseMeta(infoText, '导演');
      const actorsRaw = this.parseMeta(infoText, '主演') || this.parseMeta(infoText, '演员');
      const actors = actorsRaw ? actorsRaw.split(/[,，\/、]/).map((a: string) => a.trim()).filter(Boolean) : undefined;
      const region = this.parseMeta(infoText, '地区') || this.parseMeta(infoText, '国家');
      const language = this.parseMeta(infoText, '语言');
      const duration = this.parseMeta(infoText, '时长') || this.parseMeta(infoText, '片长') || this.parseMeta(infoText, '年代');
      // Also try individual selectors for metadata
      const directorEl = $('.director, .info-director, .vod-director').first().text().trim().replace(/^导演[：:]?\s*/, '');
      const actorsEl = $('.actor, .info-actor, .vod-actor, .cast').first().text().trim().replace(/^主演[：:]?\s*/, '');
      const regionEl = $('.region, .info-region, .vod-region').first().text().trim().replace(/^地区[：:]?\s*/, '');
      const durationEl = $('.duration, .info-duration, .vod-duration, .runtime').first().text().trim().replace(/^(时长|片长)[：:]?\s*/, '');

      if (!title) return null;

      const posterUrl = poster.startsWith('//') ? `https:${poster}` :
        poster.startsWith('http') ? poster : '';

      const sources = this.extractSources($, html);

      return {
        title: title.replace(/<[^>]+>/g, '').trim(),
        year: yearText ? parseInt(yearText) : undefined,
        type: this.detectType(typeText || title),
        poster: posterUrl || undefined,
        description,
        director: director || directorEl || undefined,
        actors: actors || (actorsEl ? actorsEl.split(/[,，\/、]/).map((a: string) => a.trim()).filter(Boolean) : undefined),
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

    // 1. czzy-specific: video URLs in script configs
    const pattern = /["'](?:url|playurl|video|src|file)["']\s*:\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const src = match[1];
      if (!sources.some((s) => s.url === src)) {
        sources.push({
          url: src,
          quality: '720p',
          format: src.includes('.m3u8') ? 'hls' : 'mp4',
        });
      }
    }

    // 2. Raw m3u8 URLs in any script
    const m3u8Pattern = /(https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)/g;
    while ((match = m3u8Pattern.exec(html)) !== null) {
      const src = match[1];
      if (!sources.some((s) => s.url === src)) {
        sources.push({ url: src, quality: '720p', format: 'hls' });
      }
    }

    // 3. <video> sources
    $('video source').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src || sources.some((s) => s.url === src)) return;
      sources.push({
        url: src,
        quality: '720p',
        format: src.includes('.m3u8') ? 'hls' : 'mp4',
      });
    });

    // 4. Player iframes — follow to find real video
    $('iframe[src*="player"], iframe[src*="play"], iframe[src*="vod"], iframe[src*="m3u8"]').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src || sources.some((s) => s.url === src)) return;
      const fullSrc = src.startsWith('http') ? src :
        `https:${src.startsWith('//') ? '' : '//'}${src}`;
      sources.push({ url: fullSrc, quality: '720p', format: 'embed' });
    });

    // 5. data attributes
    $('[data-url], [data-src], [data-video]').each((_i, el) => {
      const src = $(el).attr('data-url') || $(el).attr('data-src') || $(el).attr('data-video') || '';
      if (!src || sources.some((s) => s.url === src)) return;
      const fullSrc = src.startsWith('//') ? `https:${src}` : src;
      sources.push({
        url: fullSrc,
        quality: '720p',
        format: fullSrc.includes('.m3u8') ? 'hls' : 'mp4',
      });
    });

    // Deduplicate
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  private detectType(text: string): VideoType {
    const t = text.toLowerCase();
    if (t.includes('电影') || t.includes('movie') || t.includes('film')) return 'movie';
    if (t.includes('电视剧') || t.includes('连续剧') || t.includes('tv') || t.includes('series')) return 'tvseries';
    if (t.includes('动漫') || t.includes('动画') || t.includes('anime')) return 'anime';
    if (t.includes('综艺') || t.includes('variety') || t.includes('show')) return 'variety';
    if (t.includes('纪录片') || t.includes('documentary')) return 'documentary';
    return 'movie';
  }

  /** Extract a metadata field from info text by label, e.g. "导演：张三" */
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
