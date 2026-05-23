// Spider interface — every video source implements this
export interface VideoSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p';
  format: 'hls' | 'dash' | 'mp4' | 'embed';
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
  sourceName: string;     // which spider found this
  sourceUrl: string;      // original page URL
}

export interface Spider {
  name: string;
  /** Search for videos on this source */
  search(query: string): Promise<SearchResult[]>;
  /** Get detail page + video sources for a specific item */
  getDetail(url: string): Promise<SearchResult | null>;
}
