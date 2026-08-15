/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/requireTenant.js';
import { requireRole } from '../../middleware/requireRole.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import type { AuthenticatedRequest } from '../../types.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';

type AuthRequest = AuthenticatedRequest;

const router = Router();

const EVENT_NAME_RE = /^[a-z][a-z0-9_]{1,79}$/;
const MAX_PROPERTIES_BYTES = 4_000;

function hasSafeProperties(value: unknown): value is Record<string, unknown> {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_PROPERTIES_BYTES;
  } catch {
    return false;
  }
}

router.post(
  '/usage/events',
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  requireTenant,
  rateLimit,
  async (req, res) => {
    try {
      const { eventName, properties } = req.body;
      if (!eventName || typeof eventName !== 'string' || !EVENT_NAME_RE.test(eventName)) {
        res
          .status(400)
          .json({ error: 'eventName debe usar formato snake_case y tener hasta 80 caracteres.' });
        return;
      }
      if (!hasSafeProperties(properties)) {
        res.status(400).json({ error: 'properties debe ser un objeto JSON de hasta 4 KB.' });
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
      const anonKey =
        process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
      if (!supabaseUrl || !anonKey) {
        res.status(500).json({ error: 'Supabase no configurado' });
        return;
      }

      const authReq = req as AuthRequest;

      const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${authReq.authToken}` } },
      });

      const { error: insertError } = await supabase.from('usage_events').insert({
        event_name: eventName,
        user_id: authReq.user?.sub ?? null,
        tenant_id: authReq.tenantId ?? null,
        properties: properties ?? {},
      });
      if (insertError) {
        console.error('Error logging usage event:', insertError);
        res.status(503).json({ error: 'No fue posible registrar el evento.' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error logging usage event:', error);
      res.status(500).json({ error: 'Error interno al registrar evento.' });
    }
  },
);

router.get(
  '/usage/stats',
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  requireTenant,
  requireRole(['superadmin', 'admin', 'direccion']),
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const since = (authReq.query.since as string) ?? undefined;
      const until = (req.query.until as string) ?? undefined;

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
      const anonKey =
        process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
      if (!supabaseUrl || !anonKey) {
        res.status(500).json({ error: 'Supabase no configurado' });
        return;
      }

      const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${authReq.authToken}` } },
      });

      const params: Record<string, string> = {};
      if (since) params.since = since;
      if (until) params.until = until;

      const { data: eventStats, error: eventError } = await supabase.rpc('get_usage_stats', params);

      if (eventError) {
        console.error('Error fetching usage stats:', eventError);
        res.status(500).json({ error: 'Error al obtener estadísticas.' });
        return;
      }

      const { data: dailyActive, error: dailyError } = await supabase.rpc(
        'get_daily_active_users',
        params,
      );

      if (dailyError) {
        console.error('Error fetching daily active users:', dailyError);
      }

      res.json({
        events: eventStats ?? [],
        dailyActiveUsers: dailyActive ?? [],
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({ error: 'Error interno al obtener estadísticas.' });
    }
  },
);

export default router;
