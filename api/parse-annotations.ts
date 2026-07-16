/** @license SPDX-License-Identifier: Apache-2.0 */
/**
 * Vercel Serverless Function — POST /api/parse-annotations
 * Mirrors the Express endpoint in server.ts for production deploy.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const PROMPT = `Eres un asistente experto de Convivencia Escolar en Chile, alineado al Reglamento Interno de Convivencia Escolar (RICE) 2026 de la Fundación Educacional Colegio Carmela Romero de Espinosa (Madres Dominicas - Concepción).
Analiza la hoja de vida adjunta del estudiante y extrae TODAS las anotaciones o registros de conducta, reconociendo tanto las anotaciones NEGATIVAS como las POSITIVAS.

Clasifica la gravedad según RICE 2026:
- 'Leve' (Art. 24)
- 'Grave' (Art. 25)
- 'Muy Grave' (Art. 26)
- 'Gravísima' (Art. 27 - Aula Segura)

Para cada anotación: text, date (YYYY-MM-DD), severity, registered_by, type (Positiva|Negativa).
Devuelve estrictamente un arreglo JSON ordenado cronológicamente.`;

// Simple in-memory rate limit (per instance)
const hits = new Map<string, { count: number; reset: number }>();
const MAX_PER_MIN = 10;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= MAX_PER_MIN) return false;
  entry.count += 1;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intente en un minuto.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Servicio de IA no configurado. Agregue GEMINI_API_KEY en Vercel.',
    });
  }

  try {
    const { base64Data, mimeType, fileName } = req.body || {};
    if (!base64Data) {
      return res.status(400).json({ error: 'Faltan los datos del archivo en formato base64.' });
    }

    // ~10MB base64 rough guard
    if (typeof base64Data === 'string' && base64Data.length > 14_000_000) {
      return res.status(413).json({ error: 'Archivo demasiado grande (máx. ~10 MB).' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: base64Data,
          },
        },
        {
          text: `${PROMPT}\nArchivo: "${fileName || 'Documento'}"`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              date: { type: Type.STRING },
              severity: { type: Type.STRING },
              registered_by: { type: Type.STRING },
              type: { type: Type.STRING },
            },
            required: ['text', 'date', 'severity', 'registered_by', 'type'],
          },
        },
      },
    });

    const text = response.text || '[]';
    const parsed = JSON.parse(text);
    return res.status(200).json({ success: true, annotations: parsed });
  } catch (error: any) {
    console.error('parse-annotations error', error);
    return res.status(500).json({
      error: error?.message || 'Error interno al procesar el archivo con Gemini.',
    });
  }
}
