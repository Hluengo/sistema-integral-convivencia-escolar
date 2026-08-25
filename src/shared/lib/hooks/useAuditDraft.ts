/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import type { Causa } from '../types';
import { supabase } from '../../api/lib/supabase';

interface UseAuditDraftArgs {
  causa: Causa;
}

export interface DraftProgress {
  phase:
    | 'preparing'
    | 'checklist'
    | 'documents'
    | 'document'
    | 'sources'
    | 'template'
    | 'generation'
    | 'completed'
    | 'error';
  message: string;
  checklist?: Array<{ label: string; complete: boolean }>;
  documents?: string[];
  document?: { name: string; index: number; total: number };
}

async function readDraftResponse(
  response: Response,
  onProgress: (progress: DraftProgress) => void,
): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.json()) as Record<string, unknown>;

  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent: Record<string, unknown> | null = null;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as Record<string, unknown>;
    if (event.type === 'progress') onProgress(event as unknown as DraftProgress);
    else finalEvent = event;
  };

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(consume);
    if (done) break;
  }
  consume(buffer);
  return finalEvent ?? { error: 'El servidor no devolvió el resultado del informe.' };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn('No se pudo obtener sesión para auth headers:', err);
  }
  return headers;
}

export function useAuditDraft({ causa }: UseAuditDraftArgs) {
  const [auditReport, setAuditReport] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  const [selectedDocType, setSelectedDocType] = useState<
    'informe_cierre_indagacion' | 'informe_concluyente'
  >('informe_cierre_indagacion');
  const [draftedDocument, setDraftedDocument] = useState<string>('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState<DraftProgress | null>(null);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const isMountedRef = useRef(true);
  const auditAbortRef = useRef<AbortController | null>(null);
  const draftAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancela las peticiones en vuelo si el componente se desmonta.
      auditAbortRef.current?.abort();
      draftAbortRef.current?.abort();
    };
  }, []);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditReport('');
    try {
      const headers = await getAuthHeaders();
      auditAbortRef.current?.abort();
      const controller = new AbortController();
      auditAbortRef.current = controller;
      const response = await fetch('/api/audit-due-process', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          id: causa.id,
          studentName: causa.estudianteNombre,
          course: causa.estudianteCurso,
          infractionType: causa.tipoInfraccion,
          isAulaSegura: causa.comprometeAulaSegura,
          bitacora: causa.bitacora,
          checkedItems: causa.checklistDebidoProceso.map((item) => ({
            label: item.label,
            completado: item.completado,
          })),
          observations: causa.observaciones,
        }),
      });
      const data = await response.json();
      if (!isMountedRef.current) {
        return;
      }
      setAuditReport(data.success ? data.report : `**Error de Auditoría:** ${data.error}`);
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setAuditReport(`**Error al comunicar con el servidor:** ${msg}`);
    } finally {
      if (isMountedRef.current) {
        setIsAuditing(false);
      }
    }
  };

  const handleDraftDocument = async () => {
    setIsDrafting(true);
    setDraftedDocument('');
    setDraftError(null);
    setDraftProgress({ phase: 'preparing', message: 'Preparando el dossier del expediente.' });
    try {
      const headers = await getAuthHeaders();
      draftAbortRef.current?.abort();
      const controller = new AbortController();
      draftAbortRef.current = controller;
      const response = await fetch('/api/draft-document', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          docType: selectedDocType,
          id: causa.id,
          studentName: causa.estudianteNombre,
          course: causa.estudianteCurso,
          fatherName: '',
          managerName: causa.responsable,
          infractionType: causa.tipoInfraccion,
          observations: causa.observaciones,
          isAulaSegura: causa.comprometeAulaSegura,
          bitacora: causa.bitacora,
          checklist: causa.checklistDebidoProceso,
          medidasEjecutadas: causa.medidasEjecutadas,
          conductaRiceId: causa.conductaRiceId,
          runEstudiante: causa.runEstudiante,
          nnaProtectedName: causa.nnaProtectedName,
          fechaApertura: causa.fechaApertura,
          estadoActual: causa.estadoActual,
          fechaUltimaActualizacion: causa.fechaUltimaActualizacion,
        }),
      });
      const data = await readDraftResponse(response, (progress) => {
        if (isMountedRef.current) {
          setDraftProgress((current) => (current ? { ...current, ...progress } : progress));
        }
      });
      if (!isMountedRef.current) {
        return;
      }
      if (data.success) {
        setDraftedDocument(String(data.document ?? ''));
      } else {
        const errorMessage = String(data.error ?? 'No fue posible generar el borrador.');
        setDraftError(errorMessage);
        setDraftProgress((current) => ({
          phase: 'error',
          message: errorMessage,
          checklist: current?.checklist,
          documents: current?.documents,
        }));
      }
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setDraftError(`Error de conexión: ${msg}`);
    } finally {
      if (isMountedRef.current) {
        setIsDrafting(false);
      }
    }
  };

  return {
    auditReport,
    isAuditing,
    selectedDocType,
    setSelectedDocType,
    draftedDocument,
    setDraftedDocument,
    draftError,
    draftProgress,
    isDrafting,
    handleRunAudit,
    handleDraftDocument,
  };
}
