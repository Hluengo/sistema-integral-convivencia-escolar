/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client for active request processing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('La variable de entorno GEMINI_API_KEY es requerida para utilizar el Asistente IA.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API ROUTES FIRST (Must be declared before Vite)
// ----------------------------------------------------

// Endpoint 1: Audit due process compliance of a case
app.post('/api/audit-due-process', async (req, res) => {
  try {
    const { id, studentName, course, infractionType, isAulaSegura, checkedItems, observations } = req.body;
    const ai = getGeminiClient();

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
    });

    res.json({ success: true, report: response.text });
  } catch (error: any) {
    console.error('Error al auditar debido proceso:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor en auditoría.' });
  }
});

// Endpoint 2: Draft official documents based on Circular 482 / Ley 21809
app.post('/api/draft-document', async (req, res) => {
  try {
    const { docType, id, studentName, course, fatherName, managerName, infractionType, observations, isAulaSegura } = req.body;
    const ai = getGeminiClient();

    let docDesc = '';
    if (docType === 'notificacion_apertura') {
      docDesc = 'Carta formal de notificación al apoderado sobre la apertura del procedimiento disciplinario de investigación por hechos calificados como graves/muy graves/gravísimos.';
    } else if (docType === 'citacion_entrevista') {
      docDesc = 'Carta formal de citación individual al apoderado y al estudiante para la "Audiencia de Descargos" (Derecho a ser oído), indispensable para resguardar la legalidad procesal.';
    } else if (docType === 'notificacion_resolucion') {
      docDesc = 'Oficio de Notificación de Resolución de sanción formativa/disciplinaria con determinación del plan de acompañamiento integral y la mención expresa de su derecho a presentar Recurso de Reconsideración ante la Dirección dentro del plazo de 5 días hábiles.';
    } else {
      docDesc = 'Documento formal de convivencia de conformidad con la normativa general de la Superintendencia de Educación.';
    }

    const systemPrompt = `Eres un Abogado y Senior Redactor Legal de Instituciones Educacionales en Chile. Tu tarea es redactar el borrador oficial de un documento de convivencia escolar para el siguiente caso, respetando la Circular de la Supereduc N° 482 y la Ley N° 21809 sobre medidas disciplinarias, medidas de resguardo inmediatas y debido proceso de niños, niñas y adolescentes (NNA).

DATOS PARTICULARES:
- Tipo de Documento Solicitado: ${docDesc}
- Código de causa: ${id}
- Nombre de la Alumna/Estudiante afectado o implicado: ${studentName} (Curso: ${course})
- Nombre del Apoderado a quien se dirige: ${fatherName}
- Encargado del Procedimiento / Firmante: ${managerName}
- Calificación Provisional de Infracción: ${infractionType}
- Hechos de contexto: "${observations}"
- Sujeto a Aula Segura (10 días): ${isAulaSegura ? 'SÍ' : 'NO'}

REGLAS DE REDACCIÓN:
1. Utiliza lenguaje chileno formal para la administración de establecimientos escolares (por ejemplo, "pupilo", "apoderado", "Reglamento Interno", "Rectoría", "Dirección", "medida de resguardo", "medida formativa", "Superintendencia de Educación", "proporcionalidad", "aula segura").
2. Estructura el documento de manera impecable: Membrete o Identificación, Fecha, Destinatario, Cuerpo formal debidamente fundado en artículos de la Circular 482, Ley 21809 o RIE, Espacio para la firma formal de recepción del apoderado, Firma del Director/Encargado.
3. Si el documento es de Notificación de Resolución Final, explicita claramente la existencia de un plazo reglamentario de 5 (cinco) días hábiles para interponer un Recurso de Reconsideración ante la Dirección del establecimiento. Esto es vital para que la Supereduc no anule el procedimiento.
4. Responde ÚNICAMENTE con el borrador final formal listo para imprimir y rellenar en formato Markdown. No incluyas explicaciones previas, solo el acta/carta impecable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
    });

    res.json({ success: true, document: response.text });
  } catch (error: any) {
    console.error('Error al generar borrador de documento:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor al redactar documento.' });
  }
});

// Endpoint 3: Virtual compliance consultant
app.post('/api/advisor-chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `Actúas como un Abogado Senior y Experto Legal de la Superintendencia de Educación de Chile, experto en fiscalizaciones aplicadas a establecimientos escolares chilenos. Tu dominio de especialidad abarca:
- Circular N° 482 de la Superintendencia de Educación y la Ley N° 21809, que norman reglamentos internos de convivencia escolar (RIE), debida proporcionalidad, medidas de resguardo inmediatas de NNA, gradualidad y plan de acompañamiento.
- Ley Aula Segura (Ley N° 21.128 que regula los casos de expulsión, suspensión provisoria inmediata y plazos fatales).
- Reglamento Interno de Convivencia Escolar (RICE / RIE) y las formalidades indispensables de proporcionalidad, gradualidad y acompañamiento formativo.

Tus respuestas deben estar redactadas en español formal de Chile, alineadas con el rigor burocrático y legal que evitará cargos, multas pecuniarias o recursos judiciales contra el colegio. Cita artículos cuando corresponda y explica paso a paso cómo resguardar el "Debido Proceso Escolar" y la integridad mediante medidas de resguardo. Proporciona respuestas muy estructuradas, didácticas y extremadamente precisas.`;

    // Map history to standard contents format if necessary
    // Because simple generation is stateless in this setup, let's construct a beautiful conversation-guided single prompt or manage it elegantly
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
      }
    });

    res.json({ success: true, reply: response.text });
  } catch (error: any) {
    console.error('Error en el Chat de Consultoría:', error);
    res.status(500).json({ error: error.message || 'Error al procesar su consulta legal.' });
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
