// server/api/index.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/api/routes/improve.ts
import { Router } from "express";

// server/api/middleware/auth.ts
import https from "node:https";
async function verifyJwtViaHmac(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return null;
  }
  const signature = Buffer.from(parts[2], "base64url");
  for (const secretBytes of [new TextEncoder().encode(secret), Buffer.from(secret, "base64")]) {
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const valid = await crypto.subtle.verify("HMAC", key, signature, data);
      if (valid) {
        if (payload.exp && payload.exp * 1e3 < Date.now()) return null;
        return payload;
      }
    } catch {
    }
  }
  return null;
}
function verifyViaSupabaseApi(token) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !URL.canParse(supabaseUrl)) {
    return Promise.resolve(null);
  }
  const hostname = new URL(supabaseUrl).hostname;
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        path: "/auth/v1/user",
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, apikey: anonKey }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode !== 200) return resolve(null);
          try {
            const user = JSON.parse(data);
            resolve({ sub: user.id, email: user.email, role: user.role });
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(5e3, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}
async function verifyJwtSignature(token, secret) {
  const hmacResult = await verifyJwtViaHmac(token, secret);
  if (hmacResult) return hmacResult;
  return verifyViaSupabaseApi(token);
}
async function injectTenantContext(req, res) {
  const user = req.user;
  if (!user?.sub) return;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const userId = user.sub;
    const data = await new Promise((resolve) => {
      const r = https.request(
        {
          hostname,
          path: `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=tenant_id&limit=1`,
          method: "GET",
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
        },
        (res2) => {
          let chunks = "";
          res2.on("data", (c) => {
            chunks += c;
          });
          res2.on("end", () => {
            if (res2.statusCode !== 200) return resolve(null);
            try {
              resolve(JSON.parse(chunks));
            } catch {
              resolve(null);
            }
          });
        }
      );
      r.on("error", () => resolve(null));
      r.setTimeout(3e3, () => {
        r.destroy();
        resolve(null);
      });
      r.end();
    });
    if (Array.isArray(data) && data.length > 0 && data[0].tenant_id) {
      req.tenantId = data[0].tenant_id;
      res.setHeader("x-tenant-id", data[0].tenant_id);
    }
  } catch {
  }
}
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Autenticaci\xF3n requerida." });
    return;
  }
  const token = authHeader.replace("Bearer ", "");
  if (token.length < 10) {
    res.status(401).json({ error: "Token inv\xE1lido." });
    return;
  }
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("SUPABASE_JWT_SECRET no configurada");
    res.status(500).json({ error: "Error de configuraci\xF3n del servidor." });
    return;
  }
  try {
    const payload = await verifyJwtSignature(token, JWT_SECRET);
    if (!payload) {
      res.status(401).json({ error: "Token JWT inv\xE1lido o expirado." });
      return;
    }
    req.user = payload;
    await injectTenantContext(req, res);
    next();
  } catch {
    res.status(401).json({ error: "Token JWT inv\xE1lido." });
  }
}

// server/api/validators/sanitizers.ts
var MAX_STR = 1e4;
var sanitize = (s) => {
  if (typeof s !== "string") {
    return "";
  }
  return s.slice(0, MAX_STR).replace(/[\x00-\x1F\x7F-\x9F]/g, "");
};
var requireStr = (obj, key, max = 200) => {
  const v = sanitize(obj[key]);
  if (!v) {
    throw new Error(`Campo requerido faltante: ${key}`);
  }
  return v.slice(0, max);
};
var optStr = (obj, key, max = MAX_STR) => sanitize(obj[key]).slice(0, max);
var optArr = (obj, key) => Array.isArray(obj[key]) ? obj[key] : [];
function sanitizeForAI(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text.replace(/\[INST\]|\[\/INST\]|<<SYS>>|<<\/SYS>>/gi, "").replace(/<\|im_start\|>|<\|im_end\|>/gi, "").replace(/<\|system\|>|<\|user\|>|<\|assistant\|>/gi, "").replace(
    /^(ignore|olvida|disregard|anula).{0,50}(instrucciones|instructions|reglas|rules|sistema|system)/gim,
    ""
  ).replace(
    /(eres|you are|act as|actúa como|actuá como).{0,30}(un|a|el|la|un(a)?\s+abogado|lawyer|juez|judge)/gim,
    ""
  ).replace(/\n{3,}/g, "\n\n").slice(0, MAX_STR);
}

