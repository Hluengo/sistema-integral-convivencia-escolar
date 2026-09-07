/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/requireTenant.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import {
  requireMembership,
  CONVIVENCIA_MEMBERSHIP,
} from "../../middleware/requireMembership.js";
import type { AuthenticatedRequest } from "../../types.js";
import { requireStr, optStr } from "../validators/sanitizers.js";
import { sendCitacionEmail } from "../services/composio.js";

const router = Router();

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
const MAX_SUBJECT = 200;
const MAX_BODY = 8_000;

export function isValidCitacionEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 320 &&
    EMAIL_RE.test(value.trim())
  );
}

export function getCitacionEmailDomain(email: string): string {
  return email.trim().split("@")[1]?.toLowerCase() ?? "";
}

const MAX_HTML_BYTES = 100_000;
const DANGEROUS_HTML_RE = /<\s*(script|iframe|object|embed|form)\b|on\w+\s*=/i;

export function isSafeDocumentoHtml(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0 || Buffer.byteLength(value, "utf8") > MAX_HTML_BYTES)
    return false;
  return !DANGEROUS_HTML_RE.test(value);
}

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase administrativo no configurado.");
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

router.post(
  "/notificaciones/citacion",
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  requireTenant,
  rateLimit,
  async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const causaId = requireStr(
        {
          id:
            optStr(body, "causaId", 100).trim() ||
            optStr(body, "id", 100).trim(),
        },
        "id",
        100,
      );
      const to = optStr(body, "to", 320).trim();
      const subject = optStr(body, "subject", MAX_SUBJECT).trim();
      const text = optStr(body, "body", MAX_BODY).trim();
      if (!isValidCitacionEmail(to)) {
        res
          .status(400)
          .json({ error: "El destinatario debe ser un correo válido." });
        return;
      }
      if (!subject || !text) {
        res.status(400).json({ error: "Asunto y cuerpo son obligatorios." });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId;
      if (!tenantId) {
        res.status(403).json({
          error: "No fue posible determinar el establecimiento autenticado.",
        });
        return;
      }

      const client = getAdminClient();
      const { data: causa, error: causaError } = await client
        .from("causas")
        .select("id")
        .eq("id", causaId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (causaError || !causa) {
        res
          .status(404)
          .json({ error: "Causa no encontrada en este establecimiento." });
        return;
      }

      let sendResult: unknown;
      try {
        sendResult = await sendCitacionEmail({ to, subject, body: text });
      } catch (sendError) {
        console.error("Error enviando citación vía Composio:", sendError);
        res
          .status(502)
          .json({ error: "No fue posible enviar la citación por correo." });
        return;
      }

      const { error: logError } = await client.from("usage_events").insert({
        event_name: "citacion_email_enviada",
        user_id: authReq.user?.sub ?? null,
        tenant_id: tenantId,
        properties: { causaId, dominio: getCitacionEmailDomain(to) },
      });
      if (logError) {
        console.error("Error registrando envío de citación:", logError);
      }

      res.json({ success: true, result: sendResult });
    } catch (error) {
      console.error("Error en citación:", error);
      res.status(500).json({ error: "Error interno al procesar la citación." });
    }
  },
);

router.post(
  "/notificaciones/documento",
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  requireTenant,
  rateLimit,
  async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const causaId = requireStr(
        {
          id:
            optStr(body, "causaId", 100).trim() ||
            optStr(body, "id", 100).trim(),
        },
        "id",
        100,
      );
      const to = optStr(body, "to", 320).trim();
      const subject = optStr(body, "subject", MAX_SUBJECT).trim();
      const html = optStr(body, "html", MAX_HTML_BYTES).trim();
      if (!isValidCitacionEmail(to)) {
        res
          .status(400)
          .json({ error: "El destinatario debe ser un correo válido." });
        return;
      }
      if (!subject || !isSafeDocumentoHtml(html)) {
        res
          .status(400)
          .json({ error: "Asunto y cuerpo HTML válido son obligatorios." });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId;
      if (!tenantId) {
        res.status(403).json({
          error: "No fue posible determinar el establecimiento autenticado.",
        });
        return;
      }

      const client = getAdminClient();
      const { data: causa, error: causaError } = await client
        .from("causas")
        .select("id")
        .eq("id", causaId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (causaError || !causa) {
        res
          .status(404)
          .json({ error: "Causa no encontrada en este establecimiento." });
        return;
      }

      let sendResult: unknown;
      try {
        sendResult = await sendCitacionEmail({
          to,
          subject,
          body: html,
          isHtml: true,
        });
      } catch (sendError) {
        console.error("Error enviando documento vía Composio:", sendError);
        res
          .status(502)
          .json({ error: "No fue posible enviar el documento por correo." });
        return;
      }

      const { error: logError } = await client.from("usage_events").insert({
        event_name: "notificacion_email_enviada",
        user_id: authReq.user?.sub ?? null,
        tenant_id: tenantId,
        properties: { causaId, dominio: getCitacionEmailDomain(to) },
      });
      if (logError) {
        console.error("Error registrando envío de documento:", logError);
      }

      res.json({ success: true, result: sendResult });
    } catch (error) {
      console.error("Error en envío de documento:", error);
      res
        .status(500)
        .json({ error: "Error interno al procesar el documento." });
    }
  },
);

export default router;
