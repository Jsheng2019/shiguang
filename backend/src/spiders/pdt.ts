import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult, Spider, VideoSource } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://publicdomaintorrents.info';

/**
 * Public Domain Torrents spider — searches public domain movies from
 * publicdomaintorrents.info. Scrapes HTML search results and movie detail pages
 * for torrent download links, posters, and descriptions.
 */
export class PublicDomainTorrentsSpider implements Spider {
  name = 'pdt';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get(`${BASE}/nshowcat.html`, {
        params: { category: 'ALL', page: 1, search: query },
        headers: { 'User-Agent': UA },
        timeout: 10000,
      });

      const $ = cheerio.load(resp.data);
      const seen = new Set<string>();
      const results: SearchResult[] = [];

      // Movie links on the search results page: <a href=nshowmovie.html?movieid=ID>Title</a>
      $('a[href*="nshowmovie.html?movieid="]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const idMatch = href.match(/movieid=(\d+)/);
        if (!idMatch) return;

        const movieId = idMatch[1];
        if (seen.has(movieId)) return;
        seen.add(movieId);

        const title = $(el).text().trim();
        if (!title) return;

        results.push({
          title,
          type: 'movie',
          sourceName: this.name,
          sourceUrl: `${BASE}/nshowmovie.html?movieid=${movieId}`,
          sources: [
            {
              url: `${BASE}/bt/btdownload.php?type=torrent&file=${encodeURIComponent(title)}.avi.torrent`,
              quality: '720p',
              format: 'mp4',
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
    const match = url.match(/movieid=(\d+)/);
    if (!match) return null;

    const movieId = match[1];

    try {
      const resp = await axios.get(`${BASE}/nshowmovie.html`, {
        params: { movieid: movieId },
        headers: { 'User-Agent': UA },
        timeout: 10000,
      });

      const $ = cheerio.load(resp.data);
      const title = $('h3').first().text().trim();
      if (!title) return null;

      // Description — find the first <td> with substantial plain text
      let description = '';
      $('td').each((_, el) => {
        const $td = $(el);
        // Skip cells that contain block-level elements
        if ($td.find('h3, img, form, script, iframe, input, table').length > 0) return;
        const txt = $td.text().trim();
        if (txt.length < 30) return;
        if (
          txt.startsWith('User') ||
          txt.startsWith('Categories') ||
          txt.startsWith('Internet Movie') ||
          txt.includes('Click Here') ||
          txt.includes('Cannot find') ||
          txt.includes('User Comments') ||
          txt.includes('cents each') ||
          txt.includes('PayPal') ||
          txt.includes('paypal') ||
          txt.includes('minimum order') ||
          txt.includes('$') ||
          txt.includes('DVD-R')
        ) {
          return;
        }
        description = txt;
      });

      // Poster screenshot — exclude sidebar ads
      let poster: string | undefined;
      $('img[src*="grab"]').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src.includes('hdsale') || src.includes('rentme') || src.includes('button')) return;
        if (!poster) {
          poster = src.startsWith('http') ? src : `${BASE}/${src}`;
        }
      });

      // Determine type from the movie's own category links (same td as the title)
      let type: SearchResult['type'] = 'movie';
      $('h3')
        .first()
        .closest('td')
        .find('a[href*="nshowcat.html?category="]')
        .each((_, el) => {
          const cat = $(el).attr('href')?.toLowerCase() || '';
          if (cat.includes('documentary')) type = 'documentary';
          if (cat.includes('serial')) type = 'series';
        });

      // Extract torrent download links
      const sources: VideoSource[] = [];
      $('a[href*="btdownload.php"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        const fullUrl = href.startsWith('http') ? href : `${BASE}/${href}`;

        let quality: VideoSource['quality'] = '480p';
        if (text.includes('divx') || text.includes('avi')) quality = '720p';
        if (text.includes('1080')) quality = '1080p';

        sources.push({ url: fullUrl, quality, format: 'mp4' });
      });

      return {
        title,
        type,
        poster,
        description: description || undefined,
        sourceName: this.name,
        sourceUrl: url,
        sources: sources.length > 0
          ? sources
          : [{ url: `${BASE}/nshowmovie.html?movieid=${movieId}`, quality: '720p', format: 'mp4' }],
      };
    } catch {
      return null;
    }
  }
}
