import axios from 'axios';
import type { SearchResult, Spider, VideoSource } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface CuratedVideo {
  id: string;
  title: string;
  type: SearchResult['type'];
  year: number;
}

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
    try {
      const scraped = await this.scrapeSearch(query);
      if (scraped.length > 0) return scraped;
    } catch {
      // fall through to curated
    }
    return this.searchCurated(query);
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) return null;

    const id = match[1];
    const [sources, meta] = await Promise.all([
      this.extractStreams(id),
      this.fetchOembedMeta(id),
    ]);

    return {
      title: meta.title || `Vimeo ${id}`,
      year: meta.upload_date ? new Date(meta.upload_date).getFullYear() : undefined,
      type: 'movie',
      poster: meta.thumbnail_url || undefined,
      description: meta.description || undefined,
      sourceName: this.name,
      sourceUrl: url,
      sources: sources.length > 0 ? sources : [{ url, quality: '720p', format: 'mp4' }],
    };
  }

  /**
   * Extract direct MP4 stream URLs from Vimeo's player config endpoint.
   * This is the same endpoint Vimeo's own web player uses.
   */
  private async extractStreams(videoId: string): Promise<VideoSource[]> {
    try {
      const resp = await axios.get(
        `https://player.vimeo.com/video/${videoId}/config`,
        { headers: { 'User-Agent': UA }, timeout: 8000 },
      );

      const config = resp.data as Record<string, unknown>;
      const request = config?.request as { files?: { progressive?: Array<{ url: string; quality: string; height: number }> } } | undefined;
      const progressive = request?.files?.progressive;
      if (!progressive || progressive.length === 0) return [];

      const sources: VideoSource[] = [];
      for (const file of progressive) {
        let quality: VideoSource['quality'] = '720p';
        if (file.height >= 1080) quality = '1080p';
        else if (file.height >= 720) quality = '720p';
        else if (file.height >= 480) quality = '480p';
        else quality = '360p';

        sources.push({ url: file.url, quality, format: 'mp4' });
      }

      // Sort best quality first
      const order: Record<string, number> = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
      sources.sort((a, b) => (order[b.quality] || 0) - (order[a.quality] || 0));

      return sources;
    } catch {
      return [];
    }
  }

  private async fetchOembedMeta(id: string): Promise<{
    title?: string;
    thumbnail_url?: string;
    description?: string;
    upload_date?: string;
  }> {
    try {
      const resp = await axios.get('https://vimeo.com/api/oembed.json', {
        params: { url: `https://vimeo.com/${id}` },
        headers: { 'User-Agent': UA },
        timeout: 5000,
      });
      return resp.data as Record<string, string>;
    } catch {
      return {};
    }
  }

  private async scrapeSearch(_query: string): Promise<SearchResult[]> {
    return [];
  }

  private async searchCurated(query: string): Promise<SearchResult[]> {
    const qLower = query.toLowerCase();
    const matched = CURATED.filter(
      (v) =>
        v.title.toLowerCase().includes(qLower) ||
        String(v.year).includes(qLower),
    );

    const results: SearchResult[] = [];
    for (const video of matched) {
      const result = await this.fetchOembedMeta(video.id).then((meta) => ({
        title: meta.title || video.title,
        year: meta.upload_date ? new Date(meta.upload_date).getFullYear() : video.year,
        type: video.type,
        poster: meta.thumbnail_url || undefined,
        sourceName: this.name,
        sourceUrl: `https://vimeo.com/${video.id}`,
        sources: [{
          url: `https://vimeo.com/${video.id}`,
          quality: '720p' as const,
          format: 'mp4' as const,
        }],
      }));
      results.push(result);
    }

    return results;
  }
}
