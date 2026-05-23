import type { SearchResult, Spider, FilterOptions, BrowseResponse, VideoType } from './base.js';
import { InternetArchiveSpider } from './free-kukan.js';
import { VimeoFreeSpider } from './vimeo-free.js';
import { BilibiliFreeSpider } from './bilibili-free.js';
import { BilibiliMoviesSpider } from './bilibili-movies.js';
import { DailymotionSpider } from './dailymotion.js';
import { M1905Spider } from './m1905.js';

export class SpiderRegistry {
  private spiders: Map<string, Spider> = new Map();
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pendingRequests.get(key);
    if (existing) return existing as Promise<T>;
    const promise = fn().finally(() => this.pendingRequests.delete(key));
    this.pendingRequests.set(key, promise);
    return promise;
  }

  constructor() {
    // Note: example spider intentionally excluded — produces placeholder data
    // (placehold.co images, example.com URLs). See Bug 2 in PM findings.
    //
    // Broken spiders removed (unreachable from Render/Singapore):
    //   - libvio: search endpoint returns 404
    //   - iyf: client-side rendered SPA, can't scrape with HTTP
    //   - czzy: Cloudflare/429 blocks all requests
    //
    // Removed spiders (poor Chinese-content experience):
    //   - youtube: videos can't play in-app, require external browser
    //   - pdt: mostly old English public domain films
    //   - pixabay: stock footage, not movies
    //   - mixkit: stock footage, not movies
    this.register(new InternetArchiveSpider());
    this.register(new VimeoFreeSpider());
    this.register(new BilibiliFreeSpider());
    this.register(new DailymotionSpider());
    this.register(new M1905Spider());
    this.register(new BilibiliMoviesSpider());
  }

  register(spider: Spider): void {
    this.spiders.set(spider.name, spider);
  }

  getSpider(name: string): Spider | undefined {
    return this.spiders.get(name);
  }

  getAll(): Spider[] {
    return Array.from(this.spiders.values());
  }

  async searchAll(query: string): Promise<SearchResult[]> {
    const TIMEOUT_MS = 8000;
    const results = await Promise.allSettled(
      this.getAll().map((spider) =>
        Promise.race([
          spider.search(query),
          new Promise<SearchResult[]>((_, reject) =>
            setTimeout(() => reject(new Error(`timeout: ${spider.name}`)), TIMEOUT_MS),
          ),
        ]),
      ),
    );

    const items: SearchResult[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      }
      // Silently skip timed-out or failed spiders
    }

    return items;
  }

  async searchWithFilters(filters: FilterOptions): Promise<BrowseResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const query = typeToQuery(filters.type);

    // Search across all spiders with the generated query
    let results = await this.searchAll(query);

    // Apply post-search filters
    if (filters.type) {
      results = results.filter((r) => r.type === filters.type);
    }
    if (filters.year) {
      results = results.filter((r) => r.year === filters.year);
    }
    if (filters.decade) {
      results = results.filter(
        (r) => r.year != null && Math.floor(r.year / 10) * 10 === filters.decade,
      );
    }

    // Sort
    if (filters.sort === 'rating') {
      results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (filters.sort === 'latest') {
      results.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    }
    // 'hot' sort: keep default order (search relevance)

    // Deduplicate by title
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key = r.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const total = deduped.length;
    const start = (page - 1) * pageSize;
    const items = deduped.slice(start, start + pageSize);

    return { items, total, page, pageSize, hasMore: start + pageSize < total };
  }
}

const typeQueryMap: Record<VideoType, string> = {
  movie: '电影',
  tvseries: '电视剧',
  variety: '综艺',
  anime: '动漫',
  documentary: '纪录片',
  shortdrama: '短剧',
  sports: '体育',
  education: '教育',
};

function typeToQuery(type?: VideoType): string {
  return type ? typeQueryMap[type] ?? type : '电影 电视剧 综艺';
}
