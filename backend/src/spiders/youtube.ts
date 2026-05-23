import axios from 'axios';
import type { SearchResult, Spider, VideoSource } from './base.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// YouTube web client API key — public, used by youtube.com itself
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20240101.00.00',
    hl: 'zh-CN',
    gl: 'CN',
  },
};

interface YtVideoItem {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  description: string;
}

export class YouTubeSpider implements Spider {
  name = 'youtube';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get('https://www.youtube.com/results', {
        params: { search_query: query },
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        timeout: 10000,
      });

      const videos = this.extractVideos(resp.data);

      return videos.map((v) => ({
        title: v.title,
        type: 'movie' as const,
        poster: v.thumbnail,
        description: v.description || undefined,
        sourceName: this.name,
        sourceUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
        sources: [
          {
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            quality: '720p' as const,
            format: 'mp4' as const,
          },
        ],
      }));
    } catch {
      return [];
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    const match = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
    if (!match) return null;

    const videoId = match[1];
    let info: { title?: string; thumbnail?: string } = {};

    // Get metadata from oEmbed
    try {
      const oembedResp = await axios.get('https://www.youtube.com/oembed', {
        params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
        headers: { 'User-Agent': UA },
        timeout: 5000,
      });
      info = oembedResp.data as { title?: string; thumbnail?: string };
    } catch {
      // continue without metadata
    }

    // Try to get direct stream URLs, fall back to embed
    const streams = await this.extractStreams(videoId);

    return {
      title: info.title || `YouTube ${videoId}`,
      type: 'movie',
      poster: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      sourceName: this.name,
      sourceUrl: url,
      sources: streams.length > 0
        ? streams
        : [{ url: `https://www.youtube.com/embed/${videoId}`, quality: '720p', format: 'embed' }],
    };
  }

  /**
   * Extract streaming formats using YouTube's InnerTube player API.
   * Returns direct MP4/M3U8 URLs that the video player can use.
   */
  private async extractStreams(videoId: string): Promise<VideoSource[]> {
    try {
      const resp = await axios.post(
        `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
        { videoId, context: INNERTUBE_CONTEXT },
        { headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }, timeout: 8000 },
      );

      const data = resp.data as Record<string, unknown>;
      const streamingData = data?.streamingData as
        | { formats?: Array<Record<string, unknown>>; adaptiveFormats?: Array<Record<string, unknown>> }
        | undefined;

      if (!streamingData) return [];

      const allFormats = [
        ...(streamingData.formats ?? []),
        ...(streamingData.adaptiveFormats ?? []),
      ];

      const sources: VideoSource[] = [];
      const seen = new Set<string>();

      for (const fmt of allFormats) {
        const url = fmt.url as string | undefined;
        const mimeType = (fmt.mimeType as string) || '';
        const qualityLabel = (fmt.qualityLabel as string) || '';
        const bitrate = (fmt.bitrate as number) || 0;
        if (!url) continue;

        // Determine format
        let format: VideoSource['format'] = 'mp4';
        if (mimeType.includes('mp4')) format = 'mp4';
        else if (mimeType.includes('webm')) format = 'mp4'; // expo-av prefers mp4 containers
        else continue;

        // Determine quality
        let quality: VideoSource['quality'] = '720p';
        if (qualityLabel) {
          const h = parseInt(qualityLabel);
          if (h >= 2160) quality = '1080p';
          else if (h >= 1080) quality = '1080p';
          else if (h >= 720) quality = '720p';
          else if (h >= 480) quality = '480p';
          else quality = '360p';
        } else if (bitrate > 1_000_000) quality = '720p';
        else if (bitrate > 400_000) quality = '480p';
        else quality = '360p';

        // Deduplicate by quality level
        if (seen.has(quality)) continue;
        seen.add(quality);

        sources.push({ url, quality, format });
      }

      // Sort best quality first
      const qualityOrder: Record<string, number> = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
      sources.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

      return sources.slice(0, 4);
    } catch {
      return [];
    }
  }

  private extractVideos(html: string): YtVideoItem[] {
    const match = html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/);
    if (!match) return [];

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(match[1]);
    } catch {
      return [];
    }

    const items: YtVideoItem[] = [];
    try {
      const sectionList = (data as Record<string, unknown>)?.contents as
        | { twoColumnSearchResultsRenderer?: { primaryContents?: { sectionListRenderer?: { contents?: Array<Record<string, unknown>> } } } }
        | undefined;
      const contents = sectionList?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];

      for (const section of contents) {
        const videoItems = (section as Record<string, unknown>)?.itemSectionRenderer as
          | { contents?: Array<Record<string, unknown>> }
          | undefined;
        for (const raw of videoItems?.contents ?? []) {
          const video = (raw as Record<string, unknown>)?.videoRenderer as Record<string, unknown> | undefined;
          if (!video?.videoId) continue;

          const titleRuns = video.title as { runs?: Array<{ text: string }>; simpleText?: string } | undefined;
          const title = titleRuns?.runs?.[0]?.text ?? titleRuns?.simpleText ?? 'Untitled';

          const thumbs = video.thumbnail as { thumbnails?: Array<{ url: string }> } | undefined;
          const thumbnail = thumbs?.thumbnails?.[thumbs.thumbnails.length - 1]?.url ??
            `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

          const channelRuns = video.shortBylineText as { runs?: Array<{ text: string }> } | undefined;
          const channelName = channelRuns?.runs?.[0]?.text ?? '';

          let description = '';
          const descRuns = video.descriptionSnippet as { runs?: Array<{ text: string }> } | undefined;
          if (descRuns?.runs) {
            description = descRuns.runs.map((r) => r.text).join('');
          }

          items.push({
            videoId: video.videoId as string,
            title,
            channelName,
            thumbnail,
            description,
          });
        }
      }
    } catch {
      // partial results
    }

    return items;
  }
}
