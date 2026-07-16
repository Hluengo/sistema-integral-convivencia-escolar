/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'node:path';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import auditRoutes from './routes/audit';
import draftRoutes from './routes/draft';
import improveRoutes from './routes/improve';
import advisorRoutes from './routes/advisor';
import templatesRoutes from './routes/templates';
import parseRoutes from './routes/parse';
import debugRoutes from './routes/debug';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3001', 10);

app.use(compression());
app.use(express.json({ limit: '512kb' }));

// API routes
app.use('/api', auditRoutes);
app.use('/api', draftRoutes);
app.use('/api', improveRoutes);
app.use('/api', advisorRoutes);
app.use('/api', templatesRoutes);
app.use('/api', parseRoutes);
app.use('/api', debugRoutes);

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
