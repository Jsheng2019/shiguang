// Video types supported by the platform
export type VideoType =
  | 'movie'       // 电影
  | 'tvseries'    // 电视剧
  | 'variety'     // 综艺
  | 'anime'       // 动漫
  | 'documentary' // 纪录片
  | 'shortdrama'  // 短剧
  | 'sports'      // 体育
  | 'education';  // 知识/教育

export interface VideoSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p';
  format: 'hls' | 'dash' | 'mp4' | 'embed';
  headers?: Record<string, string>;
}

export interface Episode {
  title: string;    // e.g. "第1集"
  url: string;      // play URL
  sourceName?: string;
}

export interface SearchResult {
  title: string;
  year?: number;
  type: VideoType;
  country?: string;
  poster?: string;
  rating?: number;
  description?: string;
  sources: VideoSource[];
  sourceName: string;     // which spider found this
  sourceUrl: string;      // original page URL
  director?: string;
  actors?: string[];
  region?: string;
  language?: string;
  duration?: string;      // e.g. "120分钟"
  episodes?: Episode[];   // for series
  related?: SearchResult[]; // recommendations
}

export interface FilterOptions {
  type?: VideoType;
  region?: 'mainland' | 'hongkong_taiwan' | 'japan_korea' | 'west' | 'other';
  year?: number;
  decade?: number;
  sort?: 'latest' | 'hot' | 'rating';
  page?: number;
  pageSize?: number;
}

export interface CarouselItem {
  title: string;
  description?: string;
  poster?: string;
  sourceUrl: string;
  type: VideoType;
}

export interface CategorySection {
  type: VideoType;
  label: string;
  icon: string;
}

export interface HomePageData {
  banners: CarouselItem[];
  categories: CategorySection[];
  hotList: SearchResult[];
  latestByCategory: {
    type: VideoType;
    items: SearchResult[];
  }[];
}

export interface BrowseResponse {
  items: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Spider {
  name: string;
  /** Search for videos on this source */
  search(query: string): Promise<SearchResult[]>;
  /** Get detail page + video sources for a specific item */
  getDetail(url: string): Promise<SearchResult | null>;
}
