import express from 'express';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import * as jose from 'jose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '512kb' }));

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// In-memory cache with TTL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCacheKey(endpoint, body) {
  const hash = crypto.createHash('sha256');
  hash.update(endpoint);
  hash.update(JSON.stringify(body));
  return hash.digest('hex');
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
    cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

// Rate limiting
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000; // 1 minute
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY no configurada');
  return key;
}

// Input validation & sanitization helpers
const MAX_STR = 10000;
const sanitize = (s) => {
  if (typeof s !== 'string') return '';
  return s.slice(0, MAX_STR).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
};
const requireStr = (obj, key, max = 200) => {
  const v = sanitize(obj[key]);
  if (!v) throw new Error(`Campo requerido faltante: ${key}`);
  return v.slice(0, max);
};
const optStr = (obj, key, max = MAX_STR) => sanitize(obj[key]).slice(0, max);
const optArr = (obj, key) => Array.isArray(obj[key]) ? obj[key] : [];

// Prompt injection sanitizer: escapes or strips patterns that could manipulate AI output
function sanitizeForAI(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Strip common prompt injection markers
    .replace(/\[INST\]|\[\/INST\]|<<SYS>>|<<\/SYS>>/gi, '')
    .replace(/<\|im_start\|>|<\|im_end\|>/gi, '')
    .replace(/<\|system\|>|<\|user\|>|<\|assistant\|>/gi, '')
    // Strip instruction override attempts
    .replace(/^(ignore|olvida|disregard|anula).{0,50}(instrucciones|instructions|reglas|rules|sistema|system)/gim, '')
    // Strip role injection attempts
    .replace(/(eres|you are|act as|actúa como|actuá como).{0,30}(un|a|el|la|un(a)?\s+abogado|lawyer|juez|judge)/gim, '')
    // Collapse excessive whitespace/newlines
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, MAX_STR);
}

// Auth middleware: verify Supabase JWT from Authorization header
async function verifyJwtSignature(token, secret) {
  try {
    // Use jose library which supports ES256 (Supabase's new JWT signing algorithm)
    const secretBytes = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretBytes, {
      algorithms: ['HS256', 'ES256']
    });
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch (e) {
    // Try legacy HMAC verification as fallback
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const signature = Buffer.from(parts[2], 'base64url');
      const secretBytes = Buffer.from(secret, 'base64');
      const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const valid = await crypto.subtle.verify('HMAC', key, signature, data);
      if (!valid) return null;
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida.' });
  }
  const token = authHeader.replace('Bearer ', '');
  if (token.length < 10) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('SUPABASE_JWT_SECRET no configurada');
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  try {
    const payload = await verifyJwtSignature(token, JWT_SECRET);
    if (!payload) {
      return res.status(401).json({ error: 'Token JWT inválido o expirado.' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token JWT inválido.' });
  }
}

function httpsPost(hostname, pathname, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname,
      path: pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (chunk) => chunks += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch { reject(new Error(`HTTP ${res.statusCode}: ${chunks}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function callGroq(messages, systemInstruction) {
  const apiKey = getApiKey();
  const body = { model: GROQ_MODEL, messages: [] };
  if (systemInstruction) {
    body.messages.push({ role: 'system', content: systemInstruction });
  }
  body.messages.push(...messages);
  const res = await httpsPost('api.groq.com', '/openai/v1/chat/completions', body, {
    'Authorization': `Bearer ${apiKey}`,
  });
  if (res.status !== 200) {
    throw new Error(`Groq API error: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body?.choices?.[0]?.message?.content || '';
}

app.post('/api/improve-text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Campo requerido: text' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'El texto no puede exceder 5000 caracteres.' });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const cacheKey = getCacheKey('improve-text', { text });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, improved: cached, cached: true });
    }

    const systemMsg = 'Eres un asistente de redacción especializado en redacción institucional educativa chilena. Tu única función es mejorar la ortografía, gramática, coherencia y redacción del texto que el usuario te entrega. Usa siempre un tono neutro, objetivo y sin juicios de valor. No agregues explicaciones, comentarios ni evaluaciones. No respondas preguntas ni interpretes el contenido. Devuelve ÚNICAMENTE el texto corregido, sin ningún formato adicional ni prefacio.';
    const userContent = sanitizeForAI(text);
    const improved = await callGroq(
      [{ role: 'user', content: `Texto a corregir:\n\n${userContent}` }],
      systemMsg
    );
    setCache(cacheKey, improved);
    res.json({ success: true, improved });
  } catch (error) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
  }
});

