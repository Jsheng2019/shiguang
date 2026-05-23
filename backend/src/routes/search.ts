import { Router } from 'express';
import type { SpiderRegistry } from '../spiders/registry.js';
import type { SearchResult } from '../spiders/base.js';
import type { TmdbService } from '../services/tmdb.js';
import { cache } from '../services/cache.js';

const SEARCH_CACHE_TTL = 300; // 5 minutes

export function createSearchRouter(
  registry: SpiderRegistry,
  tmdb?: TmdbService,
): Router {
  const router = Router();

  router.get('/search', async (req, res, next) => {
    try {
      const q = (req.query.q as string) ?? '';
      if (!q.trim()) {
        res.status(400).json({ error: 'query parameter "q" is required' });
        return;
      }

      const cacheKey = `search:${q.trim()}`;
      const cached = cache.get<{ results: SearchResult[]; total: number }>(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      let results = await registry.searchAll(q);

      // Optionally enrich with TMDB metadata
      if (tmdb?.enabled) {
        results = await tmdb.enrichSearchResults(results);
      }

      const sorted = sortByRelevance(results, q);
      const payload = { results: sorted, total: sorted.length };

      cache.set(cacheKey, payload, SEARCH_CACHE_TTL);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Simple relevance sort: more query tokens matched in the title = higher rank. */
function sortByRelevance(items: SearchResult[], query: string): SearchResult[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return [...items].sort((a, b) => {
    const titleA = String(a.title ?? '').toLowerCase();
    const titleB = String(b.title ?? '').toLowerCase();
    const aScore = tokens.filter((t) => titleA.includes(t)).length;
    const bScore = tokens.filter((t) => titleB.includes(t)).length;
    return bScore - aScore;
  });
}
