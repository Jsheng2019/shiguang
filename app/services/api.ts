import axios from 'axios';

export interface VideoSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p';
  format: 'hls' | 'dash' | 'mp4';
  headers?: Record<string, string>;
}

export interface SearchResult {
  title: string;
  year?: number;
  type: 'movie' | 'series' | 'documentary';
  country?: string;
  poster?: string;
  rating?: number;
  description?: string;
  sources: VideoSource[];
  sourceName: string;
  sourceUrl: string;
}

const DEFAULT_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' // Use relative path on production web
    : 'http://10.0.2.2:3000';

class ApiClient {
  private client;

  constructor(baseURL: string = DEFAULT_BASE_URL) {
    this.client = axios.create({ baseURL, timeout: 15000 });
  }

  async search(query: string): Promise<SearchResult[]> {
    const { data } = await this.client.get<{ results: SearchResult[] }>('/api/search', {
      params: { q: query },
    });
    return data.results;
  }

  async getDetail(url: string, spider: string): Promise<SearchResult | null> {
    const { data } = await this.client.get<{ result: SearchResult }>('/api/detail', {
      params: { url, spider },
    });
    return data.result ?? null;
  }
}

export const api = new ApiClient();
