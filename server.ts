/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(compression());
app.use(express.json());

// Auth middleware: verify Supabase JWT from Authorization header
async function verifyJwtSignature(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const signature = Buffer.from(parts[2], 'base64url');

  // Import the secret as a CryptoKey for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Verify signature
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify('HMAC', key, signature, data);

  if (!valid) return null;

  // Check expiration
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;

  return payload;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
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
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token JWT inválido.' });
  }
}

// Input validation & sanitization helpers
const MAX_STR = 10000;
const sanitize = (s: unknown): string => {
  if (typeof s !== 'string') return '';
  return s.slice(0, MAX_STR).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
};
const requireStr = (obj: Record<string, unknown>, key: string, max = 200): string => {
  const v = sanitize(obj[key]);
  if (!v) throw new Error(`Campo requerido faltante: ${key}`);
  return v.slice(0, max);
};
const optStr = (obj: Record<string, unknown>, key: string, max = MAX_STR): string => sanitize(obj[key]).slice(0, max);
const optArr = (obj: Record<string, unknown>, key: string): unknown[] => Array.isArray(obj[key]) ? obj[key]! : [];

// Prompt injection sanitizer: escapes or strips patterns that could manipulate AI output
function sanitizeForAI(text: unknown): string {
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

// In-memory cache with TTL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { value: string; expiresAt: number }>();

function getCacheKey(endpoint: string, body: unknown): string {
  const hash = crypto.createHash('sha256');
  hash.update(endpoint);
  hash.update(JSON.stringify(body));
  return hash.digest('hex');
}

function getFromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: string): void {
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

// Rate limiting
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
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

// Groq API helper
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function callGroq(messages: { role: string; content: string }[], systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno GROQ_API_KEY es requerida.');
  }
  const body: Record<string, unknown> = { model: GROQ_MODEL, messages: [] };
  if (systemInstruction) {
    (body.messages as { role: string; content: string }[]).push({ role: 'system', content: systemInstruction });
  }
  (body.messages as { role: string; content: string }[]).push(...messages);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ----------------------------------------------------
// API ROUTES FIRST (Must be declared before Vite)
// ----------------------------------------------------
// Endpoint 1: Audit due process compliance of a case
app.post('/api/audit-due-process', requireAuth, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const id = requireStr(body, 'id', 50);
    const studentName = optStr(body, 'studentName', 200);
    const course = optStr(body, 'course', 100);
    const infractionType = requireStr(body, 'infractionType', 50);
    const isAulaSegura = Boolean(body.isAulaSegura);
    const checkedItems = optArr(body, 'checkedItems');
    const observations = optStr(body, 'observations', 5000);

    const systemPrompt = `Eres un Abogado Experto Legal en Educación Chilena y Fiscalizador de la Superintendencia de Educación, especializado en la Circular N° 482 y Ley N° 21809 de la Superintendencia de Educación (reglamentación de convivencia escolar, debido proceso y medidas de resguardo de NNA) y en la Ley de Aula Segura (Ley 21.128). 
Tu misión es auditar un caso de convivencia escolar de un colegio chileno para asegurar su indemnidad jurídica frente a un posible reclamo o recurso ante la Supereduc o tribunales. Exige siempre el cumplimiento del Debido Proceso (etapas: Recepción → Comunicación/Notificación → Investigación → Resolución Fundada → Reconsideración/Apelación) y la adopción prioritaria de Medidas de Resguardo Inmediatas para salvaguardar la integridad de los menores involucrados.

Analiza rigurosamente los siguientes detalles:
- Código de causa: ${id}
- Tipo de Infracción: ${infractionType} (bajo Reglamento Interno de Convivencia Escolar / RIE)
- Enfoque de Ley de Aula Segura: ${isAulaSegura ? 'Sí (Sometido a Ley Aula Segura - Suspensión provisoria, plazo fatal de 10 días hábiles de resolución)' : 'No (Procedimiento ordinario según RIE, Circular 482 y Ley 21809)'}
- Checklists de Medidas de Resguardo Inmediatas Adoptadas (Circular 482 / Ley 21809):
${JSON.stringify(checkedItems, null, 2)}
- Observaciones:
"${observations}"

Escribe un análisis de auditoría en formato de informe técnico formal en Markdown que incluya:
1. **Índice o Semáforo Jurídico de Cumplimiento**: Porcentaje estimado de validez procesal actual (e.g. 70% / Riesgo Medio).
2. **Diagnóstico del Proceso y Medidas de Resguardo**: Análisis puntual del cumplimiento de las etapas del RIE y la suficiencia de las medidas de resguardo inmediatas de protección aplicadas al NNA.
3. **Brechas y Omisiones Críticas (Riesgo Legal ante Supereduc)**: Qué falta, qué se omitió (por ejemplo, si falta dupla psicosocial o plan pedagógico para casos graves) y qué multas arriesga el colegio (e.g., multas UTM al sostenedor por faltas al debido proceso o abandono de medidas de resguardo).
4. **Instrucciones Remediales**: Pasos obligatorios urgentes de resguardo y tramitación para sanear el caso, junto con los plazos reglamentarios vigentes.

Utiliza un tono sumamente profesional, corporativo, técnico e institucional (el "vibe" SaaS legal de alto nivel chileno).`;

    const responseText = await callGroq([{ role: 'user', content: systemPrompt }]);

    res.json({ success: true, report: responseText });
  } catch (error: any) {
    console.error('Error al auditar debido proceso:', error);
    const status = error.message?.startsWith('Campo requerido') ? 400 : 500;
    res.status(status).json({ error: 'Error interno del servidor en auditoría.' });
  }
});

