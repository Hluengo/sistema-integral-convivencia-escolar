/** @license SPDX-License-Identifier: Apache-2.0 */

import { Composio } from "@composio/core";

// Nota: sin dotenv aquí (patrón de gemini.ts): el bootstrap de server/index.ts
// carga .env/.env.local y los scripts lo hacen antes de importar el servicio.

/** Identidad de la cuenta remitente institucional en Composio. */
export const COMPOSIO_SENDER_USER_ID = "colegio";

let cachedSession: Awaited<ReturnType<Composio["create"]>> | null = null;

function requireApiKey(): void {
  if (!process.env.COMPOSIO_API_KEY) {
    throw new Error(
      "Composio no configurado: falta COMPOSIO_API_KEY en .env.local.",
    );
  }
}

export async function getComposioSession() {
  requireApiKey();
  if (!cachedSession) {
    const composio = new Composio();
    cachedSession = await composio.create(COMPOSIO_SENDER_USER_ID, {
      toolkits: ["gmail"],
      sandbox: { enable: false },
    });
  }
  return cachedSession;
}

export interface CitacionEmail {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export async function sendCitacionEmail({
  to,
  subject,
  body,
  isHtml,
}: CitacionEmail): Promise<unknown> {
  const session = await getComposioSession();
  return session.execute("GMAIL_SEND_EMAIL", {
    recipient_email: to,
    subject,
    body,
    ...(isHtml ? { is_html: true } : {}),
  });
}
