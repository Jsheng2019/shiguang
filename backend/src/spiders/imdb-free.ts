import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * IMDb free movie spider — searches IMDb's public movie catalog.
 * Parses HTML from the IMDb search results page using cheerio.
 * No official API key required. Falls back to empty results on any failure.
 */
export class ImdbFreeSpider implements Spider {
  name = 'imdb-free';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get('https://www.imdb.com/search/title/', {
        params: { title: query, title_type: 'feature', sort: 'moviemeter,asc' },
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 8000,
      });

      const $ = cheerio.load(resp.data);
      const results: SearchResult[] = [];

      $('.lister-item').each((_, el) => {
        const $item = $(el);
        const titleEl = $item.find('.lister-item-header a');
        const title = titleEl.text().trim();
        if (!title) return;

        const yearText = $item.find('.lister-item-year').text().trim();
        const year = yearText ? Number(yearText.replace(/[^\d]/g, '')) || undefined : undefined;

        const poster =
          $item.find('.lister-item-image img').attr('loadlate') ??
          $item.find('.lister-item-image img').attr('src') ??
          undefined;

        const ratingText = $item.find('.ratings-imdb-rating strong').text();
        const rating = ratingText ? Number(ratingText) : undefined;

        const description = $item.find('.lister-item-summary').text().trim();

        const link = titleEl.attr('href') ?? '';
        const sourceUrl = link.startsWith('http') ? link : `https://www.imdb.com${link}`;

        results.push({
          title,
          year,
          type: 'movie',
          poster,
          rating,
          description: description || undefined,
          sourceName: this.name,
          sourceUrl,
          sources: [{ url: sourceUrl, quality: '720p', format: 'mp4' }],
        });
      });

      return results;
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/title\/(tt\d+)/);
    if (!match) return null;

    return {
      title: `IMDb ${match[1]}`,
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }
}
