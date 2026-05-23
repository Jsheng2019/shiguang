import axios from 'axios';
import type { SearchResult, Spider } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface BiliVideoItem {
  title: string;
  arcurl: string;
  pic: string;
  duration: string;
  author: string;
  description: string;
  tag: string;
  typename: string;
  play: number;
}

/**
 * Bilibili free video spider — searches public videos on Bilibili.
 * Uses the official search API (no auth required). Supports both
 * Chinese and English queries.
 */
export class BilibiliFreeSpider implements Spider {
  name = 'bilibili-free';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get(
        'https://api.bilibili.com/x/web-interface/search/all/v2',
        {
          params: { keyword: query, page: 1, pagesize: 20 },
          headers: {
            'User-Agent': UA,
            Referer: 'https://www.bilibili.com',
          },
          timeout: 10000,
        },
      );

      if (resp.data?.code !== 0) return [];

      const resultTypes: Array<{ result_type: string; data?: BiliVideoItem[] }> =
        resp.data?.data?.result ?? [];
      const results: SearchResult[] = [];

      for (const section of resultTypes) {
        if (section.result_type !== 'video') continue;

        for (const v of section.data ?? []) {
          const title = v.title.replace(/<[^>]+>/g, '').trim();
          if (!title) continue;

          const pic = v.pic.startsWith('//') ? `https:${v.pic}` : v.pic;

          // Determine content type from typename / tags
          const type = this.detectType(v.typename, v.tag || '');

          // Convert play count to a 0-10 rating proxy
          const rating = this.playToRating(v.play);

          results.push({
            title,
            type,
            poster: pic,
            rating,
            description: v.description || undefined,
            sourceName: this.name,
            sourceUrl: v.arcurl,
            sources: [
              {
                url: v.arcurl,
                quality: '720p',
                format: 'mp4',
              },
            ],
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    // Bilibili's video detail API (x/web-interface/view) is available
    // but the page URL itself is the most reliable access method
    const title =
      url.split('/').pop()?.replace(/[/?&]/g, '_') || 'Bilibili Video';
    return {
      title,
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }

  private detectType(typename: string, tag: string): SearchResult['type'] {
    const t = typename.toLowerCase();
    const tg = tag.toLowerCase();
    // Check both typename and tags for type hints
    if (
      t.includes('纪录') ||
      t.includes('记录') ||
      tg.includes('纪录片') ||
      tg.includes('documentary')
    )
      return 'documentary';
    if (t.includes('电影') || t.includes('影视') || tg.includes('电影')) return 'movie';
    if (
      t.includes('剧集') ||
      t.includes('连载') ||
      t.includes('番剧') ||
      t.includes('动画') ||
      tg.includes('番剧')
    )
      return 'series';
    return 'movie';
  }

  private playToRating(play: number): number | undefined {
    if (play > 500_000) return 8;
    if (play > 100_000) return 7;
    if (play > 10_000) return 6;
    if (play > 1_000) return 4;
    return undefined;
  }
}
