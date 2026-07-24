/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/requireTenant.js';
import { requireRole } from '../middleware/requireRole.js';
import { sanitize } from '../validators/sanitizers.js';
import { httpsGet, httpsPatch } from '../lib/https.js';

const router = Router();
const TEMPLATE_SELECT_PUBLIC = 'id,doc_type,label,updated_at';
const TEMPLATE_SELECT_ADMIN = 'id,doc_type,label,system_prompt,updated_at';

function getSupabaseHostname(): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!supabaseUrl || !URL.canParse(supabaseUrl)) {
    throw new Error('Supabase no configurado');
  }
  return new URL(supabaseUrl).hostname;
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';
}

router.get('/document-templates', requireAuth, requireTenant, async (_req, res) => {
  try {
    const data = await httpsGet(
      getSupabaseHostname(),
      `/rest/v1/document_templates?select=${TEMPLATE_SELECT_PUBLIC}&order=doc_type`,
      {
        apikey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY ?? ''}`,
      }
    );
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Error al obtener plantillas.' });
  }
});

router.get(
  '/document-templates/admin',
  requireAuth,
  requireTenant,
  requireRole(['admin', 'direccion']),
  async (_req, res) => {
    try {
      const data = await httpsGet(
        getSupabaseHostname(),
        `/rest/v1/document_templates?select=${TEMPLATE_SELECT_ADMIN}&order=doc_type`,
        {
          apikey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY ?? ''}`,
        }
      );
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Error al obtener plantillas.' });
    }
  }
);

router.put(
  '/document-templates',
  requireAuth,
  requireTenant,
  requireRole(['admin', 'direccion']),
  async (req, res) => {
    const { id, system_prompt } = req.body as { id?: string; system_prompt?: string };
    if (!id || !system_prompt) {
      res.status(400).json({ error: 'Campos requeridos: id, system_prompt' });
      return;
    }

    if (typeof system_prompt !== 'string' || system_prompt.trim().length === 0) {
      res.status(400).json({ error: 'El system_prompt no puede estar vacío.' });
      return;
    }

    if (system_prompt.length > 20000) {
      res.status(400).json({ error: 'El system_prompt excede el máximo permitido (20000 caracteres).' });
      return;
    }

    try {
      const serviceRoleKey = getServiceRoleKey();
      const sanitized = sanitize(system_prompt).slice(0, 20000);
      await httpsPatch(
        getSupabaseHostname(),
        `/rest/v1/document_templates?id=eq.${id}`,
        {
          system_prompt: sanitized,
          updated_at: new Date().toISOString(),
        },
        {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'return=minimal',
        }
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Error al actualizar plantilla.' });
    }
  }
);

export default router;
