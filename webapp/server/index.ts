import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import caseRoutes from './routes/cases.js';
import documentRoutes from './routes/documents.js';
import agentRoutes from './routes/agents.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security headers — allow Vite-built assets and inline styles (Tailwind)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Prevent information leakage
app.disable('x-powered-by');

// CORS — require explicit origins in production, block localhost
if (!process.env.ALLOWED_ORIGINS && process.env.NODE_ENV === 'production') {
  throw new Error('ALLOWED_ORIGINS must be set in production');
}
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.NODE_ENV === 'production') {
  const hasLocalhost = allowedOrigins.some(o => o.includes('localhost'));
  if (hasLocalhost) {
    console.warn('[security] ALLOWED_ORIGINS contains localhost in production — removing');
    const filtered = allowedOrigins.filter(o => !o.includes('localhost'));
    allowedOrigins.length = 0;
    allowedOrigins.push(...filtered);
  }
}
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes — 14 endpoints total
app.use('/api/auth', authRoutes);        // POST /login, GET /me
app.use('/api/cases', caseRoutes);       // POST /, GET /, GET /:id, PATCH /:id
app.use('/api/cases', documentRoutes);   // POST /:id/documents, GET /:id/documents
app.use('/api/cases', agentRoutes);      // POST /:id/agents/:stage, GET /:id/agents/stream, POST /:id/approve
app.use('/api/cases', reportRoutes);     // GET /:id/report, PUT /:id/report, POST /:id/export

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
}));

// Serve Vite build in production.
// Layout when running compiled (Railway):
//   webapp/dist/server/index.js   ← this file at runtime
//   webapp/dist/client/index.html ← Vite frontend build
// In dev (`tsx server/index.ts`) the dist/client folder doesn't exist —
// the Vite dev server on :5173 handles the frontend instead, so we skip
// the static + catch-all registration entirely when the build isn't present.
const clientDist = path.join(__dirname, '..', 'client');
const indexHtml = path.join(clientDist, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDist, {
    index: false, // we serve index.html via the catch-all so client-side routes always resolve
    maxAge: '1h',
  }));

  // SPA fallback — every non-API GET returns index.html so React Router
  // can handle client-side routes like /dashboard, /cases/:id/intake, etc.
  // Express 5 wildcard syntax: '/{*splat}' matches anything not already routed.
  app.get('/{*splat}', (_req, res) => res.sendFile(indexHtml));
  console.log(`[server] Serving client build from ${clientDist}`);
} else {
  console.warn(`[server] No client build found at ${clientDist} — running API-only (dev mode)`);
}

app.listen(PORT, () => {
  console.log(`BlackBar API running on http://localhost:${PORT}`);
  console.log('Endpoints: auth(2) + cases(4) + documents(2) + agents(3) + reports(3) = 14');
});