// server/api/services/rateLimit.ts
var RATE_LIMIT = 10;
var RATE_WINDOW = 60 * 1e3;
var rateLimitMap = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  record.count++;
  return true;
}

// server/api/services/cache.ts
import crypto2 from "node:crypto";
var CACHE_TTL = 5 * 60 * 1e3;
var cache = /* @__PURE__ */ new Map();
function getCacheKey(endpoint, body) {
  const hash = crypto2.createHash("sha256");
  hash.update(endpoint);
  hash.update(JSON.stringify(body));
  return hash.digest("hex");
}
function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function setCache(key, value) {
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

// server/api/lib/https.ts
import https2 from "node:https";
function httpsPost(hostname, pathname, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname,
      path: pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers }
    };
    const req = https2.request(opts, (res) => {
      let chunks = "";
      res.on("data", (chunk) => chunks += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 500, body: JSON.parse(chunks) });
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}
function httpsGet(hostname, pathname, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path: pathname,
      method: "GET",
      headers: headers || {}
    };
    const req = https2.request(opts, (res) => {
      let chunks = "";
      res.on("data", (chunk) => chunks += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(chunks));
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}
function httpsPatch(hostname, pathname, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname,
      path: pathname,
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers }
    };
    const req = https2.request(opts, (res) => {
      let chunks = "";
      res.on("data", (chunk) => chunks += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 500, body: JSON.parse(chunks) });
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// server/api/services/groq.ts
var AI_MODEL = "meta-llama/llama-3.1-8b-instruct";
function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY no configurada");
  }
  return key;
}
async function callAI(messages, systemInstruction) {
  const apiKey = getApiKey();
  const body = {
    model: AI_MODEL,
    messages: []
  };
  if (systemInstruction) {
    body.messages.push({ role: "system", content: systemInstruction });
  }
  body.messages.push(...messages);
  const res = await httpsPost("openrouter.ai", "/api/v1/chat/completions", body, {
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://sistema-integral-convivencia-escola.vercel.app",
    "X-Title": "Sistema Integral Convivencia Escolar"
  });
  if (res.status !== 200) {
    const errBody = res.body;
    const aiMsg = errBody?.error?.message || JSON.stringify(errBody);
    throw new Error(`OpenRouter error (${res.status}): ${aiMsg}`);
  }
  const resBody = res.body;
  const choices = resBody?.choices;
  const content = choices?.[0]?.message?.content;
  return content || "";
}

// server/api/routes/improve.ts
var router = Router();
router.post("/improve-text", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "Campo requerido: text" });
      return;
    }
    if (text.length > 5e3) {
      res.status(400).json({ error: "El texto no puede exceder 5000 caracteres." });
      return;
    }
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "L\xEDmite de solicitudes alcanzado. Intente en un minuto." });
      return;
    }
    const cacheKey = getCacheKey("improve-text", { text });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, improved: cached, cached: true });
      return;
    }
    const systemMsg = "Eres un asistente de redacci\xF3n especializado en redacci\xF3n institucional educativa chilena. Tu \xFAnica funci\xF3n es mejorar la ortograf\xEDa, gram\xE1tica, coherencia y redacci\xF3n del texto que el usuario te entrega. Usa siempre un tono neutro, objetivo y sin juicios de valor. No agregues explicaciones, comentarios ni evaluaciones. No respondas preguntas ni interpretes el contenido. Devuelve \xDANICAMENTE el texto corregido, sin ning\xFAn formato adicional ni prefacio.";
    const userContent = sanitizeForAI(text);
    const improved = await callAI(
      [{ role: "user", content: `Texto a corregir:

${userContent}` }],
      systemMsg
    );
    setCache(cacheKey, improved);
    res.json({ success: true, improved });
  } catch (error) {
    console.error("Error al mejorar texto:", error);
    res.status(500).json({ error: "Error interno del servidor al mejorar texto." });
  }
});
var improve_default = router;

