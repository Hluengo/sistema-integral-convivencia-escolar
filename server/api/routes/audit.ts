/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/requireTenant.js';
import type { AuthenticatedRequest } from '../../types.js';
import {
  isRequestValidationError,
  redactSensitiveForAI,
  requireStr,
  optStr,
} from '../validators/sanitizers.js';
import { callGeminiComplexGeneration } from '../services/gemini.js';
import { getRelevantLegalSources } from '../services/legalSources.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';

const router = Router();

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase administrativo no configurado.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

router.post(
  '/audit-due-process',
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  requireTenant,
  rateLimit,
  async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const causaId = optStr(body, 'causaId', 100) ?? requireStr(body, 'id', 100);
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId;
      if (!tenantId) {
        res.status(403).json({ error: 'No fue posible determinar el establecimiento autenticado.' });
        return;
      }

      const client = getAdminClient();
      const [causaResult, checklistResult, historyResult, progressResult] = await Promise.all([
        client
          .from('causas')
          .select(
            'id,tipo_infraccion,compromete_aula_segura,observaciones,estado_actual,fecha_apertura,fecha_inicio_investigacion,fecha_limite_investigacion,fecha_limite_cierre,conducta_rice_id,medidas_ejecutadas',
          )
          .eq('id', causaId)
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        client
          .from('checklist_items')
          .select(
            'id,label,descripcion,completado,fecha_completado,requerido_por,registrado_por,observaciones,documento_nombre',
          )
          .eq('causa_id', causaId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true }),
        client
          .from('bitacora_entries')
          .select('fecha,tipo,titulo,descripcion,documento_adjunto,created_at')
          .eq('causa_id', causaId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true })
          .limit(100),
        client
          .from('checklist_progress_entries')
          .select('checklist_item_id,title,description,entry_type,occurred_at,document_name,invalidated_at')
          .eq('causa_id', causaId)
          .eq('tenant_id', tenantId)
          .order('occurred_at', { ascending: true })
          .limit(150),
      ]);

      if (causaResult.error) throw causaResult.error;
      if (!causaResult.data) {
        res.status(404).json({ error: 'No se encontró la causa en el establecimiento actual.' });
        return;
      }
      if (checklistResult.error) throw checklistResult.error;
      if (historyResult.error) throw historyResult.error;
      if (progressResult.error) throw progressResult.error;

      const causa = causaResult.data;
      const infractionType = String(causa.tipo_infraccion ?? 'No registrada').slice(0, 100);
      const observations = String(causa.observaciones ?? '').slice(0, 5000);
      const knownSensitiveValues = [causaId, infractionType, observations];

      const safeChecklist = (checklistResult.data ?? []).slice(0, 100).map((item) => ({
        id: String(item.id ?? '').slice(0, 100),
        label: redactSensitiveForAI(item.label, knownSensitiveValues).slice(0, 300),
        description: redactSensitiveForAI(item.descripcion, knownSensitiveValues).slice(0, 1500),
        completed: Boolean(item.completado),
        completedAt: item.fecha_completado ?? null,
        requiredBy: redactSensitiveForAI(item.requerido_por, knownSensitiveValues).slice(0, 120),
        registeredBy: redactSensitiveForAI(item.registrado_por, knownSensitiveValues).slice(0, 120),
        observations: redactSensitiveForAI(item.observaciones, knownSensitiveValues).slice(0, 1500),
        documentName: redactSensitiveForAI(item.documento_nombre, knownSensitiveValues).slice(0, 250),
      }));

      const safeHistory = (historyResult.data ?? []).map((entry) => ({
        title: redactSensitiveForAI(entry.titulo, knownSensitiveValues).slice(0, 200),
        date: redactSensitiveForAI(entry.fecha, knownSensitiveValues).slice(0, 50),
        type: redactSensitiveForAI(entry.tipo, knownSensitiveValues).slice(0, 80),
        description: redactSensitiveForAI(entry.descripcion, knownSensitiveValues).slice(0, 2_000),
        document: redactSensitiveForAI(entry.documento_adjunto, knownSensitiveValues).slice(0, 250),
      }));

      const safeProgress = (progressResult.data ?? []).map((entry) => ({
        checklistItemId: String(entry.checklist_item_id ?? '').slice(0, 100),
        title: redactSensitiveForAI(entry.title, knownSensitiveValues).slice(0, 250),
        description: redactSensitiveForAI(entry.description, knownSensitiveValues).slice(0, 1500),
        type: redactSensitiveForAI(entry.entry_type, knownSensitiveValues).slice(0, 80),
        occurredAt: entry.occurred_at ?? null,
        documentName: redactSensitiveForAI(entry.document_name, knownSensitiveValues).slice(0, 250),
        invalidated: Boolean(entry.invalidated_at),
      }));

      const legalSources = await getRelevantLegalSources(
        `debido proceso norma previa comunicación hechos indagación descargos resolución fundada proporcionalidad reconsideración ${infractionType}`,
      );

      const systemInstruction = `Eres un auditor documental de debido proceso en convivencia escolar chilena.\n\nTu función es verificar la coherencia entre los hitos efectivamente registrados en un expediente y siete garantías del debido proceso. No calificas la responsabilidad del estudiante, no propones sanciones, no estimas multas y no agregas exigencias que no se desprendan de las fuentes autorizadas.\n\nUsa solo el expediente persistido y las fuentes jurídicas autorizadas incluidas por el sistema. Redacta en español formal de Chile, con tono técnico, neutral y verificable.`;

      const auditDossier = `FUENTES JURÍDICAS AUTORIZADAS:\n${legalSources}\n\nEXPEDIENTE PERSISTIDO:\n- Código: ${redactSensitiveForAI(causaId, knownSensitiveValues)}\n- Estado actual: ${redactSensitiveForAI(causa.estado_actual, knownSensitiveValues)}\n- Materia registrada: ${redactSensitiveForAI(infractionType, knownSensitiveValues)}\n- Conducta RICE registrada: ${redactSensitiveForAI(causa.conducta_rice_id, knownSensitiveValues)}\n- Referencia de procedimiento especial informada por el expediente: ${causa.compromete_aula_segura ? 'Sí' : 'No'}\n- Fecha de apertura: ${causa.fecha_apertura ?? 'No registrada'}\n- Inicio de indagación/investigación: ${causa.fecha_inicio_investigacion ?? 'No registrado'}\n- Fecha límite de indagación/investigación: ${causa.fecha_limite_investigacion ?? 'No registrada'}\n- Fecha límite de cierre: ${causa.fecha_limite_cierre ?? 'No registrada'}\n- Observaciones: ${redactSensitiveForAI(observations, knownSensitiveValues)}\n- Medidas ejecutadas: ${redactSensitiveForAI(JSON.stringify(causa.medidas_ejecutadas ?? [], null, 2), knownSensitiveValues)}\n- Checklist registrado: ${redactSensitiveForAI(JSON.stringify(safeChecklist, null, 2), knownSensitiveValues)}\n- Historial/bitácora registrado: ${JSON.stringify(safeHistory, null, 2)}\n- Progreso documental del checklist: ${JSON.stringify(safeProgress, null, 2)}\n\nEvalúa exclusivamente estas garantías:\n1. Existencia de una norma previa.\n2. Comunicación de los hechos.\n3. Indagación.\n4. Oportunidad de presentar descargos.\n5. Resolución fundada.\n6. Proporcionalidad.\n7. Derecho a solicitar reconsideración.\n\nPara cada garantía usa solo uno de estos estados: **Acreditado**, **Pendiente** o **No verificable con el expediente disponible**. No infieras que está cumplida solo por el nombre de una fase o de un checklist; identifica el hito, documento o registro persistido que la respalda. Si un registro fue invalidado, no lo uses como acreditación.\n\nDevuelve Markdown con esta estructura exacta:\n# Auditoría de debido proceso\n## Matriz de garantías\nUna tabla con: Garantía | Estado | Evidencia registrada | Brecha o acción documental pendiente.\n## Secuencia de hitos\nExplica brevemente si el orden documentado es coherente y qué antecedente falta registrar, si corresponde.\n## Fuentes consideradas\nLista solo los archivos y secciones de las fuentes autorizadas que efectivamente utilizaste.\n\nNo cites normas externas, no inventes plazos y no agregues explicaciones fuera de esta estructura.`;

      const responseText = await callGeminiComplexGeneration(systemInstruction, auditDossier, {
        maxOutputTokens: 3_200,
        timeoutMs: 18_000,
      });
      res.json({ success: true, report: responseText, provider: 'Gemini' });
    } catch (error) {
      if (isRequestValidationError(error)) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Error al auditar debido proceso:', error);
      const message = error instanceof Error ? error.message : 'Error al contactar Gemini.';
      const status =
        message.includes('generativelanguage.googleapis.com') && message.includes('tiempo máximo')
          ? 504
          : 503;
      res.status(status).json({
        error:
          status === 504
            ? 'Gemini tardó más de lo esperado al generar la auditoría. Intente nuevamente.'
            : 'Gemini no está disponible para generar la auditoría. Revise GEMINI_API_KEY y LEGAL_DRAFT_MODEL en Vercel.',
        provider: 'Gemini',
      });
    }
  },
);

export default router;
