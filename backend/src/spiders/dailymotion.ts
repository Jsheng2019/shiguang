import axios from 'axios';
import type { SearchResult, Spider } from './base.js';

const DM_BASE = 'https://api.dailymotion.com';
const DM_TIMEOUT = 8000;

interface DMVideo {
  id: string;
  title: string;
  thumbnail_360_url: string;
  url: string;
  duration: number;
  'owner.username': string;
  views_total: number;
}

interface DMResponse {
  list: DMVideo[];
  total: number;
  has_more: boolean;
}

/**
 * Dailymotion video spider — searches public videos on Dailymotion.
 * Uses the official public JSON API — no API key required.
 */
export class DailymotionSpider implements Spider {
  name = 'dailymotion';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get(`${DM_BASE}/videos`, {
        params: {
          search: query,
          limit: 20,
          fields: 'id,title,thumbnail_360_url,url,duration,owner.username,views_total',
        },
        headers: { 'User-Agent': 'VideoApp/0.1' },
        timeout: DM_TIMEOUT,
      });

      const data = resp.data as DMResponse;
      if (!data?.list) return [];

      return data.list.map((v) => {
        const rating =
          v.views_total > 100000
            ? 8
            : v.views_total > 10000
              ? 6
              : v.views_total > 1000
                ? 4
                : undefined;

        return {
          title: v.title,
          type: 'movie' as const,
          poster: v.thumbnail_360_url || undefined,
          rating,
          description: `by ${v['owner.username']} | ${v.duration}s`,
          sourceName: this.name,
          sourceUrl: v.url,
          sources: [
            {
              url: v.url,
              quality: '720p' as const,
              format: 'mp4' as const,
            },
          ],
        };
      });
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/dailymotion\.com\/video\/(\w+)/);
    if (!match) return null;

    return {
      title: `Dailymotion ${match[1]}`,
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }
}
