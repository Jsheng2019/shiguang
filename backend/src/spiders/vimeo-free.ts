import axios from 'axios';
import type { SearchResult, Spider } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface CuratedVideo {
  id: string;
  title: string;
  type: SearchResult['type'];
  year: number;
}

/**
 * Known free / public-domain videos on Vimeo, used as search candidates.
 * The spider first attempts to scrape Vimeo search HTML, then falls back to
 * matching these curated entries via oEmbed metadata.
 */
const CURATED: CuratedVideo[] = [
  { id: '1084537', title: 'Night of the Living Dead', type: 'movie', year: 1968 },
  { id: '76979871', title: 'A Trip to the Moon', type: 'movie', year: 1902 },
  { id: '351972631', title: 'Big Buck Bunny', type: 'movie', year: 2008 },
  { id: '365776171', title: 'Sintel', type: 'movie', year: 2010 },
  { id: '374315003', title: 'Tears of Steel', type: 'movie', year: 2012 },
  { id: '261402802', title: 'Elephant Dreams', type: 'movie', year: 2006 },
  { id: '146744125', title: 'The Adventures of Sherlock Holmes', type: 'movie', year: 1939 },
  { id: '349643530', title: 'Cosmos Laundromat', type: 'movie', year: 2015 },
  { id: '108650273', title: 'Agent 327 Operation Barbershop', type: 'movie', year: 2017 },
  { id: '312185206', title: 'Glassworks', type: 'movie', year: 2018 },
  { id: '195019739', title: 'Plumiferos', type: 'movie', year: 2010 },
  { id: '231922820', title: 'Caminandes Llama Drama', type: 'movie', year: 2013 },
  { id: '316972093', title: 'Caminandes Gran Dillama', type: 'movie', year: 2016 },
  { id: '248615783', title: 'The Wreck of the Zanzibar', type: 'documentary', year: 2016 },
];

export class VimeoFreeSpider implements Spider {
  name = 'vimeo-free';

  async search(query: string): Promise<SearchResult[]> {
    // Attempt to scrape Vimeo search page first
    try {
      const scraped = await this.scrapeSearch(query);
      if (scraped.length > 0) return scraped;
    } catch {
      // fall through to curated
    }

    // Fall back to curated list with oEmbed enrichment
    return this.searchCurated(query);
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) return null;

    const id = match[1];
    return this.fetchOembed(id);
  }

  /** Scrape Vimeo search HTML for initial-state data. */
  private async scrapeSearch(query: string): Promise<SearchResult[]> {
    const resp = await axios.get('https://vimeo.com/search', {
      params: { q: query, sort: 'relevant' },
      headers: { 'User-Agent': UA },
      timeout: 5000,
    });

    const html: string = resp.data;
    const results: SearchResult[] = [];

    // Try to extract video data from script tags containing __NUXT__ state
    const nuxtMatch = html.match(/__NUXT__\s*=\s*({.+?});?\s*<\/script>/);
    if (nuxtMatch) {
      try {
        const nuxt = JSON.parse(nuxtMatch[1]);
        // Navigate possible paths — Vimeo's Nuxt state shape changes frequently
        const videos = this.extractFromNuxt(nuxt);
        if (videos.length > 0) return videos;
      } catch {
        // ignore parse errors
      }
    }

    return results;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractFromNuxt(_nuxt: any): SearchResult[] {
    // Nuxt state structure on Vimeo is not stable; returning empty triggers fallback
    return [];
  }

  /** Match query against curated videos and fetch live metadata via oEmbed. */
  private async searchCurated(query: string): Promise<SearchResult[]> {
    const qLower = query.toLowerCase();
    const matched = CURATED.filter(
      (v) =>
        v.title.toLowerCase().includes(qLower) ||
        String(v.year).includes(qLower),
    );

    const results: SearchResult[] = [];
    for (const video of matched) {
      const result = await this.fetchOembed(video.id);
      if (result) {
        results.push(result);
      } else {
        // Push basic entry if oEmbed fails
        results.push({
          title: video.title,
          year: video.year,
          type: video.type,
          sourceName: this.name,
          sourceUrl: `https://vimeo.com/${video.id}`,
          sources: [
            {
              url: `https://vimeo.com/${video.id}`,
              quality: '720p',
              format: 'mp4',
            },
          ],
        });
      }
    }

    return results;
  }

  /** Fetch video metadata from Vimeo oEmbed endpoint. */
  private async fetchOembed(id: string): Promise<SearchResult | null> {
    try {
      const resp = await axios.get('https://vimeo.com/api/oembed.json', {
        params: { url: `https://vimeo.com/${id}` },
        headers: { 'User-Agent': UA },
        timeout: 5000,
      });

      const data = resp.data as {
        title?: string;
        thumbnail_url?: string;
        description?: string;
        author_name?: string;
        upload_date?: string;
      };

      return {
        title: data.title || `Vimeo ${id}`,
        year: data.upload_date
          ? new Date(data.upload_date).getFullYear()
          : undefined,
        type: 'movie',
        poster: data.thumbnail_url || undefined,
        description: data.description || undefined,
        sourceName: this.name,
        sourceUrl: `https://vimeo.com/${id}`,
        sources: [
          {
            url: `https://vimeo.com/${id}`,
            quality: '720p',
            format: 'mp4',
          },
        ],
      };
    } catch {
      return null;
    }
  }
}
