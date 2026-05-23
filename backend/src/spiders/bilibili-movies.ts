import axios from 'axios';
import type { SearchResult, Spider, VideoSource, VideoType } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface BiliSearchItem {
  title: string;
  arcurl: string;
  bvid: string;
  aid: number;
  pic: string;
  duration: string;
  author: string;
  description: string;
  tag: string;
  typename: string;
  play: number;
  /** Video length in seconds (from search/type endpoint) */
  duration_raw?: number;
}

interface BiliPlayUrlData {
  durl?: Array<{ url: string; size: number }>;
  dash?: {
    video: Array<{ id: number; baseUrl: string; bandwidth: number; width: number; height: number }>;
  };
  quality: number;
  accept_description: string[];
}

interface BiliSearchResponse {
  code: number;
  data?: {
    numResults: number;
    pages: number;
    result?: BiliSearchItem[];
  };
}

/**
 * Bilibili movie/documentary spider.
 * Extends the bilibili-free approach but targets longer videos (full movies,
 * documentaries) via the search/type API and filters for duration > 30min.
 */
export class BilibiliMoviesSpider implements Spider {
  name = 'bilibili-movies';

  async search(query: string): Promise<SearchResult[]> {
    try {
      // Use the working search/all/v2 endpoint (same as bilibili-free) instead of
      // the search/type endpoint which is blocked by Bilibili WAF (412).
      const resp = await axios.get(
        'https://api.bilibili.com/x/web-interface/search/all/v2',
        {
          params: { keyword: query, page: 1, pagesize: 50 },
          headers: {
            'User-Agent': UA,
            Referer: 'https://www.bilibili.com',
          },
          timeout: 10000,
        },
      );

      if (resp.data?.code !== 0) return [];

      interface ResultSection {
        result_type: string;
        data?: BiliSearchItem[];
      }
      const resultTypes: ResultSection[] =
        resp.data?.data?.result ?? [];
      const results: SearchResult[] = [];

      for (const section of resultTypes) {
        // Only process video results
        if (section.result_type !== 'video') continue;

        for (const v of section.data ?? []) {
          const title = v.title.replace(/<[^>]+>/g, '').trim();
          if (!title) continue;

          const pic = v.pic.startsWith('//') ? `https:${v.pic}` : v.pic;
          const type = this.detectType(v.typename, v.tag || '');
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
                quality: '720p' as const,
                format: 'embed' as const,
              },
            ],
          });
        }
      }

      return results.slice(0, 20);
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    // Extract bvid/avid from URL
    const bvidMatch = url.match(/BV[\w]+/);
    const avMatch = url.match(/av(\d+)/);

    let sources: VideoSource[] = [];

    if (bvidMatch) {
      sources = await this.extractStreams(bvidMatch[0]);
    } else if (avMatch) {
      sources = await this.extractStreams(undefined, parseInt(avMatch[1]));
    }

    // Fetch metadata for title
    let title = url.split('/').pop()?.replace(/[/?&]/g, '_') || 'Bilibili Video';
    let poster: string | undefined;
    let description: string | undefined;
    let type: VideoType = 'movie';

    try {
      const infoResp = await axios.get(
        'https://api.bilibili.com/x/web-interface/view',
        {
          params: bvidMatch ? { bvid: bvidMatch[0] } : { aid: parseInt(avMatch![1]) },
          headers: {
            'User-Agent': UA,
            Referer: 'https://www.bilibili.com',
          },
          timeout: 8000,
        },
      );

      const data = infoResp.data?.data;
      if (data) {
        title = data.title || title;
        if (data.pic) {
          poster = data.pic.startsWith('//') ? `https:${data.pic}` : data.pic;
        }
        description = data.desc || undefined;
        if (data.tname) {
          type = this.detectType(data.tname, (data.tag || '').join?.(' ') || '');
        }
      }
    } catch {
      // use defaults
    }

    return {
      title,
      type,
      poster,
      description,
      sourceName: this.name,
      sourceUrl: url,
      sources: sources.length > 0 ? sources : [{ url, quality: '720p', format: 'embed' }],
    };
  }

  private async extractStreams(bvid?: string, avid?: number): Promise<VideoSource[]> {
    try {
      const params: Record<string, string | number> = {
        qn: 80,
        fnval: 1,
        fourk: 1,
      };
      if (bvid) params.bvid = bvid;
      else if (avid) params.avid = avid;
      else return [];

      const resp = await axios.get(
        'https://api.bilibili.com/x/player/playurl',
        {
          params,
          headers: {
            'User-Agent': UA,
            Referer: 'https://www.bilibili.com',
          },
          timeout: 8000,
        },
      );

      const data = resp.data?.data as BiliPlayUrlData | undefined;
      if (!data?.durl) return [];

      const sources: VideoSource[] = [];
      const qualityLabels = data.accept_description || [];
      const bestQuality = qualityLabels[0] || '720P';

      const qMap: Record<string, VideoSource['quality']> = {
        '1080P': '1080p', '1080p': '1080p',
        '720P': '720p', '720p': '720p',
        '480P': '480p', '480p': '480p',
        '360P': '360p', '360p': '360p',
      };

      for (const d of data.durl) {
        if (!d.url) continue;
        sources.push({
          url: d.url,
          quality: qMap[bestQuality] || '720p',
          format: 'mp4',
        });
      }

      return sources;
    } catch {
      return [];
    }
  }

  private detectType(typename: string, tag: string): VideoType {
    const t = typename.toLowerCase();
    const tg = tag.toLowerCase();
    if (
      t.includes('纪录') || t.includes('记录') ||
      tg.includes('纪录片') || tg.includes('documentary')
    ) return 'documentary';
    if (t.includes('电影') || t.includes('影视') || tg.includes('电影')) return 'movie';
    if (
      t.includes('剧集') || t.includes('连载') || t.includes('番剧') ||
      t.includes('动画') || tg.includes('番剧')
    ) return 'tvseries';
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
