import { Router } from 'express';
import type { SpiderRegistry } from '../spiders/registry.js';
import type { TmdbService } from '../services/tmdb.js';

export function createDetailRouter(
  registry: SpiderRegistry,
  tmdb?: TmdbService,
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

      res.json({ result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
