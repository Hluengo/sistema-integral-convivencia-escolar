/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'node:path';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import auditRoutes from './api/routes/audit';
import draftRoutes from './api/routes/draft';
import improveRoutes from './api/routes/improve';
import advisorRoutes from './api/routes/advisor';
import templatesRoutes from './api/routes/templates';
import parseRoutes from './api/routes/parse';
import processDisciplinaryPdfRoutes from './api/routes/processDisciplinaryPdf';
import debugRoutes from './api/routes/debug';
import usageRoutes from './api/routes/usage';
import pilotRoutes from './api/routes/pilot';
import adminRoutes from './api/routes/admin';
import platformRoutes from './api/routes/platform';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3001', 10);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: allowedOrigins.length > 0,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// API routes — cada módulo aplica su propio rate limit después de autenticar.
app.use('/api', auditRoutes);
app.use('/api', draftRoutes);
app.use('/api', improveRoutes);
app.use('/api', advisorRoutes);
app.use('/api', parseRoutes);
app.use('/api', processDisciplinaryPdfRoutes);

// API routes — sin rate limit (lectura, utilidades)
app.use('/api', templatesRoutes);
app.use('/api', debugRoutes);
app.use('/api', usageRoutes);
app.use('/api', pilotRoutes);
app.use('/api', adminRoutes);
app.use('/api', platformRoutes);

// Global error handler — must be registered AFTER all routes
app.use(errorHandler);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
