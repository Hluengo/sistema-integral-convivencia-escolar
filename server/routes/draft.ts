/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireStr, optStr, optArr, sanitize, sanitizeForAI } from '../lib/validators';
import { checkRateLimit } from '../lib/rateLimit';
import { callGroq } from '../lib/groq';

const router = Router();

function getSupabaseRestUrl(path: string): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase no configurado');
  }
  return supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + path;
}

type SafeBitacoraEntry = {
  titulo: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  participantes: string[];
  documentoAdjunto: string;
};

type SafeChecklistEntry = {
  label: string;
  completado: boolean;
  descripcion: string;
  requeridoPor: string;
  registradoPor: string;
  fechaCompletado: string;
  observaciones: string;
  documentoNombre: string;
};

function buildCaseDataSection(params: {
  id: string;
  studentName: string;
  runEstudiante: string;
  course: string;
  fatherName: string;
  fechaApertura: string;
  estadoActual: string;
  fechaUltimaActualizacion: string;
  infractionType: string;
  managerName: string;
  isAulaSegura: boolean;
  conductaRiceId: string;
  observations: string;
  safeMedidas: string[];
  safeBitacora: SafeBitacoraEntry[];
  safeChecklist: SafeChecklistEntry[];
}) {
  const caseStr = `
==================== EXPEDIENTE COMPLETO DEL CASO ====================

DATOS GENERALES:
- Código de Causa: ${params.id}
- Estudiante: ${sanitizeForAI(params.studentName)} (RUN: ${params.runEstudiante || 'No registrado'})
- Curso: ${params.course}
- Apoderado: ${params.fatherName}
- Fecha de Apertura: ${params.fechaApertura || 'No registrada'}
- Estado Actual: ${params.estadoActual || 'No registrado'}
- Última Actualización: ${params.fechaUltimaActualizacion || 'No registrada'}
- Infracción: ${params.infractionType}
- Encargado: ${params.managerName}
- Aula Segura: ${params.isAulaSegura ? 'SÍ - Ley 21.128' : 'No'}
- Conducta RICE vinculada: ${params.conductaRiceId || 'Ninguna'}
- Observaciones del caso: "${sanitizeForAI(params.observations) || 'Sin observaciones'}"

MEDIDAS EJECUTADAS:
${params.safeMedidas.length > 0 ? params.safeMedidas.map((m) => `- ${m}`).join('\n') : 'No se han registrado medidas ejecutadas.'}

BITÁCORA COMPLETA DEL EXPEDIENTE:
${
  params.safeBitacora.length > 0
    ? params.safeBitacora
        .map(
          (b) => `
--- Registro: ${b.titulo} ---
  Fecha: ${b.fecha}
  Tipo: ${b.tipo}
  Descripción: ${b.descripcion}
  Participantes: ${b.participantes.join(', ')}
  Documento adjunto: ${b.documentoAdjunto || 'Ninguno'}`
        )
        .join('\n')
    : 'No hay registros en la bitácora.'
}

CHECKLIST DEL DEBIDO PROCESO:
${
  params.safeChecklist.length > 0
    ? params.safeChecklist
        .map(
          (c) => `
- [${c.completado ? 'X' : ' '}] ${c.label}
  Estado: ${c.completado ? 'COMPLETADO' : 'PENDIENTE'}
  Descripción: ${c.descripcion || ''}
  Requerido por: ${c.requeridoPor || ''}
  ${c.completado ? `Registrado por: ${c.registradoPor || ''} | Fecha: ${c.fechaCompletado || ''}` : ''}
  ${c.observaciones ? `Observaciones: ${c.observaciones}` : ''}
  ${c.documentoNombre ? `Documento adjunto: ${c.documentoNombre}` : ''}`
        )
        .join('\n')
    : 'No hay checklist disponible.'
}

==================================================================`;
  return caseStr;
}