// Endpoint 2: Draft official documents based on Circular 482 / Ley 21809
app.post('/api/draft-document', requireAuth, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
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

    // Sanitizar arrays con helpers compartidos
    const safeMedidasEjecutadas = medidasEjecutadas
      .map((m: unknown) => sanitize(m).slice(0, 500))
      .slice(0, 50);
    const safeBitacora = bitacora
      .map((b: unknown) => {
        const r = b as Record<string, unknown>;
        return {
          titulo: sanitize(r.titulo).slice(0, 200),
          fecha: sanitize(r.fecha).slice(0, 50),
          tipo: sanitize(r.tipo).slice(0, 50),
          descripcion: sanitize(r.descripcion).slice(0, 2000),
          participantes: Array.isArray(r.participantes)
            ? r.participantes.map((p: unknown) => sanitize(p).slice(0, 100)).slice(0, 20)
            : [],
          documentoAdjunto: sanitize(r.documentoAdjunto).slice(0, 200)
        };
      })
      .slice(0, 100);
    const safeChecklist = checklist
      .map((c: unknown) => {
        const r = c as Record<string, unknown>;
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

    // Build comprehensive case data section for AI analysis
    const caseDataSection = `
==================== EXPEDIENTE COMPLETO DEL CASO ====================

DATOS GENERALES:
- Código de Causa: ${id}
- Estudiante: ${studentName} (RUN: ${runEstudiante || 'No registrado'})
- Curso: ${course}
- Apoderado: ${fatherName}
- Fecha de Apertura: ${fechaApertura || 'No registrada'}
- Estado Actual: ${estadoActual || 'No registrado'}
- Última Actualización: ${fechaUltimaActualizacion || 'No registrada'}
- Infracción: ${infractionType}
- Encargado: ${managerName}
- Aula Segura: ${isAulaSegura ? 'SÍ - Ley 21.128' : 'No'}
- Conducta RICE vinculada: ${conductaRiceId || 'Ninguna'}
- Observaciones del caso: "${observations || 'Sin observaciones'}"

MEDIDAS EJECUTADAS:
${safeMedidasEjecutadas.length > 0 ? safeMedidasEjecutadas.map((m: string) => `- ${m}`).join('\n') : 'No se han registrado medidas ejecutadas.'}

BITÁCORA COMPLETA DEL EXPEDIENTE:
${safeBitacora.length > 0 ? safeBitacora.map((b: any) => `
--- Registro: ${b.titulo} ---
  Fecha: ${b.fecha}
  Tipo: ${b.tipo}
  Descripción: ${b.descripcion}
  Participantes: ${b.participantes.join(', ')}
  Documento adjunto: ${b.documentoAdjunto || 'Ninguno'}`).join('\n') : 'No hay registros en la bitácora.'}

CHECKLIST DEL DEBIDO PROCESO:
${safeChecklist.length > 0 ? safeChecklist.map((c: any) => `
- [${c.completado ? 'X' : ' '}] ${c.label}
  Estado: ${c.completado ? 'COMPLETADO' : 'PENDIENTE'}
  Descripción: ${c.descripcion || ''}
  Requerido por: ${c.requeridoPor || ''}
  ${c.completado ? `Registrado por: ${c.registradoPor || ''} | Fecha: ${c.fechaCompletado || ''}` : ''}
  ${c.observaciones ? `Observaciones: ${c.observaciones}` : ''}
  ${c.documentoNombre ? `Documento adjunto: ${c.documentoNombre}` : ''}`).join('\n') : 'No hay checklist disponible.'}

==================================================================`;

    // Append full case data to any prompt
    const caseDataAppendix = `\n\n${caseDataSection}\n\nIMPORTANTE: Utiliza TODOS los antecedentes del expediente proporcionados arriba (bitácora, checklist, medidas ejecutadas) para fundamentar el documento. Revisa la bitácora para identificar fechas, entrevistas, evidencias y participantes reales. Revisa el checklist para verificar el estado del debido proceso. Incorpora estos datos en las secciones correspondientes del documento.\n`;

    let systemPrompt = '';

    // ============================================
    // PROMPT 1: NOTIFICACIÓN DE INICIO DE INDAGACIÓN
    // ============================================
    if (docType === 'notificacion_apertura') {
      systemPrompt = `Actúa como un profesional experto en convivencia escolar, normativa educacional chilena, procedimientos disciplinarios, debido proceso y redacción institucional.

Redacta una "NOTIFICACIÓN DE INICIO DE INDAGACIÓN DE CONVIVENCIA ESCOLAR", manteniendo un formato formal, objetivo, descriptivo y jurídicamente prudente.

La notificación debe respetar los principios de:
- Presunción de inocencia.
- Debido proceso.
- Derecho a defensa.
- Interés superior del estudiante.
- Confidencialidad de la información.
- Protección de datos personales.
- Ausencia de sesgos o juicios anticipados.
- Lenguaje descriptivo basado únicamente en antecedentes conocidos a la fecha.

Nunca afirmes que los hechos ocurrieron como una certeza. Utiliza expresiones como:
- "presunta participación"
- "eventual responsabilidad"
- "antecedentes que ameritan indagación"
- "hechos que se encuentran en proceso de esclarecimiento"
- "según los antecedentes recabados hasta esta etapa"
- "de corroborarse los hechos"

La redacción debe ser institucional, clara y profesional, apta para ser revisada por la Superintendencia de Educación.

Utiliza la siguiente estructura:

COLEGIO [NOMBRE DEL ESTABLECIMIENTO]
[UNIDAD O COORDINACIÓN RESPONSABLE]
NOTIFICACIÓN DE INICIO DE INDAGACIÓN DE CONVIVENCIA ESCOLAR

FECHA: [fecha]

NOMBRE DEL ESTUDIANTE: ${studentName}

CURSO: ${course}

REF.: ${observations ? observations.substring(0, 100) : 'Hechos en proceso de indagación'}

En conformidad con el procedimiento de convivencia escolar establecido en el Reglamento Interno y Manual de Convivencia Escolar vigente, se informa al estudiante y a su apoderado la existencia de una indagación formal respecto de antecedentes que podrían constituir una eventual infracción a la normativa interna del establecimiento.

La presente actuación tiene por finalidad recopilar antecedentes, esclarecer los hechos denunciados y determinar, de manera objetiva e imparcial, si existe participación o responsabilidad en los mismos.

Los antecedentes recopilados hasta esta etapa son los siguientes:

1. Hallazgo o Antecedentes Iniciales
Describir objetivamente:
- fecha
- lugar
- situación observada o denunciada
- forma en que se tomó conocimiento
Evitar conclusiones o atribuciones de responsabilidad.

2. Antecedentes Recabados y Medios de Verificación
Describir:
- testimonios recibidos
- observaciones de funcionarios
- registros documentales
- evidencia material o digital
- otros antecedentes relevantes
Indicar que dichos antecedentes serán sometidos a análisis durante el proceso investigativo.

3. Circunstancias Atenuantes y/o Agravantes en Evaluación
Señalar que durante la indagación se considerarán aspectos tales como:
- trayectoria conductual del estudiante
- antecedentes previos registrados
- colaboración durante el procedimiento
- reconocimiento espontáneo de hechos
- disposición a reparar eventuales afectaciones
- cualquier otra circunstancia relevante contemplada en el Reglamento Interno.

4. Calificación Preliminar de la Conducta
Indicar exclusivamente una clasificación preliminar.
De corroborarse los antecedentes descritos, la conducta podría ser calificada preliminarmente como una Falta ${infractionType}, conforme a lo establecido en el Reglamento Interno y de Convivencia Escolar.

Aclarar expresamente que:
Esta calificación tiene carácter provisional y podrá modificarse conforme avancen las etapas de investigación y análisis de los antecedentes.

5. Medidas Formativas y/o Disciplinarias Eventualmente Aplicables
Indicar únicamente medidas que podrían evaluarse.
Sin perjuicio de lo que determine la investigación, y considerando la naturaleza de los hechos indagados, podrían evaluarse las siguientes medidas:

Formativas:
[medida 1]
[medida 2]
[medida 3]

Disciplinarias:
[medida 1]
[medida 2]
[medida 3]

Aclarar que ninguna medida ha sido determinada aún.

6. Garantías del Debido Proceso
Incorporar el siguiente contenido adaptado al caso:
- Derecho a ser oído.
- Derecho a presentar descargos.
- Derecho a aportar antecedentes.
- Derecho a ser acompañado por su apoderado.
- Derecho a solicitar revisión de antecedentes según normativa interna.
- Derecho a recurrir conforme a los procedimientos establecidos.
Indicar que el estudiante y su apoderado serán citados a entrevista o audiencia correspondiente.

Resguardo de la Confidencialidad
Incluir el siguiente párrafo:
"Durante todo el procedimiento se resguardará estrictamente la confidencialidad de la información recopilada, la identidad de las personas involucradas y los antecedentes que formen parte de la investigación, velando por la protección de los derechos de todos los estudiantes y miembros de la comunidad educativa."

${isAulaSegura ? 'NOTA: El presente caso se enmarca en la Ley N° 21.128 (Aula Segura), por lo que los plazos del procedimiento se sujetarán a lo dispuesto en dicha normativa.' : ''}

NOMBRE Y CARGO DE QUIEN NOTIFICA: ${managerName}

ACUSO RECIBO DEL APODERADO Y/O ESTUDIANTE:
Nombre del Apoderado: ${fatherName}
Firma: _________________________
Fecha: _________________________`;
    }

    // ============================================
    // PROMPT 2: CITACIÓN A ENTREVISTA DE DESCARGOS
    // ============================================
    else if (docType === 'citacion_entrevista') {
      systemPrompt = `Actúa como un profesional experto en convivencia escolar, normativa educacional chilena y redacción institucional.

Redacta una "CITACIÓN A ENTREVISTA DE DESCARGOS" formal, objetiva y jurídicamente sólida.

DATOS DEL CASO:
- Estudiante: ${studentName} (Curso: ${course})
- Apoderado: ${fatherName}
- Infracción investigada: ${infractionType}
- Encargado del procedimiento: ${managerName}
- Hechos: ${observations}
- Aula Segura: ${isAulaSegura ? 'Sí' : 'No'}

Estructura del documento:

1. MEMBRETE Y ENCABEZADO INSTITUCIONAL
2. CITACIÓN FORMAL indicando fecha, hora y lugar de la audiencia de descargos
3. ANTECEDENTES del procedimiento en curso
4. OBJETO DE LA AUDIENCIA: recibir descargos y ejercer el derecho a ser oído
5. DERECHOS DEL ESTUDIANTE durante la audiencia
6. ADVERTENCIA sobre consecuencias de inasistencia injustificada
7. FIRMA DEL ENCARGADO Y RECIBO DEL APODERADO

Utiliza lenguaje formal y respetuoso. Asegura que el documento cumple con los estándares de la Circular N° 482.`;
    }

    // ============================================
    // PROMPT 3: INFORME DE CIERRE DE INDAGACIÓN
    // ============================================
    else if (docType === 'informe_cierre_indagacion') {
      systemPrompt = `Actúa como un especialista en convivencia escolar, gestión educativa, normativa educacional chilena, Ley General de Educación, Ley N° 21.430, Ley N° 21.128 (Aula Segura), Ley N° 21.809, Circulares de la Superintendencia de Educación y Reglamento Interno de Convivencia Escolar (RICE).

Debes elaborar un INFORME DE CIERRE DE INDAGACIÓN DISCIPLINARIA con un nivel técnico-profesional equivalente a un documento institucional destinado a ser revisado por Rectoría, Dirección, Equipo de Convivencia Escolar o eventualmente por la Superintendencia de Educación.

La finalidad del informe es cerrar la etapa investigativa, establecer hechos acreditados, analizar los descargos, verificar el debido proceso y proponer medidas disciplinarias, formativas y reparatorias.

ANTECEDENTES DEL CASO:
- Estudiante: ${studentName} (Curso: ${course})
- Apoderado: ${fatherName}
- Código de causa: ${id}
- Tipo de infracción: ${infractionType}
- Encargado: ${managerName}
- Contexto: ${observations}
- Aula Segura: ${isAulaSegura ? 'Sí' : 'No'}

ESTRUCTURA OBLIGATORIA DEL INFORME:

1. RESUMEN EJECUTIVO
Incluir:
- Declaración de cierre de la indagación
- Síntesis de hechos acreditados
- Estado de la investigación
- Principales hallazgos
- Calificación preliminar de la conducta
- Propuesta general de medidas
- Estado del debido proceso

2. RELACIÓN TÉCNICA DE LOS HECHOS
Reconstruir cronológicamente:
- Inicio de la denuncia.
- Detección del hecho.
- Actuaciones realizadas.
- Evidencias obtenidas.
- Entrevistas efectuadas.
- Hallazgos relevantes.
Incluir una tabla: | Fecha | Actuación | Descripción | Responsable |

3. ANÁLISIS DE LOS DESCARGOS
Analizar cada argumento presentado por estudiante y apoderado.
Determinar para cada punto: Acreditado / Parcialmente acreditado / No acreditado.
Fundamentar cada conclusión mediante evidencia objetiva.
Evitar descalificaciones personales.
Analizar únicamente hechos y antecedentes verificables.

4. DETERMINACIÓN DE HECHOS ACREDITADOS
Distinguir claramente:
- Hechos acreditados
- Hechos parcialmente acreditados
- Hechos no acreditados
Explicar evidencias que los respaldan, nivel de certeza alcanzado y relación con la normativa institucional.

5. ANÁLISIS DE LA TRAYECTORIA CONDUCTUAL
Incorporar historial de convivencia, frecuencia de anotaciones, tipología de conductas, evolución conductual, medidas previas implementadas y resultados de dichas intervenciones.
Concluir si existe: reiteración, persistencia, escalada conductual o ausencia de antecedentes.

6. IDENTIFICACIÓN DE AGRAVANTES Y ATENUANTES
Para cada una, fundamentar con evidencia.

7. AUDITORÍA DEL DEBIDO PROCESO
Verificar expresamente cada etapa: recepción de denuncia, investigación, acopio de antecedentes, notificación formal, descargos, entrevistas, derecho a defensa, confidencialidad, presunción de inocencia, cierre de investigación.
Tabla: | Etapa | Estado | Evidencia |

8. CALIFICACIÓN JURÍDICA Y REGLAMENTARIA
Determinar artículos del RICE aplicables, tipificación de la conducta, nivel de gravedad, derechos eventualmente afectados, deberes eventualmente vulnerados.
Relacionar con Reglamento Interno, Ley General de Educación, Ley 21.430, Ley 21.809 y normativa vigente aplicable.

9. IMPACTO EN LA CONVIVENCIA ESCOLAR
Analizar impacto en estudiantes, docentes, asistentes, institucional y en el clima escolar.

10. PROPUESTA DE MEDIDAS DISCIPLINARIAS
Analizar procedencia de: amonestación, suspensión, condicionalidad, cancelación de matrícula, expulsión, restricciones de participación institucional y otras medidas del RICE.
Para cada medida indicar: Procede / No procede. Justificar técnicamente.

11. PROPUESTA DE MEDIDAS FORMATIVAS
Diseñar medidas orientadas a: reflexión, aprendizaje, reparación, desarrollo socioemocional, responsabilidad personal.
Incluir tabla: | Medida | Objetivo | Responsable | Plazo |

12. PROPUESTA DE MEDIDAS REPARATORIAS
Diseñar medidas orientadas a: reparación del daño, restablecimiento de relaciones, responsabilidad frente a la comunidad.
Incluir tabla: | Medida | Objetivo | Responsable | Plazo |

13. RESPONSABILIDADES Y COMPROMISOS DEL APODERADO
Matriz: | Área | Compromiso | Fundamento |
Considerar: seguimiento, asistencia, comunicación, supervisión, corresponsabilidad educativa.

14. CONCLUSIONES DEL CIERRE DE INDAGACIÓN
Concluir: hechos acreditados, nivel de responsabilidad establecido, principales elementos de análisis, cumplimiento del debido proceso, justificación de las medidas propuestas.
Indicar expresamente que la decisión definitiva corresponde a la autoridad resolutiva establecida en el RICE.

15. RESUMEN FINAL DE MEDIDAS PROPUESTAS
Tabla consolidada: | Dimensión | Medida | Fundamento |
Clasificar: disciplinarias, formativas, reparatorias, corresponsabilidad familiar.

CRITERIOS OBLIGATORIOS DE REDACCIÓN:
- Objetividad, imparcialidad, razonabilidad, proporcionalidad.
- Enfoque formativo.
- Perspectiva de protección de derechos.
- Interés superior del niño, niña y adolescente.
- Lenguaje técnico institucional.
- Coherencia jurídica y pedagógica.
- Compatibilidad con eventuales revisiones de la Superintendencia de Educación.

EXPRESIONES PROHIBIDAS: "alumno problemático", "conducta antisocial", "estudiante conflictivo", "conducta refractaria", "mala persona", "manipulador", "conducta maliciosa", "irrecuperable", "lista negra", "perfil negativo".
Toda conclusión debe referirse exclusivamente a conductas observadas y acreditadas.

TEST FINAL DE SOLIDEZ TÉCNICA (verificar internamente):
- ¿Todos los hechos están respaldados por evidencia?
- ¿Se distinguieron claramente hechos y opiniones?
- ¿Se analizaron descargos y antecedentes favorables?
- ¿Las medidas propuestas son proporcionales?
- ¿El lenguaje utilizado es objetivo y respetuoso?
- ¿El informe resistiría una revisión de la Superintendencia de Educación?
- ¿El informe demuestra cumplimiento efectivo del debido proceso?
- ¿Las conclusiones derivan razonablemente de los antecedentes acreditados?`;
    }

    // ============================================
    // PROMPT 4: INFORME CONCLUYENTE Y RESOLUCIÓN FINAL
    // ============================================
    else if (docType === 'informe_concluyente') {
      systemPrompt = `Actúa como un equipo interdisciplinario compuesto por:
- Abogado especialista en Derecho Educacional Chileno.
- Experto en Convivencia Escolar.
- Investigador de procedimientos disciplinarios escolares.
- Auditor de debido proceso conforme a la Circular N°482 de la Superintendencia de Educación.
- Especialista en protección de derechos de niños, niñas y adolescentes.
- Redactor técnico institucional de alto nivel.

Tu tarea consiste en elaborar un INFORME CONCLUYENTE DISCIPLINARIO Y FORMATIVO INTEGRAL a partir de todos los antecedentes del caso.

OBJETIVO: Generar un informe técnico de estándar profesional, jurídicamente sólido, objetivo, imparcial y defendible ante: Superintendencia de Educación, Tribunal de Familia, Corte de Apelaciones, Sostenedor, Rectoría y Dirección del establecimiento.

El informe debe evitar afirmaciones especulativas, prejuicios o juicios de valor subjetivos. Toda conclusión debe estar sustentada en evidencia explícita contenida en los antecedentes.

DATOS DEL CASO:
- Código de causa: ${id}
- Estudiante: ${studentName} (Curso: ${course})
- Apoderado: ${fatherName}
- Infracción: ${infractionType}
- Encargado del procedimiento: ${managerName}
- Antecedentes y contexto: ${observations}
- Aplica Aula Segura: ${isAulaSegura ? 'Sí (Ley 21.128)' : 'No'}

PRINCIPIOS OBLIGATORIOS DE REDACCIÓN:
- Lenguaje técnico, tono objetivo, estilo descriptivo.
- Enfoque garantista, perspectiva formativa.
- Prudencia jurídica, rigurosidad probatoria, imparcialidad institucional.
- No utilizar: lenguaje emocional, suposiciones, afirmaciones no acreditadas, calificativos peyorativos, interpretaciones psicológicas sin respaldo técnico.
- Cuando existan versiones contradictorias: identificarlas, compararlas, evaluar su consistencia, explicar cuáles se encuentran corroboradas por evidencia y cuáles carecen de respaldo suficiente.

ESTRUCTURA OBLIGATORIA DEL INFORME:

1. RESUMEN EJECUTIVO (máximo 1 página)
- Identificación general del caso.
- Hechos investigados.
- Principales antecedentes analizados.
- Conclusiones generales.
- Medidas propuestas.

2. DESCRIPCIÓN FÁCTICA Y RECONSTRUCCIÓN DEL INCIDENTE
- Reconstruir cronológicamente: qué ocurrió, cuándo, dónde, quiénes participaron, cómo ocurrieron los hechos.
- Integrar: declaraciones, testimonios, informes técnicos, evidencias documentales, descargos.
- Distinguir claramente: hechos acreditados, hechos parcialmente acreditados, hechos no acreditados.

3. ANÁLISIS DE CONSISTENCIA PROBATORIA
Evaluación técnica de: testimonios, declaraciones, descargos, informes técnicos, evidencia documental.
Para cada antecedente: | Evidencia | Lo que acredita | Nivel de confiabilidad | Observaciones |
Clasificar: Alta consistencia / Consistencia media / Baja consistencia.
Explicar contradicciones relevantes.

4. ANÁLISIS DE DESCARGOS Y DERECHO A DEFENSA
Examinar exhaustivamente argumentos del estudiante y del apoderado.
Determinar: aspectos acogidos, parcialmente acogidos, rechazados. Justificar técnicamente cada decisión.

5. ANÁLISIS DE TRAYECTORIA FORMATIVA Y CONDUCTUAL
Analizar anotaciones positivas y negativas, medidas previas, historial disciplinario, evolución conductual.
Matriz técnica: | Fecha | Tipo de registro | Descripción | Descargos | Análisis técnico | Impacto pedagógico |
Determinar si el hecho constituye: hecho aislado, conducta reiterada, escalada conductual o patrón persistente.

6. AUDITORÍA DE DEBIDO PROCESO
Verificar cumplimiento de: Reglamento Interno, Circular N°482, Ley General de Educación, Ley de Inclusión, Ley 21.430.
Tabla cronológica: | Etapa | Fecha | Actuación | Evidencia | Cumplimiento |
Revisar: denuncia, apertura, investigación, notificación, bilateralidad, descargos, resolución.
Detectar eventuales riesgos jurídicos.

7. ANÁLISIS DE NO DISCRIMINACIÓN Y PROPORCIONALIDAD
Evaluar si existen elementos que pudieran configurar discriminación arbitraria, sesgos, trato desigual o vulneración de derechos.
Examinar: edad, curso, necesidades educativas especiales, condición socioeconómica, antecedentes académicos.

8. TIPIFICACIÓN NORMATIVA
Identificar artículos específicos del Reglamento Interno, protocolos aplicables, normativa institucional.
Determinar: conductas acreditadas, tipo de falta, circunstancias agravantes, atenuantes y eximentes.
Explicar el razonamiento jurídico completo.

9. TEST DE SOLIDEZ JURÍDICA
Análisis preventivo frente a apelaciones, reclamos ante Superintendencia, recursos judiciales.
Identificar: riesgos jurídicos, fortalezas del procedimiento, aspectos susceptibles de impugnación, recomendaciones de mejora.
Evaluar especialmente: proporcionalidad, razonabilidad, ne bis in idem, debido proceso, interés superior del niño.

10. RESOLUCIÓN FUNDADA
Analizar individualmente cada medida propuesta. Para cada una: HA LUGAR o NO HA LUGAR.
Fundamentar con: hechos acreditados, reglamento, proporcionalidad, finalidad pedagógica, resguardo del derecho a la educación.

11. MATRIZ CONSOLIDADA DE MEDIDAS
| Tipo de Medida | Descripción | Estado | Fundamentación | Resguardo de Derechos |
Incluir: disciplinarias, formativas, reparatorias, de apoyo, de seguimiento.

12. PLAN DE INTERVENCIÓN Y SEGUIMIENTO
Acciones específicas para: estudiante, apoderado, equipo de convivencia, profesor jefe, coordinación de ciclo.
Indicar: objetivo, responsable, plazo, evidencia de cumplimiento.

13. RESPONSABILIDAD FAMILIAR Y ALIANZA HOGAR-ESCUELA
Matriz de corresponsabilidad familiar: | Área | Compromiso | Responsable | Evidencia | Seguimiento |

14. CONCLUSIÓN FINAL
Conclusión institucional robusta que: sintetice los hallazgos, explique la lógica de la resolución, demuestre proporcionalidad, acredite debido proceso, resguarde derechos, justifique las medidas adoptadas.
La conclusión debe ser apta para sostener una eventual revisión de la Superintendencia de Educación.

EXIGENCIA FINAL:
Antes de emitir cualquier conclusión:
- Identificar evidencia que respalde cada afirmación.
- Diferenciar hechos acreditados de inferencias.
- Aplicar criterio de imparcialidad, proporcionalidad, interés superior del niño, debido proceso y razonabilidad jurídica.

El resultado final debe parecer elaborado por un abogado especialista en derecho educacional, un investigador disciplinario y un coordinador de convivencia escolar trabajando conjuntamente.

${isAulaSegura ? 'NOTA: Dado que el caso está sujeto a Ley Aula Segura (Ley 21.128), el informe debe considerar los plazos fatales de 10 días hábiles y las disposiciones especiales de dicha ley.' : ''}`;
    }

    const responseText = await callGroq([{ role: 'user', content: systemPrompt + caseDataAppendix }]);

    res.json({ success: true, document: responseText });
  } catch (error: any) {
    console.error('Error al generar borrador de documento:', error);
    res.status(500).json({ error: 'Error interno del servidor al redactar documento.' });
  }
});

