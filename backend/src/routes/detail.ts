import { Router } from 'express';
import type { SpiderRegistry } from '../spiders/registry.js';

export function createDetailRouter(registry: SpiderRegistry): Router {
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

      const result = await spider.getDetail(url);
      if (!result) {
        res.status(404).json({ error: 'not found' });
        return;
      }

      res.json({ result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
