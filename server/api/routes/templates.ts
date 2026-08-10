/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/requireTenant.js';
import { requireRole } from '../../middleware/requireRole.js';
import { sanitize } from '../validators/sanitizers.js';
import { httpsGet, httpsPatch } from '../lib/https.js';
import type { AuthenticatedRequest } from '../../types.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';

const router = Router();
// Guard acotado al prefijo propio para no interceptar otras rutas /api/*.
router.use('/document-templates', requireAuth, requireMembership(CONVIVENCIA_MEMBERSHIP));
const TEMPLATE_SELECT_PUBLIC = 'id,doc_type,label,updated_at';
const TEMPLATE_SELECT_ADMIN = 'id,doc_type,label,system_prompt,updated_at';
const ACTIVE_TEMPLATE_FILTER = 'doc_type=in.(informe_cierre_indagacion,informe_concluyente)';

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

function authHeaders(req: AuthenticatedRequest): Record<string, string> {
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  return { apikey: anonKey, Authorization: `Bearer ${req.authToken}` };
}

function isTemplateId(value: string): boolean {
  return /^tpl_[a-z0-9_]{3,100}$/i.test(value);
}

router.get('/document-templates', requireTenant, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await httpsGet(
      getSupabaseHostname(),
      `/rest/v1/document_templates?${ACTIVE_TEMPLATE_FILTER}&select=${TEMPLATE_SELECT_PUBLIC}&order=doc_type`,
      authHeaders(authReq),
    );
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Error al obtener plantillas.' });
  }
});

router.get(
  '/document-templates/admin',
  requireTenant,
  requireRole(['superadmin', 'admin', 'direccion']),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = await httpsGet(
        getSupabaseHostname(),
        `/rest/v1/document_templates?${ACTIVE_TEMPLATE_FILTER}&select=${TEMPLATE_SELECT_ADMIN}&order=doc_type`,
        authHeaders(authReq),
      );
      res.json(data);
    } catch {
      res.status(500).json({ error: 'Error al obtener plantillas.' });
    }
  },
);

router.put(
  '/document-templates',
  requireTenant,
  requireRole(['superadmin', 'admin', 'direccion']),
  async (req, res) => {
    const { id, system_prompt } = req.body as { id?: string; system_prompt?: string };
    if (!id || !system_prompt) {
      res.status(400).json({ error: 'Campos requeridos: id, system_prompt' });
      return;
    }

    if (!isTemplateId(id)) {
      res.status(400).json({ error: 'El id de plantilla no es válido.' });
      return;
    }

    if (typeof system_prompt !== 'string' || system_prompt.trim().length === 0) {
      res.status(400).json({ error: 'El system_prompt no puede estar vacío.' });
      return;
    }

    if (system_prompt.length > 20000) {
      res
        .status(400)
        .json({ error: 'El system_prompt excede el máximo permitido (20000 caracteres).' });
      return;
    }

    try {
      const authReq = req as AuthenticatedRequest;
      const serviceRoleKey = getServiceRoleKey();
      if (!serviceRoleKey || !authReq.tenantId) {
        res.status(503).json({ error: 'Servicio de plantillas no configurado.' });
        return;
      }
      const sanitized = sanitize(system_prompt).slice(0, 20000);
      const updated = await httpsPatch(
        getSupabaseHostname(),
        `/rest/v1/document_templates?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${authReq.tenantId}`,
        {
          system_prompt: sanitized,
          updated_at: new Date().toISOString(),
        },
        {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'return=representation',
        },
      );
      if (
        updated.status < 200 ||
        updated.status >= 300 ||
        !Array.isArray(updated.body) ||
        updated.body.length !== 1
      ) {
        res.status(404).json({ error: 'Plantilla no encontrada para el establecimiento actual.' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Error al actualizar plantilla.' });
    }
  },
);

export default router;
