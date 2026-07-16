import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireStr, optStr, optArr, sanitize, sanitizeForAI } from '../lib/validators.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { callGroq } from '../lib/groq.js';
import { httpsGet } from '../lib/https.js';

const router = Router();

router.post('/draft-document', requireAuth, async (req, res) => {
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
    const _nnaProtectedName = optStr(body, 'nnaProtectedName', 200);
    const fechaApertura = optStr(body, 'fechaApertura', 50);
    const estadoActual = optStr(body, 'estadoActual', 50);
    const fechaUltimaActualizacion = optStr(body, 'fechaUltimaActualizacion', 50);
    const medidasEjecutadas = optArr(body, 'medidasEjecutadas');
    const bitacora = optArr(body, 'bitacora');
    const checklist = optArr(body, 'checklist');

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res
        .status(429)
        .json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
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
          documentoAdjunto: sanitize(r.documentoAdjunto).slice(0, 200),
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
          documentoNombre: sanitize(r.documentoNombre).slice(0, 200),
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
${
  safeBitacora.length > 0
    ? safeBitacora
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
  safeChecklist.length > 0
    ? safeChecklist
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

=====================================================================`;

    const caseDataAppendix = `\n\n${caseDataSection}\n\nIMPORTANTE: Utiliza TODOS los antecedentes del expediente proporcionados arriba (bitácora, checklist, medidas ejecutadas) para fundamentar el documento.`;

    let systemPrompt = '';

    let dbPrompt = null;
    try {
      const templates = await httpsGet(
        'jjzwwhnofiepvliugowr.supabase.co',
        `/rest/v1/document_templates?doc_type=eq.${docType}&select=system_prompt&limit=1`,
        {
          apikey: process.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        }
      );
      if (Array.isArray(templates) && templates.length > 0 && templates[0].system_prompt) {
        dbPrompt = templates[0].system_prompt;
      }
    } catch {
      /* fallback to hardcoded */
    }

    if (dbPrompt) {
      systemPrompt = dbPrompt;
    } else if (docType === 'notificacion_apertura') {
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
      return res.status(400).json({
        error:
          'docType no válido. Use: notificacion_apertura, citacion_entrevista, informe_cierre_indagacion, informe_concluyente',
      });
    }

    const responseText = await callGroq([
      { role: 'user', content: systemPrompt + caseDataAppendix },
    ]);
    res.json({ success: true, document: responseText });
  } catch (error) {
    console.error('Error al generar borrador de documento:', error);
    const status = error.message?.startsWith('Campo requerido') ? 400 : 500;
    res.status(status).json({ error: 'Error interno del servidor al redactar documento.' });
  }
});

export default router;