// server/api/routes/advisor.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.post("/advisor-chat", requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Campo requerido: message" });
      return;
    }
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "L\xEDmite de solicitudes alcanzado. Intente en un minuto." });
      return;
    }
    const systemInstruction = `Act\xFAas como un Abogado Senior y Experto Legal de la Superintendencia de Educaci\xF3n de Chile, experto en fiscalizaciones aplicadas a establecimientos escolares chilenos. Tu dominio de especialidad abarca:
- Circular N\xB0 482 de la Superintendencia de Educaci\xF3n y la Ley N\xB0 21809, que norman reglamentos internos de convivencia escolar (RIE), debida proporcionalidad, medidas de resguardo inmediatas de NNA, gradualidad y plan de acompa\xF1amiento.
- Ley Aula Segura (Ley N\xB0 21.128 que regula los casos de expulsi\xF3n, suspensi\xF3n provisoria inmediata y plazos fatales).
- Reglamento Interno de Convivencia Escolar (RICE / RIE) y las formalidades indispensables de proporcionalidad, gradualidad y acompa\xF1amiento formativo.

Tus respuestas deben estar redactadas en espa\xF1ol formal de Chile, alineadas con el rigor burocr\xE1tico y legal que evitar\xE1 cargos, multas pecuniarias o recursos judiciales contra el colegio. Cita art\xEDculos cuando corresponda y explica paso a paso c\xF3mo resguardar el "Debido Proceso Escolar" y la integridad mediante medidas de resguardo. Proporciona respuestas muy estructuradas, did\xE1cticas y extremadamente precisas.`;
    const userId = req.user?.sub || "anonymous";
    const cacheKey = getCacheKey("advisor-chat", {
      userId,
      message,
      historyCount: history?.length || 0
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, reply: cached, cached: true });
      return;
    }
    const messages = [];
    if (history && Array.isArray(history)) {
      history.forEach((h) => {
        messages.push({
          role: h.role === "user" ? "user" : "assistant",
          content: sanitizeForAI(h.content)
        });
      });
    }
    messages.push({ role: "user", content: sanitizeForAI(message) });
    const reply = await callAI(messages, systemInstruction);
    setCache(cacheKey, reply);
    res.json({ success: true, reply });
  } catch (error) {
    console.error("Error en el Chat de Consultor\xEDa:", error.message || error);
    const detail = error.message?.includes("GROQ_API_KEY") ? "API key de Groq no configurada en variables de entorno de Vercel." : error.message?.includes("Groq API error") ? `Error de Groq: ${error.message}` : "Error interno del servidor.";
    res.status(500).json({ error: detail });
  }
});
var advisor_default = router2;

// server/api/routes/audit.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.post("/audit-due-process", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const id = requireStr(body, "id", 50);
    const infractionType = requireStr(body, "infractionType", 50);
    const isAulaSegura = Boolean(body.isAulaSegura);
    const checkedItems = optArr(body, "checkedItems");
    const observations = optStr(body, "observations", 5e3);
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "L\xEDmite de solicitudes alcanzado. Intente en un minuto." });
      return;
    }
    const systemPrompt = `Eres un Abogado Experto Legal en Educaci\xF3n Chilena y Fiscalizador de la Superintendencia de Educaci\xF3n, especializado en la Circular N\xB0 482 y Ley N\xB0 21809 de la Superintendencia de Educaci\xF3n (reglamentaci\xF3n de convivencia escolar, debido proceso y medidas de resguardo de NNA) y en la Ley de Aula Segura (Ley 21.128). 
Tu misi\xF3n es auditar un caso de convivencia escolar de un colegio chileno para asegurar su indemnidad jur\xEDdica frente a un posible reclamo o recurso ante la Supereduc o tribunales. Exige siempre el cumplimiento del Debido Proceso (etapas: Recepci\xF3n \u2192 Comunicaci\xF3n/Notificaci\xF3n \u2192 Investigaci\xF3n \u2192 Resoluci\xF3n Fundada \u2192 Reconsideraci\xF3n/Apelaci\xF3n) y la adopci\xF3n prioritaria de Medidas de Resguardo Inmediatas para salvaguardar la integridad de los menores involucrados.

Analiza rigurosamente los siguientes detalles:
- C\xF3digo de causa: ${id}
- Tipo de Infracci\xF3n: ${infractionType} (bajo Reglamento Interno de Convivencia Escolar / RIE)
- Enfoque de Ley de Aula Segura: ${isAulaSegura ? "S\xED (Sometido a Ley Aula Segura - Suspensi\xF3n provisoria, plazo fatal de 10 d\xEDas h\xE1biles de resoluci\xF3n)" : "No (Procedimiento ordinario seg\xFAn RIE, Circular 482 y Ley 21809)"}
- Checklists de Medidas de Resguardo Inmediatas Adoptadas (Circular 482 / Ley 21809):
${JSON.stringify(checkedItems, null, 2)}
- Observaciones:
"${sanitizeForAI(observations)}"

Escribe un an\xE1lisis de auditor\xEDa en formato de informe t\xE9cnico formal en Markdown que incluya:
1. **\xCDndice o Sem\xE1foro Jur\xEDdico de Cumplimiento**: Porcentaje estimado de validez procesal actual (e.g. 70% / Riesgo Medio).
2. **Diagn\xF3stico del Proceso y Medidas de Resguardo**: An\xE1lisis puntual del cumplimiento de las etapas del RIE y la suficiencia de las medidas de resguardo inmediatas de protecci\xF3n aplicadas al NNA.
3. **Brechas y Omisiones Cr\xEDticas (Riesgo Legal ante Supereduc)**: Qu\xE9 falta, qu\xE9 se omiti\xF3 (por ejemplo, si falta dupla psicosocial o plan pedag\xF3gico para casos graves) y qu\xE9 multas arriesga el colegio (e.g., multas UTM al sostenedor por faltas al debido proceso o abandono de medidas de resguardo).
4. **Instrucciones Remediales**: Pasos obligatorios urgentes de resguardo y tramitaci\xF3n para sanear el caso, junto con los plazos reglamentarios vigentes.

Utiliza un tono sumamente profesional, corporativo, t\xE9cnico e institucional (el "vibe" SaaS legal de alto nivel chileno).`;
    const responseText = await callAI([{ role: "user", content: systemPrompt }]);
    res.json({ success: true, report: responseText });
  } catch (error) {
    console.error("Error al auditar debido proceso:", error);
    const status = error.message?.startsWith("Campo requerido") ? 400 : 500;
    res.status(status).json({ error: "Error interno del servidor en auditor\xEDa." });
  }
});
var audit_default = router3;

