import type { SearchResult, Spider } from './base.js';
import { ExampleSpider } from './example.js';
import { InternetArchiveSpider } from './free-kukan.js';

export class SpiderRegistry {
  private spiders: Map<string, Spider> = new Map();

  constructor() {
    this.register(new ExampleSpider());
    this.register(new InternetArchiveSpider());
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
}
