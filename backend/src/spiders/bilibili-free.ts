import axios from 'axios';
import type { SearchResult, Spider, VideoSource } from './base.js';
import { signParams } from './bilibili-wbi.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface BiliVideoItem {
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
}

interface BiliPlayUrlData {
  durl?: Array<{ url: string; size: number }>;
  dash?: {
    video: Array<{ id: number; baseUrl: string; bandwidth: number; width: number; height: number }>;
  };
  quality: number;
  accept_description: string[];
}

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
      const bvids: (string | undefined)[] = [];

      for (const section of resultTypes) {
        if (section.result_type !== 'video') continue;

        for (const v of section.data ?? []) {
          const title = v.title.replace(/<[^>]+>/g, '').trim();
          if (!title) continue;

          const pic = v.pic.startsWith('//') ? `https:${v.pic}` : v.pic;
          const type = this.detectType(v.typename, v.tag || '');
          const rating = this.playToRating(v.play);
          const sourceUrl = v.arcurl || `https://www.bilibili.com/video/${v.bvid}`;

          results.push({
            title,
            type,
            poster: pic,
            rating,
            description: v.description || undefined,
            sourceName: this.name,
            sourceUrl,
            sources: [
              {
                url: sourceUrl,
                quality: '720p',
                format: 'embed',
              },
            ],
          });
          bvids.push(v.bvid || undefined);
        }
      }

      // Enrich top results with real video URLs via player API (parallel)
      const topN = Math.min(results.length, 10);
      if (topN > 0) {
        const enrichResults = await Promise.allSettled(
          bvids.slice(0, topN).map(bvid =>
            bvid ? this.extractStreams(bvid) : Promise.resolve([] as VideoSource[]),
          ),
        );

        for (let i = 0; i < topN; i++) {
          const r = enrichResults[i];
          if (r.status === 'fulfilled' && r.value.length > 0) {
            results[i].sources = r.value;
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    // Extract bvid from URL
    const bvidMatch = url.match(/BV[\w]+/);
    const avMatch = url.match(/av(\d+)/);

    let sources: VideoSource[] = [];

    if (bvidMatch) {
      sources = await this.extractStreams(bvidMatch[0]);
    } else if (avMatch) {
      sources = await this.extractStreams(undefined, parseInt(avMatch[1]));
    }

    const title =
      url.split('/').pop()?.replace(/[/?&]/g, '_') || 'Bilibili Video';

    return {
      title,
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: sources.length > 0 ? sources : [{ url, quality: '720p', format: 'embed' }],
    };
  }

  /**
   * Extract actual video stream URLs from Bilibili's player API.
   * Gets cid from view API, then calls the wbi-signed player API.
   */
  private async extractStreams(bvid?: string, avid?: number): Promise<VideoSource[]> {
    try {
      // 1. Get cid from video info
      let cid: number | null = null;
      const viewParams: Record<string, string | number> = {};
      if (bvid) viewParams.bvid = bvid;
      else if (avid) viewParams.avid = avid;
      else return [];

      const viewResp = await axios.get(
        'https://api.bilibili.com/x/web-interface/view',
        {
          params: viewParams,
          headers: {
            'User-Agent': UA,
            Referer: 'https://www.bilibili.com',
          },
          timeout: 5000,
        },
      );

      cid = viewResp.data?.data?.cid;
      if (!cid) {
        // Try pages[0].cid as fallback
        const pages = viewResp.data?.data?.pages;
        if (pages && pages.length > 0) cid = pages[0].cid;
      }
      if (!cid) return [];

      // 2. Sign params for player API (guest quality: qn=32 for 480P)
      const rawParams: Record<string, string | number> = {
        bvid: bvid || '',
        cid,
        qn: 32,
        fnval: 1,
        platform: 'html5',
      };
      const params = await signParams(rawParams);

      // 3. Call the wbi-signed player API
      const resp = await axios.get(
        'https://api.bilibili.com/x/player/wbi/playurl',
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
      const bestQuality = qualityLabels[0] || '480P';

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
          quality: qMap[bestQuality] || '480p',
          format: 'mp4',
        });
      }

      return sources;
    } catch {
      return [];
    }
  }

  private detectType(typename: string, tag: string): SearchResult['type'] {
    const t = typename.toLowerCase();
    const tg = tag.toLowerCase();
    if (
      t.includes('纪录') || t.includes('记录') ||
      tg.includes('纪录片') || tg.includes('documentary')
    )
      return 'documentary';
    if (t.includes('电影') || t.includes('影视') || tg.includes('电影')) return 'movie';
    if (
      t.includes('剧集') || t.includes('连载') || t.includes('番剧') ||
      t.includes('动画') || tg.includes('番剧')
    )
      return 'tvseries';
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