// server/api/routes/draft.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.post("/draft-document", requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const docType = requireStr(body, "docType", 50);
    const id = requireStr(body, "id", 100);
    const studentName = requireStr(body, "studentName", 200);
    const course = optStr(body, "course", 100);
    const fatherName = optStr(body, "fatherName", 200);
    const managerName = optStr(body, "managerName", 200);
    const infractionType = optStr(body, "infractionType", 100);
    const observations = optStr(body, "observations", 2e3);
    const isAulaSegura = Boolean(body.isAulaSegura);
    const conductaRiceId = optStr(body, "conductaRiceId", 100);
    const runEstudiante = optStr(body, "runEstudiante", 50);
    const fechaApertura = optStr(body, "fechaApertura", 50);
    const estadoActual = optStr(body, "estadoActual", 50);
    const fechaUltimaActualizacion = optStr(body, "fechaUltimaActualizacion", 50);
    const medidasEjecutadas = optArr(body, "medidasEjecutadas");
    const bitacora = optArr(body, "bitacora");
    const checklist = optArr(body, "checklist");
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "L\xEDmite de solicitudes alcanzado. Intente en un minuto." });
      return;
    }
    const safeMedidasEjecutadas = medidasEjecutadas.map((m) => sanitize(m).slice(0, 500)).slice(0, 50);
    const safeBitacora = bitacora.map((b) => ({
      titulo: sanitize(b.titulo).slice(0, 200),
      fecha: sanitize(b.fecha).slice(0, 50),
      tipo: sanitize(b.tipo).slice(0, 50),
      descripcion: sanitize(b.descripcion).slice(0, 2e3),
      participantes: Array.isArray(b.participantes) ? b.participantes.map((p) => sanitize(p).slice(0, 100)).slice(0, 20) : [],
      documentoAdjunto: sanitize(b.documentoAdjunto).slice(0, 200)
    })).slice(0, 100);
    const safeChecklist = checklist.map((c) => ({
      label: sanitize(c.label).slice(0, 300),
      completado: Boolean(c.completado),
      descripcion: sanitize(c.descripcion).slice(0, 1e3),
      requeridoPor: sanitize(c.requeridoPor).slice(0, 100),
      registradoPor: sanitize(c.registradoPor).slice(0, 200),
      fechaCompletado: sanitize(c.fechaCompletado).slice(0, 50),
      observaciones: sanitize(c.observaciones).slice(0, 1e3),
      documentoNombre: sanitize(c.documentoNombre).slice(0, 200)
    })).slice(0, 100);
    const caseDataSection = `
==================== EXPEDIENTE COMPLETO DEL CASO ====================

DATOS GENERALES:
- C\xF3digo de Causa: ${id}
- Estudiante: ${sanitizeForAI(studentName)} (RUN: ${runEstudiante || "No registrado"})
- Curso: ${course}
- Apoderado: ${fatherName}
- Fecha de Apertura: ${fechaApertura || "No registrada"}
- Estado Actual: ${estadoActual || "No registrado"}
- \xDAltima Actualizaci\xF3n: ${fechaUltimaActualizacion || "No registrada"}
- Infracci\xF3n: ${infractionType}
- Encargado: ${managerName}
- Aula Segura: ${isAulaSegura ? "S\xCD - Ley 21.128" : "No"}
- Conducta RICE vinculada: ${conductaRiceId || "Ninguna"}
- Observaciones del caso: "${sanitizeForAI(observations) || "Sin observaciones"}"

MEDIDAS EJECUTADAS:
${safeMedidasEjecutadas.length > 0 ? safeMedidasEjecutadas.map((m) => `- ${m}`).join("\n") : "No se han registrado medidas ejecutadas."}

BIT\xC1CORA COMPLETA DEL EXPEDIENTE:
${safeBitacora.length > 0 ? safeBitacora.map(
      (b) => `