router.post('/draft-document', requireAuth, async (req, res) => {
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
    const fechaApertura = optStr(body, 'fechaApertura', 50);
    const estadoActual = optStr(body, 'estadoActual', 50);
    const fechaUltimaActualizacion = optStr(body, 'fechaUltimaActualizacion', 50);
    const medidasEjecutadas = optArr(body, 'medidasEjecutadas');
    const bitacora = optArr(body, 'bitacora');
    const checklist = optArr(body, 'checklist');

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const safeMedidas: string[] = medidasEjecutadas
      .map((m) => sanitize(m).slice(0, 500))
      .slice(0, 50);

    const safeBitacora: SafeBitacoraEntry[] = bitacora
      .map((b: unknown) => {
        const r = b as Record<string, unknown>;
        return {
          titulo: sanitize(r.titulo).slice(0, 200),
          fecha: sanitize(r.fecha).slice(0, 50),
          tipo: sanitize(r.tipo).slice(0, 50),
          descripcion: sanitize(r.descripcion).slice(0, 2000),
          participantes: Array.isArray(r.participantes)
            ? (r.participantes as unknown[]).map((p) => sanitize(p).slice(0, 100)).slice(0, 20)
            : [],
          documentoAdjunto: sanitize(r.documentoAdjunto).slice(0, 200),
        };
      })
      .slice(0, 100);

    const safeChecklist: SafeChecklistEntry[] = checklist
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
          documentoNombre: sanitize(r.documentoNombre).slice(0, 200),
        };
      })
      .slice(0, 100);

    const caseDataAppendix = `\n\n${buildCaseDataSection({
      id, studentName, runEstudiante, course, fatherName,
      fechaApertura, estadoActual, fechaUltimaActualizacion,
      infractionType, managerName, isAulaSegura, conductaRiceId,
      observations, safeMedidas: safeMedidas,
      safeBitacora, safeChecklist,
    })}\n\nIMPORTANTE: Utiliza TODOS los antecedentes del expediente proporcionados arriba (bitácora, checklist, medidas ejecutadas) para fundamentar el documento.`;

    let systemPrompt = '';

    let dbPrompt: string | null = null;
    try {
      const tplRes = await fetch(
        getSupabaseRestUrl('document_templates?doc_type=eq.' + encodeURIComponent(docType) + '&select=system_prompt&limit=1'),
        {
          headers: {
            apikey: process.env.VITE_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!tplRes.ok) { throw new Error(`Template fetch failed: ${tplRes.status}`); }
      const tplData = (await tplRes.json()) as Array<{ system_prompt?: string }>;
      if (Array.isArray(tplData) && tplData.length > 0 && tplData[0].system_prompt) {
        dbPrompt = tplData[0].system_prompt;
      }
    } catch {
      /* fallback */
    }

    if (dbPrompt) {
      systemPrompt = dbPrompt;
    } else if (docType === 'notificacion_apertura') {
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

Utiliza la siguiente estructura completa con los datos del caso real:

DATOS DEL CASO:
- Estudiante: ${studentName} (Curso: ${course})
- Apoderado: ${fatherName}
- Infracción investigada: ${infractionType}
- Encargado del procedimiento: ${managerName}
${isAulaSegura ? '- NOTA: El caso se enmarca en Ley 21.128 (Aula Segura)' : ''}`;
    } else if (docType === 'citacion_entrevista') {
      systemPrompt = 'Actúa como un profesional experto en convivencia escolar, normativa educacional chilena y redacción institucional.\n\n' +
        'Redacta una "CITACIÓN A ENTREVISTA DE DESCARGOS" formal, objetiva y jurídicamente sólida.\n\n' +
        `DATOS DEL CASO:
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

    const responseText = await callGroq([
      { role: 'user', content: systemPrompt + caseDataAppendix },
    ]);

    res.json({ success: true, document: responseText });
  } catch (error: unknown) {
    console.error('Error al generar borrador de documento:', error);
    res.status(500).json({ error: 'Error interno del servidor al redactar documento.' });
  }
});

export default router;
