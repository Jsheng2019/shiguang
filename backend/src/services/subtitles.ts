import axios from 'axios';

const SUBTITLES_BASE = 'https://api.opensubtitles.com/api/v1';
const SUBTITLES_TIMEOUT = 8000;

export interface SubtitleInfo {
  url: string;
  language: string;
  rating: number;
}

interface OpenSubtitlesResult {
  id: string;
  type: string;
  attributes: {
    subtitle_id: number;
    language: string;
    download_count: number;
    votes: number;
    ratings: number;
    files: Array<{ file_id: number; file_name: string }>;
    url: string;
    feature_details: {
      title: string;
      year: number;
    };
  };
}

function getApiKey(): string | null {
  const key = process.env['OPENSUBTITLES_API_KEY'] ?? '';
  return key.length > 0 ? key : null;
}

export class SubtitlesService {
  private apiKey: string | null;

  constructor() {
    this.apiKey = getApiKey();
  }

  get enabled(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Search for subtitles by movie title.
   * Returns empty array when disabled, no results, or on error.
   */
  async searchSubtitles(
    title: string,
    year?: number,
    language?: string,
  ): Promise<SubtitleInfo[]> {
    if (!this.apiKey) return [];

    try {
      const params: Record<string, string | number> = {
        query: title,
      };
      if (year) params['year'] = year;
      if (language) params['languages'] = language;

      const resp = await axios.get(`${SUBTITLES_BASE}/subtitles`, {
        params,
        headers: {
          'Api-Key': this.apiKey,
          'User-Agent': 'VideoApp v0.1',
          'Content-Type': 'application/json',
        },
        timeout: SUBTITLES_TIMEOUT,
      });

      const data = resp.data as {
        total_count?: number;
        data?: OpenSubtitlesResult[];
      };

      if (!data?.data) return [];

      return data.data.map((item) => ({
        url: `https://www.opensubtitles.com/en/subtitles/${item.attributes.subtitle_id}`,
        language: item.attributes.language,
        rating: item.attributes.ratings ?? 0,
      }));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        console.warn('[subtitles] rate limited');
      }
      return [];
    }
  }
}