--- Registro: ${b.titulo} ---
  Fecha: ${b.fecha}
  Tipo: ${b.tipo}
  Descripci\xF3n: ${b.descripcion}
  Participantes: ${Array.isArray(b.participantes) ? b.participantes.join(", ") : ""}
  Documento adjunto: ${b.documentoAdjunto || "Ninguno"}`
    ).join("\n") : "No hay registros en la bit\xE1cora."}

CHECKLIST DEL DEBIDO PROCESO:
${safeChecklist.length > 0 ? safeChecklist.map(
      (c) => `
- [${c.completado ? "X" : " "}] ${c.label}
  Estado: ${c.completado ? "COMPLETADO" : "PENDIENTE"}
  Descripci\xF3n: ${c.descripcion || ""}
  Requerido por: ${c.requeridoPor || ""}
  ${c.completado ? `Registrado por: ${c.registradoPor || ""} | Fecha: ${c.fechaCompletado || ""}` : ""}
  ${c.observaciones ? `Observaciones: ${c.observaciones}` : ""}
  ${c.documentoNombre ? `Documento adjunto: ${c.documentoNombre}` : ""}`
    ).join("\n") : "No hay checklist disponible."}

=====================================================================`;
    const caseDataAppendix = `

${caseDataSection}

IMPORTANTE: Utiliza TODOS los antecedentes del expediente proporcionados arriba (bit\xE1cora, checklist, medidas ejecutadas) para fundamentar el documento.`;
    let systemPrompt = "";
    let dbPrompt = null;
    try {
      const templates = await httpsGet(
        "jjzwwhnofiepvliugowr.supabase.co",
        `/rest/v1/document_templates?doc_type=eq.${docType}&select=system_prompt&limit=1`,
        {
          apikey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY ?? ""}`
        }
      );
      if (Array.isArray(templates) && templates.length > 0 && templates[0].system_prompt) {
        dbPrompt = templates[0].system_prompt;
      }
    } catch {
    }
    if (dbPrompt) {
      systemPrompt = dbPrompt;
    } else if (docType === "notificacion_apertura") {
      systemPrompt = `Act\xFAa como un profesional experto en convivencia escolar, normativa educacional chilena, procedimientos disciplinarios, debido proceso y redacci\xF3n institucional.
Redacta una "NOTIFICACI\xD3N DE INICIO DE INDAGACI\xD3N DE CONVIVENCIA ESCOLAR", manteniendo un formato formal, objetivo, descriptivo y jur\xEDdicamente prudente.
DATOS: Estudiante: ${sanitizeForAI(studentName)}, Curso: ${course}, Infracci\xF3n: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Observaciones: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? "S\xED" : "No"}, Apoderado: ${sanitizeForAI(fatherName)}.`;
    } else if (docType === "citacion_entrevista") {
      systemPrompt = `Act\xFAa como un profesional experto en convivencia escolar y redacci\xF3n institucional chilena.
Redacta una "CITACI\xD3N A ENTREVISTA DE DESCARGOS" formal, objetiva y jur\xEDdicamente s\xF3lida.
DATOS: Estudiante: ${sanitizeForAI(studentName)} (Curso: ${course}), Apoderado: ${sanitizeForAI(fatherName)}, Infracci\xF3n: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Hechos: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? "S\xED" : "No"}.`;
    } else if (docType === "informe_cierre_indagacion") {
      systemPrompt = `Act\xFAa como un especialista en convivencia escolar y normativa educacional chilena.
