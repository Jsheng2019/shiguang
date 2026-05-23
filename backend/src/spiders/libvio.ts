import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider, VideoSource, VideoType } from './base.js';

const BASE = 'https://www.libvio.cc';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * LIBVIO spider — Chinese movies + TV series from www.libvio.cc.
 * Searches via POST form-encoded, parses HTML result cards, extracts m3u8
 * streams from detail pages.
 */
export class LibvioSpider implements Spider {
  name = 'libvio';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.post(
        `${BASE}/index.php?s=/vod-search.html`,
        new URLSearchParams({ wd: query }),
        {
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: BASE,
          },
          timeout: 10000,
        },
      );

      const html = resp.data;
      if (typeof html !== 'string' || html.length < 50) return [];

      const $ = cheerio.load(html);
      const results: SearchResult[] = [];

      // LIBVIO search results typically in <li> items inside a search-list or global list
      $('.searchlist li, ul li').each((_i, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href');
        const title = linkEl.attr('title') || linkEl.text().trim();
        const imgEl = $el.find('img');
        const poster = imgEl.attr('data-original') || imgEl.attr('src') || '';
        const typeText = $el.find('.type, .label, .tag').first().text().trim();
        const yearText = $el.find('.year, .time').first().text().trim();

        if (!title || !href) return;

        const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`;
        const posterUrl = poster.startsWith('//') ? `https:${poster}` : poster.startsWith('http') ? poster : poster ? `${BASE}${poster}` : undefined;
        const year = parseInt(yearText.match(/\d{4}/)?.[0] ?? '');
        const type = this.detectType(typeText || title);

        results.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          year: year || undefined,
          type,
          poster: posterUrl,
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

      // Extract metadata
      const title = $('h1, .title, .page-title').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') || '';
      const poster = $('meta[property="og:image"]').attr('content') ||
        $('.poster img, .cover img, .thumb img').first().attr('src') || '';
      const description = $('meta[property="og:description"]').attr('content') ||
        $('.desc, .summary, .intro').first().text().trim() || undefined;
      const yearText = $('.year, .info-year').first().text().match(/\d{4}/)?.[0];
      const typeText = $('.type, .info-type').first().text().trim();

      if (!title) return null;

      const posterUrl = poster.startsWith('//') ? `https:${poster}` :
        poster.startsWith('http') ? poster : '';

      // Extract video sources from the player area
      const sources = this.extractSources($);

      return {
        title: title.replace(/<[^>]+>/g, '').trim(),
        year: yearText ? parseInt(yearText) : undefined,
        type: this.detectType(typeText || title),
        poster: posterUrl || undefined,
        description,
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

    // Common patterns for Chinese video site players:
    // 1. <video> tags with <source> children
    $('video source').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      const isHls = src.includes('.m3u8');
      sources.push({
        url: src,
        quality: '720p',
        format: isHls ? 'hls' : 'mp4',
      });
    });

    // 2. data-url or video-url attributes on player elements
    $('[data-url], [data-video], [data-playurl]').each((_i, el) => {
      const src = $(el).attr('data-url') || $(el).attr('data-video') || $(el).attr('data-playurl') || '';
      if (!src || sources.some((s) => s.url === src)) return;
      const isHls = src.includes('.m3u8');
      sources.push({
        url: src,
        quality: '720p',
        format: isHls ? 'hls' : 'mp4',
      });
    });

    // 3. Script-embedded player config (JSON objects with url/playurl fields)
    const scriptTexts: string[] = [];
    $('script').each((_i, el) => {
      const text = $(el).html() || '';
      if (text.includes('.m3u8') || text.includes('playurl') || text.includes('video_url')) {
        scriptTexts.push(text);
      }
    });

    for (const text of scriptTexts) {
      const m3u8Matches = text.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g);
      if (m3u8Matches) {
        for (const m3u8 of m3u8Matches) {
          if (!sources.some((s) => s.url === m3u8)) {
            sources.push({ url: m3u8, quality: '720p', format: 'hls' });
          }
        }
      }
      const mp4Matches = text.match(/(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g);
      if (mp4Matches) {
        for (const mp4 of mp4Matches) {
          if (!sources.some((s) => s.url === mp4)) {
            sources.push({ url: mp4, quality: '720p', format: 'mp4' });
          }
        }
      }
    }

    // 4. Player iframe src — follow it to find the real video
    $('iframe[src*="player"], iframe[src*="play"], iframe[src*="vod"]').each((_i, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      const fullSrc = src.startsWith('http') ? src : `${BASE}${src.startsWith('/') ? '' : '/'}${src}`;
      if (!sources.some((s) => s.url === fullSrc)) {
        sources.push({ url: fullSrc, quality: '720p', format: 'embed' });
      }
    });

    // Deduplicate by URL
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  private detectType(text: string): VideoType {
    const t = text.toLowerCase();
    if (t.includes('电影') || t.includes('movie')) return 'movie';
    if (t.includes('电视剧') || t.includes('连续剧') || t.includes('tv') || t.includes('series')) return 'tvseries';
    if (t.includes('动漫') || t.includes('动画') || t.includes('anime')) return 'anime';
    if (t.includes('综艺') || t.includes('variety') || t.includes('show')) return 'variety';
    if (t.includes('纪录片') || t.includes('记录') || t.includes('documentary')) return 'documentary';
    return 'movie';
  }
}