app.post('/api/advisor-chat', requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Campo requerido: message' });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const systemInstruction = `Actúas como un Abogado Senior y Experto Legal de la Superintendencia de Educación de Chile, experto en fiscalizaciones aplicadas a establecimientos escolares chilenos. Tu dominio de especialidad abarca:
- Circular N° 482 de la Superintendencia de Educación y la Ley N° 21809, que norman reglamentos internos de convivencia escolar (RIE), debida proporcionalidad, medidas de resguardo inmediatas de NNA, gradualidad y plan de acompañamiento.
- Ley Aula Segura (Ley N° 21.128 que regula los casos de expulsión, suspensión provisoria inmediata y plazos fatales).
- Reglamento Interno de Convivencia Escolar (RICE / RIE) y las formalidades indispensables de proporcionalidad, gradualidad y acompañamiento formativo.

Tus respuestas deben estar redactadas en español formal de Chile, alineadas con el rigor burocrático y legal que evitará cargos, multas pecuniarias o recursos judiciales contra el colegio. Cita artículos cuando corresponda y explica paso a paso cómo resguardar el "Debido Proceso Escolar" y la integridad mediante medidas de resguardo. Proporciona respuestas muy estructuradas, didácticas y extremadamente precisas.`;

    const userId = req.user?.sub || 'anonymous';
    const cacheKey = getCacheKey('advisor-chat', { userId, message, historyCount: history?.length || 0 });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, reply: cached, cached: true });
    }

    const messages = [];
    if (history && Array.isArray(history)) {
      history.forEach((h) => {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: sanitizeForAI(h.content),
        });
      });
    }
    messages.push({ role: 'user', content: sanitizeForAI(message) });
    const reply = await callGroq(messages, systemInstruction);
    setCache(cacheKey, reply);
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Error en el Chat de Consultoría:', error.message || error);
    const detail = error.message?.includes('GROQ_API_KEY') 
      ? 'API key de Groq no configurada en variables de entorno de Vercel.'
      : error.message?.includes('Groq API error')
        ? `Error de Groq: ${error.message}`
        : 'Error interno del servidor.';
    res.status(500).json({ error: detail });
  }
});

// Endpoint: Audit due process compliance of a case
app.post('/api/audit-due-process', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const id = requireStr(body, 'id', 50);
    const studentName = optStr(body, 'studentName', 200);
    const course = optStr(body, 'course', 100);
    const infractionType = requireStr(body, 'infractionType', 50);
    const isAulaSegura = Boolean(body.isAulaSegura);
    const checkedItems = optArr(body, 'checkedItems');
    const observations = optStr(body, 'observations', 5000);

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const systemPrompt = `Eres un Abogado Experto Legal en Educación Chilena y Fiscalizador de la Superintendencia de Educación, especializado en la Circular N° 482 y Ley N° 21809 de la Superintendencia de Educación (reglamentación de convivencia escolar, debido proceso y medidas de resguardo de NNA) y en la Ley de Aula Segura (Ley 21.128). 
Tu misión es auditar un caso de convivencia escolar de un colegio chileno para asegurar su indemnidad jurídica frente a un posible reclamo o recurso ante la Supereduc o tribunales. Exige siempre el cumplimiento del Debido Proceso (etapas: Recepción → Comunicación/Notificación → Investigación → Resolución Fundada → Reconsideración/Apelación) y la adopción prioritaria de Medidas de Resguardo Inmediatas para salvaguardar la integridad de los menores involucrados.

Analiza rigurosamente los siguientes detalles:
- Código de causa: ${id}
- Tipo de Infracción: ${infractionType} (bajo Reglamento Interno de Convivencia Escolar / RIE)
- Enfoque de Ley de Aula Segura: ${isAulaSegura ? 'Sí (Sometido a Ley Aula Segura - Suspensión provisoria, plazo fatal de 10 días hábiles de resolución)' : 'No (Procedimiento ordinario según RIE, Circular 482 y Ley 21809)'}
- Checklists de Medidas de Resguardo Inmediatas Adoptadas (Circular 482 / Ley 21809):
${JSON.stringify(checkedItems, null, 2)}
- Observaciones:
"${sanitizeForAI(observations)}"

Escribe un análisis de auditoría en formato de informe técnico formal en Markdown que incluya:
1. **Índice o Semáforo Jurídico de Cumplimiento**: Porcentaje estimado de validez procesal actual (e.g. 70% / Riesgo Medio).
2. **Diagnóstico del Proceso y Medidas de Resguardo**: Análisis puntual del cumplimiento de las etapas del RIE y la suficiencia de las medidas de resguardo inmediatas de protección aplicadas al NNA.
3. **Brechas y Omisiones Críticas (Riesgo Legal ante Supereduc)**: Qué falta, qué se omitió (por ejemplo, si falta dupla psicosocial o plan pedagógico para casos graves) y qué multas arriesga el colegio (e.g., multas UTM al sostenedor por faltas al debido proceso o abandono de medidas de resguardo).
4. **Instrucciones Remediales**: Pasos obligatorios urgentes de resguardo y tramitación para sanear el caso, junto con los plazos reglamentarios vigentes.

Utiliza un tono sumamente profesional, corporativo, técnico e institucional (el "vibe" SaaS legal de alto nivel chileno).`;

    const responseText = await callGroq([{ role: 'user', content: systemPrompt }]);
    res.json({ success: true, report: responseText });
  } catch (error) {
    console.error('Error al auditar debido proceso:', error);
    const status = error.message?.startsWith('Campo requerido') ? 400 : 500;
    res.status(status).json({ error: 'Error interno del servidor en auditoría.' });
  }
});

// Endpoint: Draft official documents based on Circular 482 / Ley 21809
app.post('/api/draft-document', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const docType = requireStr(body, 'docType', 50);
    const id = requireStr(body, 'id', 100);
    const studentName = requireStr(body, 'studentName', 200);
    const course = optStr(body, 'course', 100);
    const fatherName = optStr(body, 'fatherName', 200);
    const managerName = optStr(body, 'managerName', 200);
    const infractionType = optStr(body, 'infractionType', 100);
    const observations = optStr(body, 'observations', 2000);
    const isAulaSegura = Boolean(body.isAulaSegura);
    const conductaRiceId = optStr(body, 'conductaRiceId', 100);
    const runEstudiante = optStr(body, 'runEstudiante', 50);
    const nnaProtectedName = optStr(body, 'nnaProtectedName', 200);
    const fechaApertura = optStr(body, 'fechaApertura', 50);
    const estadoActual = optStr(body, 'estadoActual', 50);
    const fechaUltimaActualizacion = optStr(body, 'fechaUltimaActualizacion', 50);
    const medidasEjecutadas = optArr(body, 'medidasEjecutadas');
    const bitacora = optArr(body, 'bitacora');
    const checklist = optArr(body, 'checklist');

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const safeMedidasEjecutadas = medidasEjecutadas
      .map((m) => sanitize(m).slice(0, 500))
      .slice(0, 50);
    const safeBitacora = bitacora
      .map((b) => {
        const r = b;
        return {
          titulo: sanitize(r.titulo).slice(0, 200),
          fecha: sanitize(r.fecha).slice(0, 50),
          tipo: sanitize(r.tipo).slice(0, 50),
          descripcion: sanitize(r.descripcion).slice(0, 2000),
          participantes: Array.isArray(r.participantes)
            ? r.participantes.map((p) => sanitize(p).slice(0, 100)).slice(0, 20)
            : [],
          documentoAdjunto: sanitize(r.documentoAdjunto).slice(0, 200)
        };
      })
      .slice(0, 100);
    const safeChecklist = checklist
      .map((c) => {
        const r = c;
        return {
          label: sanitize(r.label).slice(0, 300),
          completado: Boolean(r.completado),
          descripcion: sanitize(r.descripcion).slice(0, 1000),
          requeridoPor: sanitize(r.requeridoPor).slice(0, 100),
          registradoPor: sanitize(r.registradoPor).slice(0, 200),
          fechaCompletado: sanitize(r.fechaCompletado).slice(0, 50),
          observaciones: sanitize(r.observaciones).slice(0, 1000),
          documentoNombre: sanitize(r.documentoNombre).slice(0, 200)
        };
      })
      .slice(0, 100);

    const caseDataSection = `
==================== EXPEDIENTE COMPLETO DEL CASO ====================

DATOS GENERALES:
- Código de Causa: ${id}
- Estudiante: ${sanitizeForAI(studentName)} (RUN: ${runEstudiante || 'No registrado'})
- Curso: ${course}
- Apoderado: ${fatherName}
- Fecha de Apertura: ${fechaApertura || 'No registrada'}
- Estado Actual: ${estadoActual || 'No registrado'}
- Última Actualización: ${fechaUltimaActualizacion || 'No registrada'}
- Infracción: ${infractionType}
- Encargado: ${managerName}
- Aula Segura: ${isAulaSegura ? 'SÍ - Ley 21.128' : 'No'}
- Conducta RICE vinculada: ${conductaRiceId || 'Ninguna'}
- Observaciones del caso: "${sanitizeForAI(observations) || 'Sin observaciones'}"

MEDIDAS EJECUTADAS:
${safeMedidasEjecutadas.length > 0 ? safeMedidasEjecutadas.map((m) => `- ${m}`).join('\n') : 'No se han registrado medidas ejecutadas.'}

BITÁCORA COMPLETA DEL EXPEDIENTE:
${safeBitacora.length > 0 ? safeBitacora.map((b) => `
--- Registro: ${b.titulo} ---
  Fecha: ${b.fecha}
  Tipo: ${b.tipo}
  Descripción: ${b.descripcion}
  Participantes: ${b.participantes.join(', ')}
  Documento adjunto: ${b.documentoAdjunto || 'Ninguno'}`).join('\n') : 'No hay registros en la bitácora.'}

CHECKLIST DEL DEBIDO PROCESO:
${safeChecklist.length > 0 ? safeChecklist.map((c) => `
- [${c.completado ? 'X' : ' '}] ${c.label}
  Estado: ${c.completado ? 'COMPLETADO' : 'PENDIENTE'}
  Descripción: ${c.descripcion || ''}
  Requerido por: ${c.requeridoPor || ''}
  ${c.completado ? `Registrado por: ${c.registradoPor || ''} | Fecha: ${c.fechaCompletado || ''}` : ''}
  ${c.observaciones ? `Observaciones: ${c.observaciones}` : ''}
  ${c.documentoNombre ? `Documento adjunto: ${c.documentoNombre}` : ''}`).join('\n') : 'No hay checklist disponible.'}

=====================================================================`;

    const caseDataAppendix = `\n\n${caseDataSection}\n\nIMPORTANTE: Utiliza TODOS los antecedentes del expediente proporcionados arriba (bitácora, checklist, medidas ejecutadas) para fundamentar el documento.`;

    let systemPrompt = '';

    if (docType === 'notificacion_apertura') {
      systemPrompt = `Actúa como un profesional experto en convivencia escolar, normativa educacional chilena, procedimientos disciplinarios, debido proceso y redacción institucional.
Redacta una "NOTIFICACIÓN DE INICIO DE INDAGACIÓN DE CONVIVENCIA ESCOLAR", manteniendo un formato formal, objetivo, descriptivo y jurídicamente prudente.
La notificación debe respetar los principios de: presunción de inocencia, debido proceso, derecho a defensa, interés superior del estudiante, confidencialidad, protección de datos personales, ausencia de sesgos.
Utiliza expresiones como: "presunta participación", "eventual responsabilidad", "antecedentes que ameritan indagación".
DATOS: Estudiante: ${sanitizeForAI(studentName)}, Curso: ${course}, Infracción: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Observaciones: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? 'Sí' : 'No'}, Apoderado: ${sanitizeForAI(fatherName)}.`;
    } else if (docType === 'citacion_entrevista') {
      systemPrompt = `Actúa como un profesional experto en convivencia escolar y redacción institucional chilena.
