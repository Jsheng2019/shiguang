import axios from 'axios';
import type { SearchResult, Spider } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface OpenverseVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  creator: string | null;
  license: string;
  duration: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Openverse (WordPress CC search engine) video spider.
 * Uses the public API at api.openverse.org — no API key required.
 * Returns Creative Commons licensed videos.
 */
export class OpenverseSpider implements Spider {
  name = 'openverse';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get('https://api.openverse.org/v1/videos/', {
        params: { q: query, page_size: 20 },
        headers: { 'User-Agent': UA },
        timeout: 8000,
      });

      const results = (resp.data?.results ?? []) as OpenverseVideo[];

      return results.map((v) => ({
        title: v.title || 'Untitled',
        type: 'movie' as const,
        poster: v.thumbnail ?? undefined,
        description: `License: ${v.license}${v.creator ? ` by ${v.creator}` : ''}`,
        sourceName: this.name,
        sourceUrl: v.url,
        sources: [
          {
            url: v.url,
            quality: v.height && v.height >= 720 ? ('720p' as const) : ('480p' as const),
            format: 'mp4' as const,
          },
        ],
      }));
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    // Openverse search results already contain direct video URLs
    return {
      title: 'Openverse Video',
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }
}
