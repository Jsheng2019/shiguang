import axios from 'axios';
import type { SearchResult, Spider } from './base.js';

const PEXELS_BASE = 'https://api.pexels.com/videos';
const PEXELS_TIMEOUT = 8000;

function getApiKey(): string | null {
  const key = process.env['PEXELS_API_KEY'] ?? '';
  return key.length > 0 ? key : null;
}

interface PexelsVideoFile {
  link: string;
  quality: string;
  file_type: string;
  width: number;
  height: number;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  video_files: PexelsVideoFile[];
  user: { name: string };
}

interface PexelsResponse {
  videos: PexelsVideo[];
  total_results: number;
}

/**
 * Pexels free video spider — searches high-quality stock videos from Pexels.
 * Requires PEXELS_API_KEY environment variable.
 * Free tier: 200 requests/hour.
 */
export class PexelsSpider implements Spider {
  name = 'pexels';

  async search(query: string): Promise<SearchResult[]> {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    try {
      const resp = await axios.get(`${PEXELS_BASE}/search`, {
        params: { query, per_page: 15 },
        headers: { Authorization: apiKey },
        timeout: PEXELS_TIMEOUT,
      });

      const data = resp.data as PexelsResponse;
      if (!data?.videos) return [];

      return data.videos.map((v) => {
        // Pick the best quality MP4 file
        const bestFile =
          v.video_files?.find(
            (f) => f.file_type === 'video/mp4' && f.quality === 'hd',
          ) ??
          v.video_files?.find((f) => f.file_type === 'video/mp4') ??
          v.video_files?.[0];

        const quality: SearchResult['sources'][number]['quality'] =
          v.height >= 720 ? '720p' : v.height >= 480 ? '480p' : '360p';

        return {
          title: `Pexels Video ${v.id}`,
          type: 'movie' as const,
          poster: v.image || undefined,
          description: `by ${v.user?.name ?? 'unknown'}`,
          sourceName: this.name,
          sourceUrl: v.url,
          sources: [
            {
              url: bestFile?.link ?? v.url,
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
      title: 'Pexels Video',
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }
}