Redacta una "CITACIÓN A ENTREVISTA DE DESCARGOS" formal, objetiva y jurídicamente sólida.
DATOS: Estudiante: ${sanitizeForAI(studentName)} (Curso: ${course}), Apoderado: ${sanitizeForAI(fatherName)}, Infracción: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Hechos: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? 'Sí' : 'No'}.`;
    } else if (docType === 'informe_cierre_indagacion') {
      systemPrompt = `Actúa como un especialista en convivencia escolar y normativa educacional chilena.
Elabora un INFORME DE CIERRE DE INDAGACIÓN DISCIPLINARIA con nivel técnico-profesional.
DATOS: Estudiante: ${sanitizeForAI(studentName)} (Curso: ${course}), Apoderado: ${sanitizeForAI(fatherName)}, Código: ${id}, Infracción: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Contexto: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? 'Sí' : 'No'}.
Incluir: resumen ejecutivo, relación técnica de hechos, análisis de descargos, hechos acreditados, auditoría de debido proceso, calificación jurídica, propuesta de medidas (disciplinarias, formativas, reparatorias), conclusiones.`;
    } else if (docType === 'informe_concluyente') {
      systemPrompt = `Actúa como un equipo interdisciplinario (abogado educacional, experto convivencia escolar, auditor debido proceso).