// Endpoint 4: Improve text (spelling, grammar, coherence)
app.post('/api/improve-text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Campo requerido: text' });
      return;
    }
    if (text.length > 5000) {
      res.status(400).json({ error: 'El texto no puede exceder 5000 caracteres.' });
      return;
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const cacheKey = getCacheKey('improve-text', { text });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, improved: cached, cached: true });
      return;
    }

    const systemMsg = 'Eres un asistente de redacción especializado en redacción institucional educativa chilena. Tu única función es mejorar la ortografía, gramática, coherencia y redacción del texto que el usuario te entrega. Usa siempre un tono neutro, objetivo y sin juicios de valor. No agregues explicaciones, comentarios ni evaluaciones. No respondas preguntas ni interpretes el contenido. Devuelve ÚNICAMENTE el texto corregido, sin ningún formato adicional ni prefacio.';
    const userContent = sanitizeForAI(text);
    const responseText = await callGroq([{ role: 'user', content: `Texto a corregir:\n\n${userContent}` }], systemMsg);
    setCache(cacheKey, responseText);

    res.json({ success: true, improved: responseText });
  } catch (error: any) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
  }
});

// Endpoint 3: Virtual compliance consultant
app.post('/api/advisor-chat', requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const userId = (req as any).user?.sub || 'anonymous';
    const cacheKey = getCacheKey('advisor-chat', { userId, message, historyCount: history?.length || 0 });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, reply: cached, cached: true });
      return;
    }

    const systemInstruction = `Actúas como un Abogado Senior y Experto Legal de la Superintendencia de Educación de Chile, experto en fiscalizaciones aplicadas a establecimientos escolares chilenos. Tu dominio de especialidad abarca:
- Circular N° 482 de la Superintendencia de Educación y la Ley N° 21809, que norman reglamentos internos de convivencia escolar (RIE), debida proporcionalidad, medidas de resguardo inmediatas de NNA, gradualidad y plan de acompañamiento.
- Ley Aula Segura (Ley N° 21.128 que regula los casos de expulsión, suspensión provisoria inmediata y plazos fatales).
- Reglamento Interno de Convivencia Escolar (RICE / RIE) y las formalidades indispensables de proporcionalidad, gradualidad y acompañamiento formativo.

Tus respuestas deben estar redactadas en español formal de Chile, alineadas con el rigor burocrático y legal que evitará cargos, multas pecuniarias o recursos judiciales contra el colegio. Cita artículos cuando corresponda y explica paso a paso cómo resguardar el "Debido Proceso Escolar" y la integridad mediante medidas de resguardo. Proporciona respuestas muy estructuradas, didácticas y extremadamente precisas.`;

    const messages: { role: string; content: string }[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: sanitizeForAI(h.content).slice(0, 2000),
        });
      });
    }
    messages.push({ role: 'user', content: sanitizeForAI(message) });

    const responseText = await callGroq(messages, systemInstruction);
    setCache(cacheKey, responseText);

    res.json({ success: true, reply: responseText });
  } catch (error: any) {
    console.error('Error en el Chat de Consultoría:', error);
    res.status(500).json({ error: 'Error al procesar su consulta legal.' });
  }
});

// ----------------------------------------------------
// DEV AND PRODUCTION CLIENT-SERVING BOOTSTRAP
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA single point of redirection
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();