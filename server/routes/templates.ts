/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/requireTenant';
import { requireRole } from '../middleware/requireRole';
import { sanitize } from '../lib/validators';

const router = Router();
const TEMPLATE_SELECT_PUBLIC = 'id,doc_type,label,updated_at';
const TEMPLATE_SELECT_ADMIN = 'id,doc_type,label,system_prompt,updated_at';

function getSupabaseRestUrl(path: string): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase no configurado');
  }
  return `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`;
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';
}

router.get('/document-templates', requireAuth, requireTenant, async (_req, res) => {
  try {
    const result = await fetch(
      getSupabaseRestUrl(`document_templates?select=${TEMPLATE_SELECT_PUBLIC}&order=doc_type`),
      {
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!result.ok) {
      res.status(result.status).json({ error: `Template fetch failed: ${result.status}` });
      return;
    }
    const data = await result.json();
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
      const result = await fetch(
        getSupabaseRestUrl(`document_templates?select=${TEMPLATE_SELECT_ADMIN}&order=doc_type`),
        {
          headers: {
            apikey: process.env.VITE_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!result.ok) {
        res.status(result.status).json({ error: `Template fetch failed: ${result.status}` });
        return;
      }
      const data = await result.json();
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
    const { id, system_prompt } = req.body;
    if (!id || !system_prompt) {
      return res.status(400).json({ error: 'Campos requeridos: id, system_prompt' });
    }

    if (typeof system_prompt !== 'string' || system_prompt.trim().length === 0) {
      return res.status(400).json({ error: 'El system_prompt no puede estar vacío.' });
    }

    if (system_prompt.length > 20000) {
      return res.status(400).json({ error: 'El system_prompt excede el máximo permitido (20000 caracteres).' });
    }

    try {
      const serviceRoleKey = getServiceRoleKey();
      const sanitizedPrompt = sanitize(system_prompt).slice(0, 20000);
      await fetch(getSupabaseRestUrl(`document_templates?id=eq.${id}`), {
        method: 'PATCH',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'return=minimal',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_prompt: sanitizedPrompt,
          updated_at: new Date().toISOString(),
        }),
      });
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Error al actualizar plantilla.' });
    }
  }
);

export default router;