Elabora un INFORME CONCLUYENTE DISCIPLINARIO Y FORMATIVO INTEGRAL.
DATOS: Código: ${id}, Estudiante: ${sanitizeForAI(studentName)} (Curso: ${course}), Apoderado: ${sanitizeForAI(fatherName)}, Infracción: ${sanitizeForAI(infractionType)}, Encargado: ${sanitizeForAI(managerName)}, Contexto: ${sanitizeForAI(observations)}, Aula Segura: ${isAulaSegura ? 'Sí (Ley 21.128)' : 'No'}.
Incluir: resumen ejecutivo, reconstrucción fáctica, análisis probatorio, descargos, trayectoria conductual, auditoría debido proceso, tipificación normativa, resolución fundada, matriz de medidas, plan de seguimiento, conclusiones.`;
    } else {
      return res.status(400).json({ error: 'docType no válido. Use: notificacion_apertura, citacion_entrevista, informe_cierre_indagacion, informe_concluyente' });
    }

    const responseText = await callGroq([{ role: 'user', content: systemPrompt + caseDataAppendix }]);
    res.json({ success: true, document: responseText });
  } catch (error) {
    console.error('Error al generar borrador de documento:', error);
    const status = error.message?.startsWith('Campo requerido') ? 400 : 500;
    res.status(status).json({ error: 'Error interno del servidor al redactar documento.' });
  }
});

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
