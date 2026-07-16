/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { sanitize } from '../lib/validators';

const router = Router();

router.get('/document-templates', async (_req, res) => {
  try {
    const result = await fetch(
      'https://jjzwwhnofiepvliugowr.supabase.co/rest/v1/document_templates?select=*&order=doc_type',
      {
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );
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
    const sanitizedPrompt = sanitize(system_prompt).slice(0, 20000);
    await fetch(`https://jjzwwhnofiepvliugowr.supabase.co/rest/v1/document_templates?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
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
