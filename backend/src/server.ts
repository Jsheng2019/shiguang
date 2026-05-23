import express from 'express';
import cors from 'cors';
import { SpiderRegistry } from './spiders/registry.js';
import { createSearchRouter } from './routes/search.js';
import { createDetailRouter } from './routes/detail.js';
import { createSubtitlesRouter } from './routes/subtitles.js';
import { TmdbService } from './services/tmdb.js';
import { SubtitlesService } from './services/subtitles.js';
import { cache } from './services/cache.js';

const app = express();
const PORT = Number(process.env['PORT']) || 3000;

const registry = new SpiderRegistry();
const tmdb = new TmdbService();
const subtitles = new SubtitlesService();

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
