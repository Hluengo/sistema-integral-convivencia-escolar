import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure Gemini API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not set. PDF extraction will fail.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limits for base64 file uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route: Parse PDF annotations using Gemini
  app.post('/api/parse-annotations', async (req, res) => {
    try {
      const { base64Data, mimeType, fileName } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: 'Faltan los datos del archivo en formato base64.' });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: 'Servicio de IA no configurado. Por favor, agregue su clave GEMINI_API_KEY en la configuración.' 
        });
      }

      const filePart = {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: base64Data
        }
      };

      const promptPart = {
        text: `Eres un asistente experto de Convivencia Escolar en Chile, alineado al Reglamento Interno de Convivencia Escolar (RICE) 2026 de la Fundación Educacional Colegio Carmela Romero de Espinosa (Madres Dominicas - Concepción).
Analiza la hoja de vida adjunta del estudiante ("${fileName || 'Documento'}") y extrae TODAS las anotaciones o registros de conducta, reconociendo tanto las anotaciones NEGATIVAS (atrasos, uniforme, faltas disciplinarias) como las POSITIVAS (felicitaciones, méritos académicos).

Clasifica la gravedad de forma rigurosa de acuerdo a las pautas del RICE 2026:
- 'Leve' (Art. 24): Atrasos, uniforme incompleto, deficiencia de higiene, no entregar circulares, interrumpir clases, comer en el aula, etc.
- 'Grave' (Art. 25): Faltar a la verdad, usar celular sin autorización en clases, promover disturbios, lenguaje vulgar u ofensivo, copia o fraude académico.
- 'Muy Grave' (Art. 26): Falsificar firmas, destruir bienes del colegio, participar en riñas, ciberacoso, deepfakes, etc.
- 'Gravísima' (Art. 27 - Aula Segura): Agresión física severa, porte/uso de armas o artefactos explosivos (incluye encender fuego), drogas/alcohol, acoso o abuso sexual.

Para cada anotación identificada, estructura la información con los siguientes campos:
1. "text": Breve descripción del hecho de la anotación de forma clara y literal.
2. "date": Fecha en formato 'YYYY-MM-DD'. Si solo indica día/mes, asume el año 2026.
3. "severity": Gravedad de la anotación, clasificada estrictamente como 'Leve', 'Grave', 'Muy Grave' o 'Gravísima'. Si es positiva, asígnale siempre 'Leve'.
4. "registered_by": Persona que registró la observación (por ejemplo, "Prof. Valeria Toledo", "Inspectoría"). Si no figura, escribe "Inspectoría".
5. "type": Tipo de anotación, clasificada estrictamente como 'Positiva' o 'Negativa'.

Devuelve estrictamente un arreglo JSON que contenga las anotaciones del estudiante ordenadas cronológicamente.`
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [filePart, promptPart],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: 'Descripción de la anotación.' },
                date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD.' },
                severity: { type: Type.STRING, description: 'Clasificación de gravedad.' },
                registered_by: { type: Type.STRING, description: 'Nombre o cargo de quien registró.' },
                type: { type: Type.STRING, description: 'Establecer como "Positiva" o "Negativa" según corresponda.' }
              },
              required: ['text', 'date', 'severity', 'registered_by', 'type']
            }
          }
        }
      });

      const text = response.text || '[]';
      const parsed = JSON.parse(text);

      res.json({ success: true, annotations: parsed });
    } catch (error: any) {
      console.error('Error in /api/parse-annotations:', error);
      res.status(500).json({ error: error.message || 'Error interno al procesar el archivo con Gemini.' });
    }
  });

  // Serve static assets in development / production correctly
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
