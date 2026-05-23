import { Router } from 'express';
import type { SubtitlesService } from '../services/subtitles.js';

export function createSubtitlesRouter(subtitles: SubtitlesService): Router {
  const router = Router();

  router.get('/subtitles', async (req, res, next) => {
    try {
      if (!subtitles.enabled) {
        res.json({ enabled: false });
        return;
      }

      const title = (req.query.title as string) ?? '';
      if (!title.trim()) {
        res.status(400).json({ error: '"title" query parameter is required' });
        return;
      }

      const year = req.query.year ? Number(req.query.year) : undefined;
      const lang = (req.query.lang as string) || undefined;

      const results = await subtitles.searchSubtitles(title, year, lang);

      res.json({ enabled: true, subtitles: results, total: results.length });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
