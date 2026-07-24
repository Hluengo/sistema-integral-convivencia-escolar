/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import type { Request } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/requireTenant';
import { requireRole } from '../middleware/requireRole';

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
}

type AuthRequest = Request & { user: JwtPayload; tenantId?: string; profileRole?: string };

const router = Router();

router.post('/usage/events', requireAuth, async (req, res) => {
  try {
    const { eventName, properties } = req.body;
    if (!eventName || typeof eventName !== 'string') {
      res.status(400).json({ error: 'Campo requerido: eventName (string)' });
      return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Supabase no configurado' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const authReq = req as AuthRequest;

    await supabase.from('usage_events').insert({
      event_name: eventName,
      user_id: authReq.user?.sub ?? null,
      tenant_id: authReq.tenantId ?? null,
      properties: properties ?? {},
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging usage event:', error);
    res.status(500).json({ error: 'Error interno al registrar evento.' });
  }
});

router.get(
  '/usage/stats',
  requireAuth,
  requireTenant,
  requireRole(['admin', 'direccion']),
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const since = (authReq.query.since as string) ?? undefined;
      const until = (req.query.until as string) ?? undefined;

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';
      if (!supabaseUrl || !supabaseKey) {
        res.status(500).json({ error: 'Supabase no configurado' });
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const params: Record<string, string> = {};
      if (since) params.since = since;
      if (until) params.until = until;

      const { data: eventStats, error: eventError } = await supabase.rpc(
        'get_usage_stats',
        params,
      );

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
  }
);

export default router;
