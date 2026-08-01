/** @license SPDX-License-Identifier: Apache-2.0 */

import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
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

import improveRoutes from './routes/improve.js';
import advisorRoutes from './routes/advisor.js';
import auditRoutes from './routes/audit.js';
import draftRoutes from './routes/draft.js';
import debugRoutes from './routes/debug.js';
import templatesRoutes from './routes/templates.js';
import parseRoutes from './routes/parse.js';
import processDisciplinaryPdfRoutes from './routes/processDisciplinaryPdf.js';
import usageRoutes from './routes/usage.js';
import pilotRoutes from './routes/pilot.js';
import adminRoutes from './routes/admin.js';
import platformRoutes from './routes/platform.js';
import { errorHandler } from '../middleware/errorHandler.js';

// API routes — cada módulo aplica su propio rate limit después de autenticar.
app.use('/api', improveRoutes);
app.use('/api', advisorRoutes);
app.use('/api', auditRoutes);
app.use('/api', draftRoutes);
app.use('/api', parseRoutes);
app.use('/api', processDisciplinaryPdfRoutes);

// API routes — sin rate limit (lectura, utilidades)
app.use('/api', debugRoutes);
app.use('/api', templatesRoutes);
app.use('/api', usageRoutes);
app.use('/api', pilotRoutes);
app.use('/api', adminRoutes);
app.use('/api', platformRoutes);

// Global error handler — must be registered AFTER all routes
app.use(errorHandler);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
