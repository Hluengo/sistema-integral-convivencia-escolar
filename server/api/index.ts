/** @license SPDX-License-Identifier: Apache-2.0 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '512kb' }));

import improveRoutes from './routes/improve.js';
import advisorRoutes from './routes/advisor.js';
import auditRoutes from './routes/audit.js';
import draftRoutes from './routes/draft.js';
import debugRoutes from './routes/debug.js';
import templatesRoutes from './routes/templates.js';
import parseRoutes from './routes/parse.js';
import processDisciplinaryPdfRoutes from './routes/processDisciplinaryPdf.js';
import usageRoutes from './routes/usage.js';

app.use('/api', improveRoutes);
app.use('/api', advisorRoutes);
app.use('/api', auditRoutes);
app.use('/api', draftRoutes);
app.use('/api', debugRoutes);
app.use('/api', templatesRoutes);
app.use('/api', parseRoutes);
app.use('/api', processDisciplinaryPdfRoutes);
app.use('/api', usageRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
