import { Router } from 'express';
import type { SpiderRegistry } from '../spiders/registry.js';
import type { TmdbService } from '../services/tmdb.js';
import type { SubtitlesService } from '../services/subtitles.js';
import type { SubtitleInfo } from '../services/subtitles.js';
import { cache } from '../services/cache.js';

const DETAIL_CACHE_TTL = 600; // 10 minutes

export function createDetailRouter(
  registry: SpiderRegistry,
  tmdb?: TmdbService,
  subtitles?: SubtitlesService,
): Router {
  const router = Router();

  router.get('/detail', async (req, res, next) => {
    try {
      const url = (req.query.url as string) ?? '';
      const spiderName = (req.query.spider as string) ?? '';

      if (!url || !spiderName) {
        res
          .status(400)
          .json({ error: '"url" and "spider" query parameters are required' });
        return;
      }

      const cacheKey = `detail:${spiderName}:${url}`;
      const cached = cache.get<{
        result: import('../spiders/base.js').SearchResult;
        subtitles?: SubtitleInfo[];
      }>(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const spider = registry.getSpider(spiderName);
      if (!spider) {
        res.status(404).json({ error: `spider "${spiderName}" not found` });
        return;
      }

      let result = await spider.getDetail(url);
      if (!result) {
        res.status(404).json({ error: 'not found' });
        return;
      }

      // Optionally enrich with TMDB metadata
      if (tmdb?.enabled) {
        result = await tmdb.enrichDetail(result);
      }

      // Optionally fetch subtitles
      let subtitlesResult: SubtitleInfo[] | undefined;
      if (subtitles?.enabled && result.title) {
        subtitlesResult = await subtitles.searchSubtitles(
          result.title,
          result.year,
        );
      }

      const payload: Record<string, unknown> = { result };
      if (subtitlesResult) {
        payload['subtitles'] = subtitlesResult;
      }

      cache.set(cacheKey, payload, DETAIL_CACHE_TTL);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
