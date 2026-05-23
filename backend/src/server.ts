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
import type { FilterOptions } from './spiders/base.js';

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
    const data = await homeAggregator.getHomeData();
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

    const data = await registry.searchWithFilters(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Hot / trending content
app.get('/api/hot', async (_req, res, next) => {
  try {
    const results = await registry.searchAll('hot popular trending');
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key = r.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    deduped.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    res.json({ results: deduped.slice(0, 30), total: Math.min(deduped.length, 30) });
  } catch (err) {
    next(err);
  }
});

// Latest updates by category
app.get('/api/latest', async (_req, res, next) => {
  try {
    const homeData = await homeAggregator.getHomeData();
    res.json({ categories: homeData.latestByCategory });
  } catch (err) {
    next(err);
  }
});

// Category list
app.get('/api/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
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
