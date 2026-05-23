import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Mixkit free stock video spider — searches Mixkit's library of free HD stock videos.
 * Scrapes HTML from the search results page, no API key required.
 */
export class MixkitSpider implements Spider {
  name = 'mixkit';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get('https://mixkit.co/free-stock-video/', {
        params: { q: query },
        headers: { 'User-Agent': UA },
        timeout: 8000,
      });

      const $ = cheerio.load(resp.data);
      const results: SearchResult[] = [];

      $('.item-grid-card').each((_, el) => {
        const $card = $(el);

        const title =
          $card.find('.item-grid-video-player__overlay-video-title').text().trim() ||
          $card.find('.item-grid-video-player__overlay-link').text().trim() ||
          $card.find('img').attr('alt')?.trim() ||
          '';

        if (!title) return;

        const poster =
          $card.find('.item-grid-video-player__thumb').attr('src') ?? undefined;

        const videoSrc = $card.find('video').attr('src') ?? undefined;

        const link = $card.find('.item-grid-video-player__overlay-link').attr('href') ?? '';
        const sourceUrl = link.startsWith('http') ? link : `https://mixkit.co${link}`;

        results.push({
          title,
          type: 'movie' as const,
          poster,
          sourceName: this.name,
          sourceUrl,
          sources: [
            {
              url: videoSrc ?? sourceUrl,
              quality: '720p' as const,
              format: 'mp4' as const,
            },
          ],
        });
      });

      return results;
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    return {
      title: 'Mixkit Video',
      type: 'movie',
      sourceName: this.name,
      sourceUrl: url,
      sources: [{ url, quality: '720p', format: 'mp4' }],
    };
  }
}
