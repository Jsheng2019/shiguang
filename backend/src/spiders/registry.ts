import type { SearchResult, Spider, FilterOptions, BrowseResponse, VideoType } from './base.js';
import { ExampleSpider } from './example.js';
import { InternetArchiveSpider } from './free-kukan.js';
import { VimeoFreeSpider } from './vimeo-free.js';
import { YouTubeSpider } from './youtube.js';
import { PublicDomainTorrentsSpider } from './pdt.js';
import { BilibiliFreeSpider } from './bilibili-free.js';
import { BilibiliMoviesSpider } from './bilibili-movies.js';
import { DailymotionSpider } from './dailymotion.js';
import { PixabaySpider } from './pixabay.js';
import { MixkitSpider } from './mixkit.js';
import { LibvioSpider } from './libvio.js';
import { IYFSpider } from './iyf.js';
import { M1905Spider } from './m1905.js';
import { CzzySpider } from './czzy.js';

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
    this.register(new ExampleSpider());
    this.register(new InternetArchiveSpider());
    this.register(new VimeoFreeSpider());
    this.register(new YouTubeSpider());
    this.register(new PublicDomainTorrentsSpider());
    this.register(new BilibiliFreeSpider());
    this.register(new DailymotionSpider());
    this.register(new PixabaySpider());
    this.register(new MixkitSpider());
    this.register(new LibvioSpider());
    this.register(new IYFSpider());
    this.register(new M1905Spider());
    this.register(new CzzySpider());
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
    const results = await Promise.allSettled(
      this.getAll().map((spider) => spider.search(query)),
    );

    const items: SearchResult[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      }
      // Silently skip failed spiders so one failure doesn't break everything
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
  movie: 'movie film',
  tvseries: 'tv series episode',
  variety: 'variety show',
  anime: 'anime',
  documentary: 'documentary',
  shortdrama: 'short drama',
  sports: 'sports',
  education: 'education',
};

function typeToQuery(type?: VideoType): string {
  return type ? typeQueryMap[type] ?? type : 'movie film tv show';
}
