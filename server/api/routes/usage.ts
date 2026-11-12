/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/requireTenant.js";
import { requireRole } from "../../middleware/requireRole.js";
import type { AuthenticatedRequest } from "../../types.js";
import {
  requireMembership,
  CONVIVENCIA_MEMBERSHIP,
} from "../../middleware/requireMembership.js";

type AuthRequest = AuthenticatedRequest;

const router = Router();
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDateOnly(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY_RE.test(value);
}

router.get(
  "/usage/stats",
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  requireTenant,
  requireRole(["superadmin", "admin", "direccion"]),
  async (req, res) => {
    try {
      const since = (req.query.since as string) ?? undefined;
      const until = (req.query.until as string) ?? undefined;
      if (
        (since !== undefined && !validDateOnly(since)) ||
        (until !== undefined && !validDateOnly(until)) ||
        (since && until && since > until)
      ) {
        res.status(400).json({ error: "Rango de fechas inválido." });
        return;
      }
      const tenantId = (req as AuthRequest).tenantId;
      if (!tenantId) {
        res.status(400).json({ error: "Establecimiento no determinado." });
        return;
      }

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl =
        process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
      const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SERVICE_KEY ??
        "";
      if (!supabaseUrl || !serviceRoleKey) {
        res
          .status(503)
          .json({ error: "Servicio de estadísticas no configurado." });
        return;
      }

      // La autorización ya fue resuelta por requireAuth + membership + tenant + role.
      // Las RPC de estadísticas están deliberadamente restringidas a service_role
      // y reciben el colegio para no mezclar métricas entre establecimientos.
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const params: Record<string, string> = { p_tenant_id: tenantId };
      if (since) params.since = since;
      if (until) params.until = until;

      const { data: eventStats, error: eventError } = await supabase.rpc(
        "get_usage_stats",
        params,
      );
      if (eventError) {
        console.error("Error fetching usage stats:", eventError);
        res.status(500).json({ error: "Error al obtener estadísticas." });
        return;
      }

      const { data: dailyActive, error: dailyError } = await supabase.rpc(
        "get_daily_active_users",
        params,
      );
      if (dailyError) {
        console.error("Error fetching daily active users:", dailyError);
        res.status(500).json({ error: "Error al obtener usuarios activos." });
        return;
      }

      res.json({
        events: eventStats ?? [],
        dailyActiveUsers: dailyActive ?? [],
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ error: "Error interno al obtener estadísticas." });
    }
  },
);

export default router;
