/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Causa } from '../types';
import { supabase } from '../lib/supabase';

interface UseAuditDraftArgs {
  causa: Causa;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn('No se pudo obtener sesión para auth headers:', err);
  }
  return headers;
}

export function useAuditDraft({ causa }: UseAuditDraftArgs) {
  const [aiSubTab, setAiSubTab] = useState<'auditoria' | 'borradores'>('auditoria');
  const [auditReport, setAuditReport] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  const [selectedDocType, setSelectedDocType] = useState<'notificacion_apertura' | 'citacion_entrevista' | 'informe_cierre_indagacion' | 'informe_concluyente'>('notificacion_apertura');
  const [fatherName, setFatherName] = useState<string>('');
  const [draftedDocument, setDraftedDocument] = useState<string>('');
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditReport('');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/audit-due-process', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: causa.id,
          studentName: causa.estudianteNombre,
          course: causa.estudianteCurso,
          infractionType: causa.tipoInfraccion,
          isAulaSegura: causa.comprometeAulaSegura,
          checkedItems: causa.checklistDebidoProceso.map(item => ({ label: item.label, completado: item.completado })),
          observations: causa.observaciones,
        }),
      });
      const data = await response.json();
      if (!isMountedRef.current) return;
      setAuditReport(data.success ? data.report : `**Error de Auditoría:** ${data.error}`);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setAuditReport(`**Error al comunicar con el servidor:** ${msg}`);
    } finally {
      if (isMountedRef.current) setIsAuditing(false);
    }
  };

  const handleDraftDocument = async () => {
    setIsDrafting(true);
    setDraftedDocument('');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/draft-document', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          docType: selectedDocType,
          id: causa.id,
          studentName: causa.estudianteNombre,
          course: causa.estudianteCurso,
          fatherName: fatherName || 'Apoderado Legal / Tutor',
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
      const data = await response.json();
      if (!isMountedRef.current) return;
      setDraftedDocument(data.success ? data.document : `**Error de Redacción:** ${data.error}`);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setDraftedDocument(`**Error de conexión:** ${msg}`);
    } finally {
      if (isMountedRef.current) setIsDrafting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(draftedDocument);
      setCopyFeedback(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(false);
      }, 2000);
    } catch (err) {
      console.warn('Clipboard no disponible (permiso denegado):', err);
    }
  };

  return {
    aiSubTab, setAiSubTab,
    auditReport, isAuditing,
    selectedDocType, setSelectedDocType,
    fatherName, setFatherName,
    draftedDocument, isDrafting, copyFeedback,
    handleRunAudit,
    handleDraftDocument,
    handleCopyToClipboard,
  };
}
