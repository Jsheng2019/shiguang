import axios from 'axios';
import type { SearchResult, Spider } from './base.js';

const PIXABAY_BASE = 'https://pixabay.com/api/videos';
const PIXABAY_TIMEOUT = 8000;

function getApiKey(): string | null {
  const key = process.env['PIXABAY_API_KEY'] ?? '';
  return key.length > 0 ? key : null;
}

interface PixabayVideoFile {
  url: string;
  quality: string;
  file_size: number;
  width: number;
  height: number;
}

interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  picture_id: string;
  videos: {
    large?: PixabayVideoFile;
    medium?: PixabayVideoFile;
    small?: PixabayVideoFile;
    tiny?: PixabayVideoFile;
  };
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user: string;
  userImageURL: string;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

/**
 * Pixabay free video spider — searches stock videos from Pixabay.
 * Requires PIXABAY_API_KEY environment variable.
 * Generous free tier (API key from https://pixabay.com/api/docs/).
 */
export class PixabaySpider implements Spider {
  name = 'pixabay';

  async search(query: string): Promise<SearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    try {
      const resp = await axios.get(PIXABAY_BASE, {
        params: { key: apiKey, q: query, per_page: 20 },
        timeout: PIXABAY_TIMEOUT,
      });

      const data = resp.data as PixabayResponse;
      if (!data?.hits) return [];

      return data.hits.map((v) => {
        // Pick best quality video file available
        const bestFile =
          v.videos?.large ?? v.videos?.medium ?? v.videos?.small ?? v.videos?.tiny;

        const quality: SearchResult['sources'][number]['quality'] =
          bestFile?.height && bestFile.height >= 720
            ? '720p'
            : bestFile?.height && bestFile.height >= 480
              ? '480p'
              : '360p';

        return {
          title: v.tags || `Pixabay Video ${v.id}`,
          type: 'movie' as const,
          poster: `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg`,
          rating: v.likes > 0 ? Math.min(10, Math.round(v.likes / 100) + 5) : undefined,
          description: `by ${v.user} | ${v.views.toLocaleString()} views`,
          sourceName: this.name,
          sourceUrl: v.pageURL,
          sources: [
            {
              url: bestFile?.url ?? v.pageURL,
              quality,
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
    return {
      title: 'Pixabay Video',
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }
}
