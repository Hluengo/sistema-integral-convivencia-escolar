/** Genera un Connect Link de Gmail para la cuenta remitente institucional. */
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const { Composio } = await import("@composio/core");

const userId = process.argv[2] || "colegio";
const composio = new Composio();
const session = await composio.create(userId, {
  toolkits: ["gmail"],
  sandbox: { enable: false },
});
const connectionRequest = await session.authorize("gmail");
console.log("CONNECT_LINK=" + connectionRequest.redirectUrl);
console.log("USER_ID=" + userId);
