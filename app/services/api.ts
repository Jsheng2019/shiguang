import axios from 'axios';

export interface VideoSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p';
  format: 'hls' | 'dash' | 'mp4' | 'embed';
  headers?: Record<string, string>;
}

export interface Episode {
  title: string;
  url: string;
  sourceName?: string;
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
  director?: string;
  actors?: string[];
  region?: string;
  language?: string;
  duration?: string;
  episodes?: Episode[];
  related?: SearchResult[];
}

export type VideoType =
  | 'movie' | 'tvseries' | 'variety' | 'anime'
  | 'documentary' | 'shortdrama' | 'sports' | 'education';

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
  latestByCategory: { type: VideoType; items: SearchResult[] }[];
}

export interface BrowseResponse {
  items: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DEFAULT_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' // Use relative path on production web
    : 'http://localhost:3000';

// Production backend URL — set to Render deployment or your own server.
// Leave empty to use the same origin (for reverse-proxy setups).
const BACKEND_URL =
  typeof window !== 'undefined' && window.location.hostname.includes('github.io')
    ? 'https://shiguang-backend.onrender.com'
    : '';

const demoData: SearchResult[] = [
  {
    title: '大闹天宫',
    year: 1961,
    type: 'movie',
    country: '中国',
    rating: 9.3,
    description: '上海美术电影制片厂的经典动画长片，中国动画史上的里程碑之作。讲述了孙悟空大闹龙宫、地府和天宫的故事。',
    poster: 'https://img3.doubanio.com/view/photo/l/public/p2885731293.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/danao-tiangong',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
  {
    title: '哪吒闹海',
    year: 1979,
    type: 'movie',
    country: '中国',
    rating: 9.1,
    description: '中国第一部宽银幕动画长片，改编自中国神话故事。哪吒为救百姓，大闹东海龙宫。',
    poster: 'https://img1.doubanio.com/view/photo/l/public/p2885727480.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/nezha',
    sources: [{ url: 'https://example.com/play', quality: '1080p', format: 'mp4' }],
  },
  {
    title: '天空之城',
    year: 1986,
    type: 'movie',
    country: '日本',
    rating: 9.2,
    description: '宫崎骏经典作品。少女希达从天而降，少年巴鲁接住了她，两人一起寻找传说中漂浮在空中的拉普达。',
    poster: 'https://img2.doubanio.com/view/photo/l/public/p2885719082.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/laputa',
    sources: [{ url: 'https://example.com/play', quality: '1080p', format: 'mp4' }],
  },
  {
    title: '千与千寻',
    year: 2001,
    type: 'movie',
    country: '日本',
    rating: 9.4,
    description: '宫崎骏代表作，奥斯卡最佳动画长片。少女千寻误入神灵世界，为了救回父母而展开冒险。',
    poster: 'https://img1.doubanio.com/view/photo/l/public/p2885710978.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/spirited-away',
    sources: [{ url: 'https://example.com/play', quality: '1080p', format: 'mp4' }],
  },
  {
    title: '茶馆',
    year: 1982,
    type: 'movie',
    country: '中国',
    rating: 9.0,
    description: '老舍经典话剧改编。以老北京裕泰茶馆为舞台，展现了从清末到抗战胜利半个世纪的社会变迁。',
    poster: 'https://img9.doubanio.com/view/photo/l/public/p2885711809.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/teahouse',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
  {
    title: '霸王别姬',
    year: 1993,
    type: 'movie',
    country: '中国',
    rating: 9.6,
    description: '陈凯歌导演，张国荣、巩俐主演。京剧伶人程蝶衣和段小楼半个世纪的悲欢离合，华语电影巅峰之作。',
    poster: 'https://img2.doubanio.com/view/photo/l/public/p2885729162.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/farewell',
    sources: [{ url: 'https://example.com/play', quality: '1080p', format: 'mp4' }],
  },
  {
    title: '蓝色星球',
    year: 2001,
    type: 'documentary',
    country: '英国',
    rating: 9.7,
    description: 'BBC自然历史纪录片巨作，探索全球海洋生态，拍摄历时五年，足迹遍布全球两百多个海域。',
    poster: 'https://img9.doubanio.com/view/photo/l/public/p2885711793.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/blue-planet',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
  {
    title: '西游记',
    year: 1986,
    type: 'series',
    country: '中国',
    rating: 9.6,
    description: '杨洁导演的经典电视剧，改编自吴承恩同名小说。唐僧师徒四人西天取经，历经九九八十一难。',
    poster: 'https://img1.doubanio.com/view/photo/l/public/p2885720060.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/xiyouji',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
  {
    title: '红楼梦',
    year: 1987,
    type: 'series',
    country: '中国',
    rating: 9.7,
    description: '王扶林导演的经典电视剧，改编自曹雪芹同名小说。以贾宝玉、林黛玉、薛宝钗的爱情悲剧为主线。',
    poster: 'https://img2.doubanio.com/view/photo/l/public/p2885711397.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/hongloumeng',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
  {
    title: '地球脉动',
    year: 2006,
    type: 'documentary',
    country: '英国',
    rating: 9.7,
    description: 'BBC王牌自然纪录片，用高清镜头记录从南极到北极、从沙漠到雨林的地球自然奇观。',
    poster: 'https://img1.doubanio.com/view/photo/l/public/p2885710332.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/planet-earth',
    sources: [{ url: 'https://example.com/play', quality: '1080p', format: 'mp4' }],
  },
  {
    title: '三国演义',
    year: 1994,
    type: 'series',
    country: '中国',
    rating: 9.5,
    description: '王扶林导演的史诗级电视剧。东汉末年群雄逐鹿，魏蜀吴三国鼎立，智谋与武勇的较量。',
    poster: 'https://img3.doubanio.com/view/photo/l/public/p2885711737.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/sanguo',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
  {
    title: '水浒传',
    year: 1998,
    type: 'series',
    country: '中国',
    rating: 8.9,
    description: '张绍林导演。一百零八位好汉齐聚梁山泊，替天行道，谱写一曲忠义悲歌。',
    poster: 'https://img9.doubanio.com/view/photo/l/public/p2885711811.webp',
    sourceName: 'demo',
    sourceUrl: 'https://example.com/shuihu',
    sources: [{ url: 'https://example.com/play', quality: '720p', format: 'mp4' }],
  },
];

const demoBackend = {
  search(query: string): SearchResult[] {
    const q = query.toLowerCase();
    return demoData.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.country?.toLowerCase().includes(q),
    );
  },
  getDetail(url: string): SearchResult | null {
    return demoData.find((r) => r.sourceUrl === url) ?? null;
  },
};

class ApiClient {
  private client;
  private demoMode = true;
  private baseURL: string;

  constructor(baseURL: string = DEFAULT_BASE_URL) {
    this.baseURL = BACKEND_URL || baseURL;
    this.client = axios.create({ baseURL: this.baseURL, timeout: 15000 });
  }

  async search(query: string, page = 1, pageSize = 20): Promise<{ results: SearchResult[]; total: number }> {
    try {
      const { data } = await this.client.get<{ results: SearchResult[]; total: number }>('/api/search', {
        params: { q: query, page, pageSize },
      });
      this.demoMode = false;
      return data;
    } catch {
      const results = demoBackend.search(query);
      const start = (page - 1) * pageSize;
      return { results: results.slice(start, start + pageSize), total: results.length };
    }
  }

  async getDetail(url: string, spider: string): Promise<SearchResult | null> {
    if (this.demoMode) {
      return demoBackend.getDetail(url);
    }
    try {
      const { data } = await this.client.get<{ result: SearchResult }>('/api/detail', {
        params: { url, spider },
      });
      return data.result ?? null;
    } catch {
      return demoBackend.getDetail(url);
    }
  }

  async getRecommendations(url: string, spider: string): Promise<SearchResult[]> {
    if (this.demoMode) return [];
    try {
      const { data } = await this.client.get<{ recommendations: SearchResult[] }>('/api/recommendations', {
        params: { url, spider },
      });
      return data.recommendations ?? [];
    } catch {
      return [];
    }
  }

  async getHome(): Promise<HomePageData> {
    try {
      const { data } = await this.client.get<HomePageData>('/api/home');
      this.demoMode = false;
      return data;
    } catch {
      return {
        banners: demoData.slice(0, 4).map((item) => ({
          title: item.title,
          description: item.description,
          poster: item.poster,
          sourceUrl: item.sourceUrl,
          type: item.type as VideoType,
        })),
        categories: [
          { type: 'movie', label: '电影', icon: '🎬' },
          { type: 'tvseries', label: '电视剧', icon: '📺' },
          { type: 'variety', label: '综艺', icon: '🎭' },
          { type: 'anime', label: '动漫', icon: '🎨' },
          { type: 'documentary', label: '纪录片', icon: '🌍' },
          { type: 'shortdrama', label: '短剧', icon: '🎪' },
        ],
        hotList: demoData.slice(0, 6),
        latestByCategory: [
          { type: 'movie', items: demoData.filter((d) => d.type === 'movie').slice(0, 4) },
          { type: 'tvseries', items: demoData.filter((d) => d.type === 'series').slice(0, 4) },
        ],
      };
    }
  }

  async browse(opts: FilterOptions): Promise<BrowseResponse> {
    try {
      const { data } = await this.client.get<BrowseResponse>('/api/browse', { params: opts });
      this.demoMode = false;
      return data;
    } catch {
      const page = opts.page ?? 1;
      const pageSize = opts.pageSize ?? 20;
      const filtered = demoData.filter((d) => {
        if (opts.type === 'tvseries') return d.type === 'series';
        if (opts.type === 'movie') return d.type === 'movie';
        if (opts.type === 'documentary') return d.type === 'documentary';
        return true;
      });
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return {
        items,
        total: filtered.length,
        page,
        pageSize,
        hasMore: start + pageSize < filtered.length,
      };
    }
  }

  async getHot(): Promise<SearchResult[]> {
    try {
      const { data } = await this.client.get<SearchResult[]>('/api/hot');
      this.demoMode = false;
      return data;
    } catch {
      return demoData.slice(0, 10);
    }
  }

  async getLatest(): Promise<{ type: VideoType; items: SearchResult[] }[]> {
    try {
      const { data } = await this.client.get<{ type: VideoType; items: SearchResult[] }[]>('/api/latest');
      this.demoMode = false;
      return data;
    } catch {
      return [
        { type: 'movie', items: demoData.filter((d) => d.type === 'movie').slice(0, 4) },
        { type: 'tvseries', items: demoData.filter((d) => d.type === 'series').slice(0, 4) },
        { type: 'documentary', items: demoData.filter((d) => d.type === 'documentary').slice(0, 4) },
      ];
    }
  }

  async getCategories(): Promise<CategorySection[]> {
    try {
      const { data } = await this.client.get<CategorySection[]>('/api/categories');
      this.demoMode = false;
      return data;
    } catch {
      return [
        { type: 'movie', label: '电影', icon: '🎬' },
        { type: 'tvseries', label: '电视剧', icon: '📺' },
        { type: 'variety', label: '综艺', icon: '🎭' },
        { type: 'anime', label: '动漫', icon: '🎨' },
        { type: 'documentary', label: '纪录片', icon: '🌍' },
        { type: 'shortdrama', label: '短剧', icon: '🎪' },
        { type: 'sports', label: '体育', icon: '⚽' },
        { type: 'education', label: '知识', icon: '📚' },
      ];
    }
  }
}

export const api = new ApiClient();
