import express from 'express';
import cors from 'cors';
import { SpiderRegistry } from './spiders/registry.js';
import { createSearchRouter } from './routes/search.js';
import { createDetailRouter } from './routes/detail.js';
import { createSubtitlesRouter } from './routes/subtitles.js';
import { TmdbService } from './services/tmdb.js';
import { SubtitlesService } from './services/subtitles.js';
import { cache } from './services/cache.js';
import { HomeAggregator } from './services/home-aggregator.js';
import { CATEGORIES } from './services/category-service.js';
import type { FilterOptions, SearchResult } from './spiders/base.js';

const app = express();
const PORT = Number(process.env['PORT']) || 3000;

const registry = new SpiderRegistry();
const tmdb = new TmdbService();
const subtitles = new SubtitlesService();
const homeAggregator = new HomeAggregator(registry);

if (tmdb.enabled) {
  console.log('TMDB metadata enrichment enabled');
} else {
  console.log('TMDB disabled (set TMDB_API_KEY to enable)');
}

if (subtitles.enabled) {
  console.log('OpenSubtitles enabled');
} else {
  console.log('OpenSubtitles disabled (set OPENSUBTITLES_API_KEY to enable)');
}

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    spiders: registry.getAll().map((s) => s.name),
    cache: cache.stats,
  });
});

// Routes
app.use('/api', createSearchRouter(registry, tmdb));
app.use('/api', createDetailRouter(registry, tmdb, subtitles));
app.use('/api', createSubtitlesRouter(subtitles));

// Home page — aggregated data for the main screen
app.get('/api/home', async (_req, res, next) => {
  try {
    const cached = cache.get<Awaited<ReturnType<HomeAggregator['getHomeData']>>>('home');
    if (cached) { res.json(cached); return; }
    const data = await homeAggregator.getHomeData();
    cache.set('home', data, 300_000);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Browse with filters
app.get('/api/browse', async (req, res, next) => {
  try {
    const filters: FilterOptions = {};
    if (req.query.type) filters.type = req.query.type as FilterOptions['type'];
    if (req.query.region) filters.region = req.query.region as FilterOptions['region'];
    if (req.query.year) filters.year = Number(req.query.year);
    if (req.query.decade) filters.decade = Number(req.query.decade);
    if (req.query.sort) filters.sort = req.query.sort as FilterOptions['sort'];
    filters.page = Number(req.query.page) || 1;
    filters.pageSize = Number(req.query.pageSize) || 20;

    const cacheKey = `browse:${JSON.stringify(filters)}`;
    const cached = cache.get<Awaited<ReturnType<SpiderRegistry['searchWithFilters']>>>(cacheKey);
    if (cached) { res.json(cached); return; }

    const data = await registry.searchWithFilters(filters);
    cache.set(cacheKey, data, 120_000);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Recommendations (related content)
app.get('/api/recommendations', async (req, res, next) => {
  try {
    const url = (req.query.url as string) ?? '';
    const spiderName = (req.query.spider as string) ?? '';

    if (!url || !spiderName) {
      res.status(400).json({ error: '"url" and "spider" query parameters are required' });
      return;
    }

    const cacheKey = `recommendations:${spiderName}:${url}`;
    const cached = cache.get<{ recommendations: SearchResult[] }>(cacheKey);
    if (cached) { res.json(cached); return; }

    const spider = registry.getSpider(spiderName);
    if (!spider) {
      res.status(404).json({ error: `spider "${spiderName}" not found` });
      return;
    }

    // Try to get the detail first to extract related content
    const detail = await spider.getDetail(url);
    let recommendations: SearchResult[] = [];

    if (detail?.related && detail.related.length > 0) {
      recommendations = detail.related;
    } else if (detail?.title) {
      // Fallback: search by the first keyword of the title
      const keywords = detail.title.replace(/[《》\s]/g, '').slice(0, 10);
      if (keywords) {
        const allResults = await registry.searchAll(keywords);
        const filtered = allResults.filter(
          (r) => r.sourceUrl !== url && r.title !== detail.title,
        );
        const seen = new Set<string>();
        recommendations = filtered.filter((r) => {
          const key = r.title.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 12);
      }
    }

    const payload = { recommendations };
    cache.set(cacheKey, payload, 600_000);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Hot / trending content
app.get('/api/hot', async (_req, res, next) => {
  try {
    const cached = cache.get<{ results: SearchResult[]; total: number }>('hot');
    if (cached) { res.json(cached); return; }

    const results = await registry.dedupe('search:hot', () => registry.searchAll('hot popular trending'));
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key = r.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    deduped.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const payload = { results: deduped.slice(0, 30), total: Math.min(deduped.length, 30) };
    cache.set('hot', payload, 300_000);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Latest updates by category
app.get('/api/latest', async (_req, res, next) => {
  try {
    const cached = cache.get<{ categories: Awaited<ReturnType<HomeAggregator['getHomeData']>>['latestByCategory'] }>('latest');
    if (cached) { res.json(cached); return; }
    const homeData = await homeAggregator.getHomeData();
    const payload = { categories: homeData.latestByCategory };
    cache.set('latest', payload, 300_000);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// Category list
app.get('/api/categories', (_req, res) => {
  const cached = cache.get<{ categories: typeof CATEGORIES }>('categories');
  if (cached) { res.json(cached); return; }
  const payload = { categories: CATEGORIES };
  cache.set('categories', payload, 1_800_000);
  res.json(payload);
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'internal server error' });
  },
);

app.listen(PORT, () => {
  console.log(`Video app backend listening on http://localhost:${PORT}`);
});
