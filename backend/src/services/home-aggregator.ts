import type { SpiderRegistry } from '../spiders/registry.js';
import type { HomePageData, CarouselItem, SearchResult, VideoType } from '../spiders/base.js';
import { CATEGORIES } from './category-service.js';

/** Spiders that primarily return Chinese-language content */
const CHINESE_SPIDERS = new Set(['bilibili-free', 'bilibili-movies', 'm1905']);

export class HomeAggregator {
  constructor(private registry: SpiderRegistry) {}

  async getHomeData(): Promise<HomePageData> {
    const [banners, hotList, latestByCategory] = await Promise.all([
      this.fetchBanners(),
      this.fetchHotList(),
      this.fetchLatestByCategory(),
    ]);

    return {
      banners,
      categories: CATEGORIES,
      hotList,
      latestByCategory,
    };
  }

  /** Returns true if a result contains placeholder/demo content */
  private isPlaceholder(r: { title: string; sourceUrl: string; poster?: string; sourceName?: string }): boolean {
    return (
      (r.sourceName === 'example') ||
      r.sourceUrl.includes('example.com') ||
      r.sourceUrl.includes('placehold.co') ||
      (r.poster?.includes('example.com') ?? false) ||
      (r.poster?.includes('placehold.co') ?? false) ||
      r.title.toLowerCase().includes('demo') ||
      r.title.toLowerCase() === 'the public domain film'
    );
  }

  /** Sort: Chinese spider results first, then by rating */
  private prioritiseChinese(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => {
      const aCN = CHINESE_SPIDERS.has(a.sourceName) ? 1 : 0;
      const bCN = CHINESE_SPIDERS.has(b.sourceName) ? 1 : 0;
      if (aCN !== bCN) return bCN - aCN;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }

  private async fetchBanners(): Promise<CarouselItem[]> {
    // Search across all spiders for popular Chinese content to use as banners
    const queries = ['热门电影', '最新电影', '最新电视剧'];
    const results = await Promise.allSettled(
      queries.map((q) => this.registry.searchAll(q)),
    );

    const items: CarouselItem[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const r of result.value) {
        if (this.isPlaceholder(r)) continue;
        const key = r.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          title: r.title,
          description: r.description,
          poster: r.poster,
          sourceUrl: r.sourceUrl,
          type: r.type,
        });
        if (items.length >= 8) break;
      }
      if (items.length >= 8) break;
    }

    return items.slice(0, 8);
  }

  private async fetchHotList(): Promise<SearchResult[]> {
    const queries = ['热门电影', '最新电影', '最新电视剧', '综艺', '动漫', 'hot movie'];
    const results = await Promise.allSettled(
      queries.map((q) => this.registry.searchAll(q)),
    );

    const seen = new Set<string>();
    const items: SearchResult[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const r of result.value) {
        if (this.isPlaceholder(r)) continue;
        const key = r.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(r);
      }
    }

    // Sort: Chinese sources first, then by rating
    return this.prioritiseChinese(items).slice(0, 30);
  }

  private async fetchLatestByCategory(): Promise<
    { type: VideoType; items: SearchResult[] }[]
  > {
    const categoryQueries: { type: VideoType; query: string }[] = [
      { type: 'movie', query: '最新电影' },
      { type: 'tvseries', query: '最新电视剧' },
      { type: 'variety', query: '综艺' },
      { type: 'anime', query: '动漫' },
      { type: 'documentary', query: '纪录片' },
      { type: 'shortdrama', query: '短剧' },
      { type: 'sports', query: '体育' },
      { type: 'education', query: '教育' },
    ];

    const settled = await Promise.allSettled(
      categoryQueries.map((cq) =>
        this.registry.searchAll(cq.query).then((results) => {
          let items = results.filter((r) => !this.isPlaceholder(r));

          // Try exact type match first (for movie/tvseries/documentary where
          // spiders assign those types). For other categories (variety, anime,
          // shortdrama, sports, education) no spider returns those types, so
          // fall back to all results — the search query already targets the
          // right content (e.g. "综艺" for variety, "动漫" for anime).
          const typeMatched = items.filter((r) => r.type === cq.type);
          if (typeMatched.length > 0) {
            items = typeMatched;
          }

          return { type: cq.type, items: items.slice(0, 12) };
        }),
      ),
    );

    const result: { type: VideoType; items: SearchResult[] }[] = [];
    for (const entry of settled) {
      if (entry.status === 'fulfilled') {
        result.push(entry.value);
      }
    }

    return result;
  }
}
