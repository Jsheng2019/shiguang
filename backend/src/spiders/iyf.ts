import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider, VideoSource, VideoType } from './base.js';

const BASE = 'https://www.iyf.tv';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 爱壹帆 (iyf.tv) spider — the largest overseas Chinese video site.
 * Searches via GET with ?q=, parses video cards, extracts video sources
 * from detail pages.
 */
export class IYFSpider implements Spider {
  name = 'iyf';

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

      // iyf.tv search results are typically in grid items or card lists
      $('.search-result .item, .video-list .item, .grid-item, .card, [class*="item"]').each((_i, el) => {
        const $el = $(el);
        const linkEl = $el.find('a[href]').first();
        const href = linkEl.attr('href');
        const title = linkEl.attr('title') || linkEl.text().trim() || $el.find('.title, .name').text().trim();
        const imgEl = $el.find('img').first();
        const poster = imgEl.attr('data-src') || imgEl.attr('data-original') || imgEl.attr('src') || '';
        const metaText = $el.find('.meta, .info, .desc, .type').text().trim();
        const yearMatch = metaText.match(/\b(19\d{2}|20\d{2})\b/);

        if (!title || !href) return;

        const fullUrl = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
        const posterUrl = poster.startsWith('//') ? `https:${poster}` :
          (poster.startsWith('http') || !poster) ? poster : `${BASE}${poster}`;

        results.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          year: yearMatch ? parseInt(yearMatch[1]) : undefined,
          type: this.detectType(metaText || title),
          poster: posterUrl || undefined,
          sourceName: this.name,
          sourceUrl: fullUrl,
          sources: [{ url: fullUrl, quality: '720p', format: 'embed' }],
        });
      });

      // If the above generic selector fails, try alternative layout
      if (results.length === 0) {
        $('a[href*="/play/"], a[href*="/detail/"], a[href*="/vod/"]').each((_i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const title = $el.attr('title') || $el.text().trim();
          const imgEl = $el.find('img').first();
          const poster = imgEl.attr('data-src') || imgEl.attr('src') || '';

          if (!title || !href) return;
          const fullUrl = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;

          // Avoid duplicates
          if (results.some((r) => r.sourceUrl === fullUrl)) return;

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

      const title = $('h1, .title, .video-title, .detail-title').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') || '';
      const poster = $('meta[property="og:image"]').attr('content') ||
        $('.poster img, .cover img, .thumb img').first().attr('src') || '';
      const description = $('meta[property="og:description"]').attr('content') ||
        $('.desc, .summary, .intro, .detail-desc').first().text().trim() || undefined;
      const yearText = $('.year, .info-year, .meta-year').first().text().match(/\d{4}/)?.[0];
      const typeText = $('.type, .info-type, .category, .tag').first().text().trim();

      // Parse richer metadata
      const infoText = $('.info, .detail-info, .vod-info, .meta, .video-info').text();
      const director = this.parseMeta(infoText, '导演');
      const actorsRaw = this.parseMeta(infoText, '主演') || this.parseMeta(infoText, '演员');
      const actors = actorsRaw ? actorsRaw.split(/[,，\/、]/).map((a) => a.trim()).filter(Boolean) : undefined;
      const region = this.parseMeta(infoText, '地区') || this.parseMeta(infoText, '国家') || this.parseMeta(infoText, '区域');
      const language = this.parseMeta(infoText, '语言');
      const duration = this.parseMeta(infoText, '时长') || this.parseMeta(infoText, '片长') || this.parseMeta(infoText, '时间');
      const directorEl = $('.director, .info-director').first().text().trim().replace(/^导演[：:]?\s*/, '');
      const actorsEl = $('.actor, .info-actor, .cast').first().text().trim().replace(/^主演[：:]?\s*/, '');
      const regionEl = $('.region, .info-region').first().text().trim().replace(/^地区[：:]?\s*/, '');
      const durationEl = $('.duration, .info-duration, .runtime').first().text().trim().replace(/^(时长|片长)[：:]?\s*/, '');

      if (!title) return null;

      const posterUrl = poster.startsWith('//') ? `https:${poster}` :
        poster.startsWith('http') ? poster : '';

      const sources = this.extractSources($);

      return {
        title: title.replace(/<[^>]+>/g, '').trim(),
        year: yearText ? parseInt(yearText) : undefined,
        type: this.detectType(typeText || title),
        poster: posterUrl || undefined,
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

  private extractSources($: cheerio.CheerioAPI): VideoSource[] {
    const sources: VideoSource[] = [];

    // 1. <video> sources
    $('video source').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      sources.push({
        url: src,
        quality: '720p',
        format: src.includes('.m3u8') ? 'hls' : 'mp4',
      });
    });

    // 2. data attributes on player containers
    $('[data-url], [data-src], [data-video], [data-playurl]').each((_i, el) => {
      const src = $(el).attr('data-url') || $(el).attr('data-src') || $(el).attr('data-video') || $(el).attr('data-playurl') || '';
      if (!src || sources.some((s) => s.url === src)) return;
      sources.push({
        url: src,
        quality: '720p',
        format: src.includes('.m3u8') ? 'hls' : 'mp4',
      });
    });

    // 3. Script-embedded URLs
    const scriptTexts: string[] = [];
    $('script').each((_i, el) => {
      const text = $(el).html() || '';
      if (text.includes('.m3u8') || text.includes('play_url') || text.includes('videoUrl') || text.includes('vod_data')) {
        scriptTexts.push(text);
      }
    });

    for (const text of scriptTexts) {
      // Try JSON-like config first
      const urlMatch = text.match(/['"](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)['"]/);
      if (urlMatch) {
        const src = urlMatch[1];
        if (!sources.some((s) => s.url === src)) {
          sources.push({
            url: src,
            quality: '720p',
            format: src.includes('.m3u8') ? 'hls' : 'mp4',
          });
        }
      }
    }

    // 4. Playlist links on detail page (episode list)
    $('.playlist a, .episode-list a, .ep-list a, [class*="ep"] a').each((_i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const fullUrl = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
      if (!sources.some((s) => s.url === fullUrl) && !fullUrl.endsWith('.html')) {
        sources.push({ url: fullUrl, quality: '720p', format: 'embed' });
      }
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
    if (t.includes('动漫') || t.includes('动画') || t.includes('anime') || t.includes('cartoon')) return 'anime';
    if (t.includes('综艺') || t.includes('variety') || t.includes('show')) return 'variety';
    if (t.includes('纪录片') || t.includes('记录') || t.includes('documentary')) return 'documentary';
    return 'movie';
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
