import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from './lib/logger.js';
import { auditMiddleware } from './middleware/audit.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import authV2Routes from './routes/authV2.js';
import caseRoutes from './routes/cases.js';
import documentRoutes from './routes/documents.js';
import agentRoutes from './routes/agents.js';
import reportRoutes from './routes/reports.js';
import orgRoutes from './routes/organizations.js';

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
}));

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
    logger.warn('ALLOWED_ORIGINS contains localhost in production — removing');
    const filtered = allowedOrigins.filter(o => !o.includes('localhost'));
    allowedOrigins.length = 0;
    allowedOrigins.push(...filtered);
  }
}
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Audit trail — logs all API requests
app.use(auditMiddleware);

// Routes
app.use('/api/auth', authRoutes);           // POST /login, GET /me (legacy)
app.use('/api/auth/v2', authV2Routes);      // POST /login, POST /refresh, POST /logout, GET /me
app.use('/api/cases', caseRoutes);          // POST /, GET /, GET /:id, PATCH /:id
app.use('/api/cases', documentRoutes);      // POST /:id/documents, GET /:id/documents
app.use('/api/cases', agentRoutes);         // POST /:id/agents/:stage, GET /:id/agents/stream, POST /:id/approve
app.use('/api/cases', reportRoutes);        // GET /:id/report, PUT /:id/report, POST /:id/export
app.use('/api/organizations', orgRoutes);   // CRUD orgs + members + usage

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '0.0.0',
}));

// Error handler — must be last middleware
app.use(errorHandler);

// Serve Vite build in production
const clientDist = path.join(__dirname, '..', 'client');
const indexHtml = path.join(clientDist, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDist, {
    index: false,
    maxAge: '1h',
  }));

  app.get('/{*splat}', (_req, res) => res.sendFile(indexHtml));
  logger.info(`Serving client build from ${clientDist}`);
} else {
  logger.warn(`No client build found at ${clientDist} — running API-only (dev mode)`);
}

app.listen(PORT, () => {
  logger.info(`BlackBar API running on http://localhost:${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    endpoints: 'auth(4) + cases(4) + documents(2) + agents(4) + reports(3) + orgs(4) + health(1) = 22',
  });
});
