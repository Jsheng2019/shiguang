import type { SpiderRegistry } from '../spiders/registry.js';
import type { HomePageData, CarouselItem, SearchResult, VideoType } from '../spiders/base.js';
import { CATEGORIES } from './category-service.js';

/** Spiders that primarily return Chinese-language content */
const CHINESE_SPIDERS = new Set(['bilibili-free', 'bilibili-movies', 'm1905']);

/** Returns true if a title is mostly English characters (no CJK) */
function isEnglishTitle(title: string): boolean {
  // Check if the title contains any CJK characters
  const cjkRegex = /[一-鿿㐀-䶿豈-﫿]/;
  return !cjkRegex.test(title);
}

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

  /** Filter out English-only titles when there are enough Chinese alternatives */
  private filterEnglishIfChineseAvailable(results: SearchResult[]): SearchResult[] {
    const chineseItems = results.filter((r) => !isEnglishTitle(r.title));
    const englishItems = results.filter((r) => isEnglishTitle(r.title));
    // If we have at least 8 Chinese items, drop English-only ones
    if (chineseItems.length >= 8) {
      return chineseItems;
    }
    // Otherwise keep English items to fill gaps
    return results;
  }

  private async fetchBanners(): Promise<CarouselItem[]> {
    // Search Chinese-focused spiders first for banner content
    const queries = ['热门电影', '最新电影', '最新电视剧'];
    const results = await Promise.allSettled(
      queries.map((q) => this.registry.searchAll(q)),
    );

    const items: CarouselItem[] = [];
    const seen = new Set<string>();

    // Collect all valid results first
    const allResults: SearchResult[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const r of result.value) {
        if (this.isPlaceholder(r)) continue;
        const key = r.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        if (!isEnglishTitle(r.title)) {
          allResults.push(r);
        }
      }
    }

    // Prioritize Chinese spider results at the top
    const sorted = this.prioritiseChinese(allResults).slice(0, 8);

    for (const r of sorted) {
      items.push({
        title: r.title,
        description: r.description,
        poster: r.poster,
        sourceUrl: r.sourceUrl,
        type: r.type,
      });
    }

    return items;
  }

  private async fetchHotList(): Promise<SearchResult[]> {
    // All queries in Chinese for Chinese-content-first results
    const queries = ['热门电影', '最新电影', '最新电视剧', '热门综艺', '热门动漫', '热门纪录片'];
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

    // Filter out English-only titles if enough Chinese content exists
    const filtered = this.filterEnglishIfChineseAvailable(items);
    return this.prioritiseChinese(filtered).slice(0, 30);
  }

  private async fetchLatestByCategory(): Promise<
    { type: VideoType; items: SearchResult[] }[]
  > {
    const categoryQueries: { type: VideoType; query: string }[] = [
      { type: 'movie', query: '最新电影' },
      { type: 'tvseries', query: '最新电视剧' },
      { type: 'variety', query: '最新综艺' },
      { type: 'anime', query: '最新动漫' },
      { type: 'documentary', query: '最新纪录片' },
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

          // Filter out English-only titles if enough Chinese alternatives
          items = this.filterEnglishIfChineseAvailable(items);

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
