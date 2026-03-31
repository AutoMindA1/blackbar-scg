import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import caseRoutes from './routes/cases.js';
import documentRoutes from './routes/documents.js';
import agentRoutes from './routes/agents.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes — 14 endpoints total
app.use('/api/auth', authRoutes);        // POST /login, GET /me
app.use('/api/cases', caseRoutes);       // POST /, GET /, GET /:id, PATCH /:id
app.use('/api/cases', documentRoutes);   // POST /:id/documents, GET /:id/documents
app.use('/api/cases', agentRoutes);      // POST /:id/agents/:stage, GET /:id/agents/stream, POST /:id/approve
app.use('/api/cases', reportRoutes);     // GET /:id/report, PUT /:id/report, POST /:id/export

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`BlackBar API running on http://localhost:${PORT}`);
  console.log('Endpoints: auth(2) + cases(4) + documents(2) + agents(3) + reports(3) = 14');
});
