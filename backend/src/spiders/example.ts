import type { SearchResult, Spider } from './base.js';

export class ExampleSpider implements Spider {
  name = 'example';

  async search(_query: string): Promise<SearchResult[]> {
    return [
      {
        title: 'The Public Domain Film',
        year: 1950,
        type: 'movie',
        poster: 'https://placehold.co/300x450?text=Example+Movie',
        sourceName: this.name,
        sourceUrl: 'https://example.com/movie/1',
        sources: [
          {
            url: 'https://example.com/videos/sample.mp4',
            quality: '720p',
            format: 'mp4',
          },
        ],
      },
      {
        title: 'Example Documentary Series',
        year: 2018,
        type: 'series',
        poster: 'https://placehold.co/300x450?text=Example+Series',
        sourceName: this.name,
        sourceUrl: 'https://example.com/series/2',
        sources: [
          {
            url: 'https://example.com/videos/sample2.mp4',
            quality: '1080p',
            format: 'mp4',
          },
        ],
      },
    ];
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const id = url.split('/').pop();
    if (!id) return null;

    return {
      title: `Example Detail for ${id}`,
      year: 2020,
      type: 'movie',
      poster: 'https://placehold.co/300x450?text=Detail',
      sourceName: this.name,
      sourceUrl: url,
      sources: [
        {
          url: 'https://example.com/videos/detail.mp4',
          quality: '1080p',
          format: 'mp4',
        },
        {
          url: 'https://example.com/videos/detail-hd.mp4',
          quality: '720p',
          format: 'mp4',
        },
      ],
    };
  }
}
