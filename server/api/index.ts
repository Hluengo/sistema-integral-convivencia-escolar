/** @license SPDX-License-Identifier: Apache-2.0 */

import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRuntimeConfig } from "../config/runtime.js";
import { configureJsonBody } from "../middleware/jsonBody.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

ensureRuntimeConfig();

const app = express();
app.set("trust proxy", 1);
app.use(compression());
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://*.posthog.com",
          "https://*.ingest.us.sentry.io",
        ],
        workerSrc: ["'self'", "blob:"],
      },
    },
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
configureJsonBody(app);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

import advisorRoutes from "./routes/advisor.js";
import auditRoutes from "./routes/audit.js";
import draftRoutes from "./routes/draft.js";
import debugRoutes from "./routes/debug.js";
import templatesRoutes from "./routes/templates.js";
import processDisciplinaryPdfRoutes from "./routes/processDisciplinaryPdf.js";
import usageRoutes from "./routes/usage.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import pilotRoutes from "./routes/pilot.js";
import adminRoutes from "./routes/admin.js";
import platformRoutes from "./routes/platform.js";
import institutionRoutes from "./routes/institution.js";
import { errorHandler } from "../middleware/errorHandler.js";

// API routes — cada módulo aplica su propio rate limit después de autenticar.
app.use("/api", advisorRoutes);
app.use("/api", auditRoutes);
app.use("/api", draftRoutes);
app.use("/api", processDisciplinaryPdfRoutes);

// API routes — sin rate limit (lectura, utilidades)
app.use("/api", debugRoutes);
app.use("/api", templatesRoutes);
app.use("/api", usageRoutes);
app.use("/api", notificacionesRoutes);
app.use("/api", pilotRoutes);
app.use("/api", adminRoutes);
app.use("/api", platformRoutes);
app.use("/api", institutionRoutes);

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Global error handler — must be registered after routes and static fallback.
app.use(errorHandler);

export default app;
