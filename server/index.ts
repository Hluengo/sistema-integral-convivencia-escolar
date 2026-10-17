/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "node:path";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import auditRoutes from "./api/routes/audit";
import draftRoutes from "./api/routes/draft";
import advisorRoutes from "./api/routes/advisor";
import templatesRoutes from "./api/routes/templates";
import processDisciplinaryPdfRoutes from "./api/routes/processDisciplinaryPdf";
import debugRoutes from "./api/routes/debug";
import usageRoutes from "./api/routes/usage";
import pilotRoutes from "./api/routes/pilot";
import adminRoutes from "./api/routes/admin";
import platformRoutes from "./api/routes/platform";
import institutionRoutes from "./api/routes/institution";
import notificacionesRoutes from "./api/routes/notificaciones";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3001", 10);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: allowedOrigins.length > 0,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// API routes — cada módulo aplica su propio rate limit después de autenticar.
app.use("/api", auditRoutes);
app.use("/api", draftRoutes);
app.use("/api", advisorRoutes);
app.use("/api", processDisciplinaryPdfRoutes);

// API routes — sin rate limit (lectura, utilidades)
app.use("/api", templatesRoutes);
app.use("/api", debugRoutes);
app.use("/api", usageRoutes);
app.use("/api", pilotRoutes);
app.use("/api", adminRoutes);
app.use("/api", platformRoutes);
app.use("/api", institutionRoutes);
app.use("/api", notificacionesRoutes);

// Global error handler — must be registered AFTER all routes
app.use(errorHandler);

function ensureJwtConfig() {
  // Fail-fast in production if no legacy JWT secret and no Supabase URL for JWKS.
  if (process.env.NODE_ENV === "production") {
    const hasLegacy = Boolean(
      process.env.SUPABASE_JWT_SECRET &&
      process.env.SUPABASE_JWT_SECRET.length > 0,
    );
    const hasSupabase = Boolean(
      process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.length > 0,
    );
    if (!hasLegacy && !hasSupabase) {
      throw new Error(
        "Missing SUPABASE_JWT_SECRET and VITE_SUPABASE_URL (no JWKS). Aborting startup to avoid running with degraded JWT verification.",
      );
    }
    if (!hasLegacy) {
      // HMAC queda deshabilitado (verifyJwtViaHmac rechaza con secret vacío);
      // la verificación depende de JWKS/ES256 y del fallback a la API de Supabase.
      console.warn(
        "[jwt] SUPABASE_JWT_SECRET no configurado: verificación HMAC deshabilitada; se usará JWKS (ES256) y fallback a Supabase API.",
      );
    }
  }
}

function ensureRuntimeConfig() {
  if (process.env.NODE_ENV === "production") {
    // Sin estas variables las rutas de administración fallan en el primer
    // request: mejor abortar el arranque que quedar a medio andar.
    const missing: string[] = [];
    if (!process.env.VITE_SUPABASE_URL?.trim()) {
      missing.push("VITE_SUPABASE_URL");
    }
    if (
      !(
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
      )?.trim()
    ) {
      missing.push("SUPABASE_SERVICE_ROLE_KEY");
    }
    if (missing.length > 0) {
      throw new Error(
        `Faltan variables de entorno obligatorias: ${missing.join(", ")}. Aborting startup.`,
      );
    }
    if (!process.env.UPSTASH_REDIS_REST_URL?.trim()) {
      // El fallback en memoria no limita nada entre instancias.
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL no configurado en producción: el rate limit en memoria no aplica entre instancias.",
      );
    }
  }
  ensureJwtConfig();
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

ensureRuntimeConfig();
startServer();
