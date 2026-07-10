import express from 'express';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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

app.post('/api/improve-text', async (req, res) => {
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
    const improved = await callGroq(
      [{ role: 'user', content: `Texto a corregir:\n\n${text}` }],
      systemMsg
    );
    setCache(cacheKey, improved);
    res.json({ success: true, improved });
  } catch (error) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor al mejorar texto.' });
  }
});

app.post('/api/advisor-chat', async (req, res) => {
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

    const cacheKey = getCacheKey('advisor-chat', { message, historyCount: history?.length || 0 });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, reply: cached, cached: true });
    }

    const messages = [];
    if (history && Array.isArray(history)) {
      history.forEach((h) => {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content,
        });
      });
    }
    messages.push({ role: 'user', content: message });
    const reply = await callGroq(messages, systemInstruction);
    setCache(cacheKey, reply);
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Error en el Chat de Consultoría:', error);
    res.status(500).json({ error: error.message || 'Error al procesar su consulta legal.' });
  }
});

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
