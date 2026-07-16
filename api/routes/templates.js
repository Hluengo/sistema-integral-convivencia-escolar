import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitize } from '../lib/validators.js';
import { httpsGet, httpsPatch } from '../lib/https.js';

const router = Router();

router.get('/document-templates', async (_req, res) => {
  try {
    const data = await httpsGet(
      'jjzwwhnofiepvliugowr.supabase.co',
      '/rest/v1/document_templates?select=*&order=doc_type',
      {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      }
    );
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
    await httpsPatch(
      'jjzwwhnofiepvliugowr.supabase.co',
      `/rest/v1/document_templates?id=eq.${id}`,
      {
        system_prompt: sanitizedPrompt,
        updated_at: new Date().toISOString(),
      },
      {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla.' });
  }
});

export default router;
