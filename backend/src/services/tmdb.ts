import axios from 'axios';
import type { SearchResult } from '../spiders/base.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT = 5000;

function getApiKey(): string | null {
  const key = process.env['TMDB_API_KEY'] ?? '';
  return key.length > 0 ? key : null;
}

interface TmdbMovie {
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
}

export class TmdbService {
  private apiKey: string | null;

  constructor() {
    this.apiKey = getApiKey();
  }

  get enabled(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Enrich an array of search results with TMDB metadata (poster, rating, description).
   * When TMDB is disabled or an error occurs, returns original results unchanged.
   */
  async enrichSearchResults(results: SearchResult[]): Promise<SearchResult[]> {
    if (!this.apiKey) return results;
    const enriched = await Promise.allSettled(
      results.map((r) => this.enrichDetail(r)),
    );
    return enriched.map((r, i) => (r.status === 'fulfilled' ? r.value : results[i]));
  }

  /**
   * Enrich a single search result with TMDB metadata.
   */
  async enrichDetail(result: SearchResult): Promise<SearchResult> {
    if (!this.apiKey) return result;

    try {
      const tmdb = await this.searchMovie(result.title, result.year);
      if (!tmdb) return result;

      return {
        ...result,
        poster: tmdb.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
          : result.poster,
        year: tmdb.release_date
          ? new Date(tmdb.release_date).getFullYear()
          : result.year,
        rating: tmdb.vote_average > 0 ? tmdb.vote_average : result.rating,
        description: tmdb.overview || result.description,
      };
    } catch {
      return result;
    }
  }

  private async searchMovie(title: string, year?: number): Promise<TmdbMovie | null> {
    if (!this.apiKey) return null;

    try {
      const resp = await axios.get(`${TMDB_BASE}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query: title,
          ...(year ? { year } : {}),
          language: 'zh-CN',
        },
        timeout: TMDB_TIMEOUT,
      });

      const results = resp.data?.results as TmdbMovie[] | undefined;
      if (!results || results.length === 0) return null;

      return results[0];
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        console.warn('[tmdb] rate limited, skipping');
      }
      return null;
    }
  }
}
