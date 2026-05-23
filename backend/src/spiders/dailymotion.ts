import axios from 'axios';
import type { SearchResult, Spider, VideoSource } from './base.js';

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

interface DMQuality {
  type: string;
  url: string;
}

/**
 * Dailymotion video spider — searches public videos and extracts actual
 * streamable video URLs via the public API.
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

    const videoId = match[1];
    const sources = await this.extractStreams(videoId);

    // Fetch metadata
    let title = `Dailymotion ${videoId}`;
    let poster: string | undefined;
    try {
      const metaResp = await axios.get(`${DM_BASE}/video/${videoId}`, {
        params: { fields: 'title,thumbnail_360_url' },
        timeout: 5000,
      });
      const meta = metaResp.data as { title?: string; thumbnail_360_url?: string };
      title = meta.title || title;
      poster = meta.thumbnail_360_url;
    } catch {
      // use defaults
    }

    return {
      title,
      type: 'movie',
      poster,
      sourceName: this.name,
      sourceUrl: url,
      sources: sources.length > 0 ? sources : [{ url, quality: '720p', format: 'mp4' }],
    };
  }

  /**
   * Extract actual streamable video URLs from Dailymotion's API.
   * Uses the video qualities endpoint which returns direct MP4/M3U8 URLs.
   */
  private async extractStreams(videoId: string): Promise<VideoSource[]> {
    try {
      const resp = await axios.get(`${DM_BASE}/video/${videoId}`, {
        params: { fields: 'qualities' },
        timeout: 5000,
      });

      const data = resp.data as { qualities?: Record<string, DMQuality[]> };
      const qualities = data?.qualities;
      if (!qualities) return [];

      // qualities is keyed by resolution label: "1080", "720", "480", "380", "240", "144", "auto"
      const order: VideoSource['quality'][] = ['1080p', '720p', '480p', '360p'];
      const sources: VideoSource[] = [];

      for (const q of order) {
        const keyHd = q.replace('p', '');
        const list = qualities[keyHd];
        if (!list || list.length === 0) continue;

        // Prefer HLS over MP4 for adaptive streaming
        const hls = list.find((item) => item.type === 'application/x-mpegURL');
        const mp4 = list.find((item) => item.type === 'video/mp4');

        if (hls) {
          sources.push({ url: hls.url, quality: q, format: 'hls' });
        } else if (mp4) {
          sources.push({ url: mp4.url, quality: q, format: 'mp4' });
        }
      }

      return sources;
    } catch {
      return [];
    }
  }
}
