import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface YtVideoItem {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  description: string;
}

/**
 * YouTube public search spider.
 *
 * Scrapes youtube.com/results and extracts video data from the embedded
 * `ytInitialData` JSON payload. No official API key required.
 */
export class YouTubeSpider implements Spider {
  name = 'youtube';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get('https://www.youtube.com/results', {
        params: { search_query: query },
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        timeout: 10000,
      });

      const videos = this.extractVideos(resp.data);

      return videos.map((v) => ({
        title: v.title,
        type: 'movie' as const,
        poster: v.thumbnail,
        description: v.description || undefined,
        sourceName: this.name,
        sourceUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
        sources: [
          {
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            quality: '720p' as const,
            format: 'mp4' as const,
          },
        ],
      }));
    } catch (err) {
      console.warn(`[youtube] search failed:`, err instanceof Error ? err.message : err);
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
    if (!match) return null;

    const videoId = match[1];

    // Use YouTube oEmbed API — returns reliable metadata without JS rendering
    try {
      const oembedResp = await axios.get('https://www.youtube.com/oembed', {
        params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
        headers: { 'User-Agent': UA },
        timeout: 5000,
      });

      const data = oembedResp.data as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };

      // Also fetch the watch page for richer data (JSON-LD for date)
      let year: number | undefined;
      try {
        const pageResp = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: { 'User-Agent': UA },
          timeout: 5000,
        });
        const $ = cheerio.load(pageResp.data);
        $('script[type="application/ld+json"]').each((_i, el) => {
          try {
            const json = JSON.parse($(el).html() ?? '{}');
            const item = Array.isArray(json) ? json[0] : json;
            if (item?.datePublished) {
              year = new Date(item.datePublished).getFullYear();
            }
          } catch {
            // ignore
          }
        });
      } catch {
        // year will be undefined, that's fine
      }

      return {
        title: data.title || `YouTube ${videoId}`,
        year,
        type: 'movie',
        poster: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        sourceName: this.name,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sources: [
          {
            url: `https://www.youtube.com/watch?v=${videoId}`,
            quality: '720p',
            format: 'mp4',
          },
        ],
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse ytInitialData from YouTube search page HTML.
   */
  private extractVideos(html: string): YtVideoItem[] {
    const match = html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/);
    if (!match) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    try {
      data = JSON.parse(match[1]);
    } catch {
      return [];
    }

    const items: YtVideoItem[] = [];

    try {
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents ?? [];

      for (const section of contents) {
        const videoItems = section?.itemSectionRenderer?.contents ?? [];
        for (const raw of videoItems) {
          const video = raw?.videoRenderer;
          if (!video?.videoId) continue;

          const title =
            video.title?.runs?.[0]?.text ??
            video.title?.simpleText ??
            'Untitled';

          const thumbs = video.thumbnail?.thumbnails;
          const thumbnail =
            thumbs?.[thumbs.length - 1]?.url ??
            `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

          const channelName = video.shortBylineText?.runs?.[0]?.text ?? '';

          // Description
          let description = '';
          if (video.descriptionSnippet?.runs) {
            description = video.descriptionSnippet.runs
              .map((r: { text: string }) => r.text)
              .join('');
          }
          if (!description && video.detailedMetadataSnippets?.[0]?.snippetText?.runs) {
            description = video.detailedMetadataSnippets[0].snippetText.runs
              .map((r: { text: string }) => r.text)
              .join('');
          }

          items.push({
            videoId: video.videoId,
            title,
            channelName,
            thumbnail,
            description,
          });
        }
      }
    } catch {
      // partial results still useful
    }

    return items;
  }
}
