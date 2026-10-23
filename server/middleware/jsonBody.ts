/** @license SPDX-License-Identifier: Apache-2.0 */

import express, { type Express } from "express";

export function configureJsonBody(app: Express) {
  // El HTML admite 100.000 bytes; JSON puede escaparlos hasta seis veces.
  app.use("/api/notificaciones/documento", express.json({ limit: "650kb" }));
  app.use(express.json({ limit: "100kb" }));
}
