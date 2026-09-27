/** Verificacion read-only: lee 1 correo (solo metadatos) con la sesion 'colegio'. */
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const { Composio } = await import("@composio/core");

const composio = new Composio();
const session = await composio.create("colegio", {
  toolkits: ["gmail"],
  sandbox: { enable: false },
});
const result = await session.execute("GMAIL_FETCH_EMAILS", { max_results: 1 });
const data = result?.data ?? result;
const messages = data?.messages ?? data?.emails ?? [];
console.log("OK mensajes:", Array.isArray(messages) ? messages.length : "?");
