import type { SpiderRegistry } from '../spiders/registry.js';
import type { HomePageData, CarouselItem, SearchResult, VideoType } from '../spiders/base.js';
import { CATEGORIES } from './category-service.js';

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

  private async fetchBanners(): Promise<CarouselItem[]> {
    // Search across all spiders for popular content to use as banners
    const queries = ['热门电影', '最新电视剧', 'popular movie'];
    const results = await Promise.allSettled(
      queries.map((q) => this.registry.searchAll(q)),
    );

    const items: CarouselItem[] = [];
    const seen = new Set<string>();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const r of result.value) {
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
    const queries = ['热门电影', 'hot movie', 'popular film', 'trending'];
    const results = await Promise.allSettled(
      queries.map((q) => this.registry.searchAll(q)),
    );

    const seen = new Set<string>();
    const items: SearchResult[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const r of result.value) {
        const key = r.title.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(r);
      }
    }

    // Sort by rating descending, then by title
    items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return items.slice(0, 30);
  }

  private async fetchLatestByCategory(): Promise<
    { type: VideoType; items: SearchResult[] }[]
  > {
    const categoryQueries: { type: VideoType; query: string }[] = [
      { type: 'movie', query: '最新电影 new movie' },
      { type: 'tvseries', query: '最新电视剧 new tv series' },
      { type: 'variety', query: '综艺 variety show' },
      { type: 'anime', query: '动漫 anime' },
      { type: 'documentary', query: '纪录片 documentary' },
      { type: 'shortdrama', query: '短剧 short drama' },
      { type: 'sports', query: '体育 sports' },
      { type: 'education', query: '教育 education' },
    ];

    const settled = await Promise.allSettled(
      categoryQueries.map((cq) =>
        this.registry.searchAll(cq.query).then((results) => ({
          type: cq.type,
          items: results.filter((r) => r.type === cq.type).slice(0, 12),
        })),
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
