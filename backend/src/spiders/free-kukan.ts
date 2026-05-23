import axios from 'axios';
import type { SearchResult, Spider, VideoSource } from './base.js';

interface IAResult {
  identifier: string;
  title?: string;
  description?: string;
  year?: string;
  avg_rating?: number;
  downloads?: number;
}

interface IAMetadataResponse {
  metadata?: {
    title?: string;
    description?: string;
    year?: string;
    creator?: string;
  };
  files?: Array<{
    name: string;
    format: string;
    source?: string;
  }>;
}

/**
 * Internet Archive spider — searches public domain movies from archive.org.
 * Uses the official Advanced Search JSON API and the Metadata API.
 */
export class InternetArchiveSpider implements Spider {
  name = 'internet-archive';

  async search(query: string): Promise<SearchResult[]> {
    const url = 'https://archive.org/advancedsearch.php';
    const params = {
      q: `${query} AND mediatype:movies`,
      'fl[]': ['identifier', 'title', 'description', 'year', 'avg_rating', 'downloads'],
      rows: 20,
      page: 1,
      output: 'json',
      sort: 'downloads desc',
    };

    const resp = await axios.get<{ response?: { docs?: IAResult[] } }>(url, { params });
    const docs = resp.data?.response?.docs ?? [];

    return docs.map((doc) => ({
      title: doc.title || doc.identifier || 'Untitled',
      year: doc.year ? Number(doc.year) : undefined,
      type: 'movie' as const,
      poster: `https://archive.org/services/img/${doc.identifier}`,
      sourceName: this.name,
      sourceUrl: `https://archive.org/details/${doc.identifier}`,
      sources: [
        {
          url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp4`,
          quality: '720p' as const,
          format: 'mp4' as const,
        },
      ],
    }));
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/archive\.org\/details\/([^/?]+)/);
    if (!match) return null;

    const identifier = match[1];
    const resp = await axios.get<IAMetadataResponse>(
      `https://archive.org/metadata/${identifier}`,
    );
    const meta = resp.data;

    if (!meta?.metadata) return null;

    const md = meta.metadata;
    const files = meta.files ?? [];

    // Filter to actual video files with playable formats
    const videoFormats = new Set(['MPEG4', '512Kb MPEG4', 'h.264', 'h.264 64Kb']);
    const sources: VideoSource[] = files
      .filter((f) => f.source === 'original' && videoFormats.has(f.format))
      .map((f) => ({
        url: `https://archive.org/download/${identifier}/${f.name}`,
        quality: (f.format === '512Kb MPEG4' ? '720p' : '480p') as VideoSource['quality'],
        format: 'mp4' as const,
      }));

    return {
      title: md.title || identifier,
      year: md.year ? Number(md.year) : undefined,
      type: 'movie' as const,
      poster: `https://archive.org/services/img/${identifier}`,
      sourceName: this.name,
      sourceUrl: url,
      sources: sources.length > 0
        ? sources
        : [
            {
              url: `https://archive.org/download/${identifier}/${identifier}.mp4`,
              quality: '720p' as const,
              format: 'mp4' as const,
            },
          ],
    };
  }
}