Elabora un INFORME DE CIERRE DE INDAGACI\xD3N DISCIPLINARIA con nivel t\xE9cnico-profesional.
DATOS: Estudiante: ${sanitizeForAI(studentName)} (Curso: ${course}), Apoderado: ${sanitizeForAI(fatherName)}, C\xF3digo: ${id}, Infracci\xF3n: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Contexto: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? "S\xED" : "No"}.`;
    } else if (docType === "informe_concluyente") {
      systemPrompt = `Act\xFAa como un equipo interdisciplinario (abogado educacional, experto convivencia escolar, auditor debido proceso).
Elabora un INFORME CONCLUYENTE DISCIPLINARIO Y FORMATIVO INTEGRAL.
DATOS: C\xF3digo: ${id}, Estudiante: ${sanitizeForAI(studentName)} (Curso: ${course}), Apoderado: ${sanitizeForAI(fatherName)}, Infracci\xF3n: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Contexto: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? "S\xED (Ley 21.128)" : "No"}.`;
    } else {
      res.status(400).json({
        error: "docType no v\xE1lido. Use: notificacion_apertura, citacion_entrevista, informe_cierre_indagacion, informe_concluyente"
      });
      return;
    }
    const responseText = await callAI([
      { role: "user", content: systemPrompt + caseDataAppendix }
    ]);
    res.json({ success: true, document: responseText });
  } catch (error) {
    console.error("Error al generar borrador de documento:", error);
    const status = error.message?.startsWith("Campo requerido") ? 400 : 500;
    res.status(status).json({ error: "Error interno del servidor al redactar documento." });
  }
});
var draft_default = router4;

// server/api/routes/debug.ts
import { Router as Router5 } from "express";
import crypto3 from "node:crypto";
var router5 = Router5();
router5.get("/auth-debug", async (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
  const info = {
    hasToken: token.length > 10,
    hasSecret: !!JWT_SECRET,
    secretLength: JWT_SECRET ? JWT_SECRET.length : 0,
    tokenParts: token.split(".").length
  };
  if (info.hasToken && JWT_SECRET) {
    const parts = token.split(".");
    const sig = Buffer.from(parts[2], "base64url");
    const rawKey = new TextEncoder().encode(JWT_SECRET);
    const b64Key = Buffer.from(JWT_SECRET, "base64");
    try {
      const k1 = await crypto3.subtle.importKey(
        "raw",
        rawKey,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      info.rawSecretWorks = await crypto3.subtle.verify(
        "HMAC",
        k1,
        sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      );
    } catch {
      info.rawSecretWorks = false;
    }
    try {
      const k2 = await crypto3.subtle.importKey(
        "raw",
        b64Key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      info.b64SecretWorks = await crypto3.subtle.verify(
        "HMAC",
        k2,
        sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      );
    } catch {
      info.b64SecretWorks = false;
    }
  }
  res.json(info);
});
var debug_default = router5;

// server/api/routes/templates.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/document-templates", async (_req, res) => {
  try {
    const data = await httpsGet(
      "jjzwwhnofiepvliugowr.supabase.co",
      "/rest/v1/document_templates?select=*&order=doc_type",
      {
        apikey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY ?? ""}`
      }
    );
    res.json(data);
  } catch {
    res.status(500).json({ error: "Error al obtener plantillas." });
  }
});
router6.put("/document-templates", requireAuth, async (req, res) => {
  const { id, system_prompt } = req.body;
  if (!id || !system_prompt) {
    res.status(400).json({ error: "Campos requeridos: id, system_prompt" });
    return;
  }
  try {
    const sanitized = sanitize(system_prompt).slice(0, 2e4);
    await httpsPatch(
      "jjzwwhnofiepvliugowr.supabase.co",
      `/rest/v1/document_templates?id=eq.${id}`,
      {
        system_prompt: sanitized,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
        Prefer: "return=minimal"
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ error: "Error al actualizar plantilla." });
  }
});
var templates_default = router6;

