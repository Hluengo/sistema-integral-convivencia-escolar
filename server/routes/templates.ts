/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { sanitize } from '../lib/validators';

const router = Router();

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

router.get('/document-templates', async (_req, res) => {
  try {
    const result = await fetch(getSupabaseRestUrl('document_templates?select=*&order=doc_type'), {
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY || '',
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });
    if (!result.ok) {
      res.status(result.status).json({ error: `Template fetch failed: ${result.status}` });
      return;
    }
    const data = await result.json();
    res.json(data);
  } catch (_error) {
    res.status(500).json({ error: 'Error al obtener plantillas.' });
  }
});

router.put('/document-templates', requireAuth, async (req, res) => {
  const { id, system_prompt } = req.body;
  if (!id || !system_prompt) {
    return res.status(400).json({ error: 'Campos requeridos: id, system_prompt' });
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
      body: JSON.stringify({ system_prompt: sanitizedPrompt, updated_at: new Date().toISOString() }),
    });
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla.' });
  }
});

export default router;