// server/api/routes/parse.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.post("/parse-annotations", async (req, res) => {
  try {
    const { textContent } = req.body;
    if (!textContent || !textContent.trim()) {
      res.status(400).json({ error: "No se recibi\xF3 el texto extra\xEDdo del PDF." });
      return;
    }
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: "L\xEDmite de solicitudes alcanzado. Intente en un minuto." });
      return;
    }
    let cleanText = textContent.replace(/\n{3,}/g, "\n\n").replace(/\s{3,}/g, "  ").replace(/P\xE1gina\s*\d+.*/gi, "").trim();
    const MAX_LENGTH = 25000;
    if (cleanText.length > MAX_LENGTH) {
      cleanText = cleanText.slice(0, MAX_LENGTH) + "\n\n[Documento truncado por exceder el límite de procesamiento]";
      console.warn(`Texto truncado de ${textContent.length} a ${MAX_LENGTH} caracteres`);
    }
    const systemInstruction = `Extrae TODAS las anotaciones de este texto de hoja de vida estudiantil. Cada línea que empieza con fecha DD/MM/AAAA es una anotación distinta.

Formato esperado: [FECHA] Profesor: [nombre] Tipo: [Información|Positiva|Negativa] Categoria: [categoría] Anotación: [descripción]

Devuelve SOLO un array JSON con estos campos:
- text: descripción completa
- date: YYYY-MM-DD
- registered_by: nombre del profesor o "Inspectoría"
- type: "Información", "Positiva" o "Negativa"

No inventes anotaciones. Devuelve SOLO el JSON, sin explicaciones.`;
    const messages = [
      {
        role: "user",
        content: `Extrae TODAS las anotaciones:\n\n${cleanText}`
      }
    ];
    const responseText = await callAI(messages, systemInstruction).catch(err => {
      console.error("Groq API error:", err.message);
      throw new Error("El servicio de IA no pudo procesar el documento. Si el PDF es escaneado o tiene im\u00E1genes, convi\u00E9rtelo a texto primero.");
    });
    let annotations = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        annotations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing Groq response as JSON:", parseError);
    }
    res.json({ success: true, annotations });
  } catch (error) {
    console.error("Error al analizar documento:", error);
    const msg = error instanceof Error ? error.message : "Error interno al procesar el archivo.";
    res.status(500).json({ error: msg });
  }
});
var parse_default = router7;

// server/api/routes/usage.ts
import { Router as Router8 } from "express";
var router8 = Router8();
router8.post("/usage/events", requireAuth, async (req, res) => {
  try {
    const { eventName, properties } = req.body;
    if (!eventName || typeof eventName !== "string") {
      res.status(400).json({ error: "Campo requerido: eventName (string)" });
      return;
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? "";
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: "Supabase no configurado" });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    const authReq = req;
    await supabase.from("usage_events").insert({
      event_name: eventName,
      user_id: authReq.user?.sub ?? null,
      properties: properties ?? {}
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error logging usage event:", error);
    res.status(500).json({ error: "Error interno al registrar evento." });
  }
});
router8.get("/usage/stats", requireAuth, async (req, res) => {
  try {
    const authReq = req;
    const since = authReq.query.since ?? void 0;
    const until = req.query.until ?? void 0;
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? "";
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: "Supabase no configurado" });
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    const params = {};
    if (since) params.since = since;
    if (until) params.until = until;
    const { data: eventStats, error: eventError } = await supabase.rpc(
      "get_usage_stats",
      params
    );
    if (eventError) {
      console.error("Error fetching usage stats:", eventError);
      res.status(500).json({ error: "Error al obtener estad\xEDsticas." });
      return;
    }
    const { data: dailyActive, error: dailyError } = await supabase.rpc(
      "get_daily_active_users",
      params
    );
    if (dailyError) {
      console.error("Error fetching daily active users:", dailyError);
    }
    res.json({
      events: eventStats ?? [],
      dailyActiveUsers: dailyActive ?? []
    });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    res.status(500).json({ error: "Error interno al obtener estad\xEDsticas." });
  }
});
var usage_default = router8;

// server/api/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.use(express.json({ limit: "512kb" }));
app.use("/api", improve_default);
app.use("/api", advisor_default);
app.use("/api", audit_default);
app.use("/api", draft_default);
app.use("/api", debug_default);
app.use("/api", templates_default);
app.use("/api", parse_default);
app.use("/api", usage_default);
var distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
var index_default = app;
export {
  index_default as default
};
/** @license SPDX-License-Identifier: Apache-2.0 */
