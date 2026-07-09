/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Causa, EstadoCausa, BitacoraEntry, ChecklistItem, UserRole } from '../types';
import { nowDateOnly, nowIso } from '../lib/dateUtils';
import { uploadDocument, listDocuments, deleteDocument } from '../lib/supabase';

interface UseProcessRegistrationArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
  currentRole: UserRole;
  privacyMode: boolean;
}

export function useProcessRegistration({
  causa,
  onUpdateCausa,
  currentRole,
  privacyMode,
}: UseProcessRegistrationArgs) {
  const [showLogForm, setShowLogForm] = useState<boolean>(false);
  const [logType, setLogType] = useState<BitacoraEntry['tipo']>('Entrevista');
  const [logTitle, setLogTitle] = useState<string>('');
  const [logDesc, setLogDesc] = useState<string>('');
  const [logParticipantes, setLogParticipantes] = useState<string>('');

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    recepcion: true,
    investigacion: true,
    resolucion: false,
    impugnacion: false,
    seguimiento: false,
  });
  const [registeringItemId, setRegisteringItemId] = useState<string | null>(null);
  const [regName, setRegName] = useState<string>('');
  const [regObservations, setRegObservations] = useState<string>('');
  const [regFileName, setRegFileName] = useState<string>('');
  const [regFile, setRegFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const getResponsableName = () => {
    const r = causa.responsable;
    if (!r) return 'Esteban Valenzuela';
    return r.split(' (')[0] || 'Esteban Valenzuela';
  };

  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = event.target.value;
    if (!Object.values(EstadoCausa).includes(raw as EstadoCausa)) return;
    const newState = raw as EstadoCausa;
    onUpdateCausa({
      ...causa,
      estadoActual: newState,
      fechaUltimaActualizacion: nowDateOnly(),
    });
  };

  const handleStartRegister = (item: ChecklistItem) => {
    setRegisteringItemId(item.id);
    setRegName(item.registradoPor || getResponsableName());
    setRegObservations(item.observaciones || '');
    setRegFileName(item.documentoNombre || '');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setRegFile(file);
    setRegFileName(file ? file.name : '');
  };

  const refreshDocuments = async () => {
    setDocumentError(null);
    const list = await listDocuments(causa.id);
    setDocuments(list);
  };

  const handleAttachDocument = async (itemId: string, file: File | null) => {
    if (!file || currentRole === 'docente') return;
    setIsUploadingDocument(true);
    setDocumentError(null);
    try {
      const publicUrl = await uploadDocument(causa.id, file);
      if (!publicUrl) {
        setDocumentError('No se pudo subir el documento. Verifique el bucket de Storage.');
        setIsUploadingDocument(false);
        return;
      }

      const updatedChecklist = causa.checklistDebidoProceso.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          documentoNombre: file.name,
          documentoUrl: publicUrl,
        };
      });

      const newLog: BitacoraEntry = {
        id: `b_doc_${Date.now()}`,
        fecha: nowIso(),
        tipo: 'Evidencia',
        titulo: `Documento adjunto: ${file.name}`,
        descripcion: `Se adjuntó el documento "${file.name}" al hito procesal.`,
        participantes: [regName || getResponsableName(), privacyMode ? causa.nnaProtectedName : causa.estudianteNombre],
      };

      onUpdateCausa({
        ...causa,
        checklistDebidoProceso: updatedChecklist,
        bitacora: [newLog, ...causa.bitacora],
        fechaUltimaActualizacion: nowDateOnly(),
      });

      await refreshDocuments();
    } catch (error: any) {
      setDocumentError(error?.message || 'Error al adjuntar el documento.');
    } finally {
      setIsUploadingDocument(false);
      setRegisteringItemId(null);
      setRegName('');
      setRegObservations('');
      setRegFileName('');
    }
  };

  const handleRemoveDocument = async (itemId: string, fileName?: string) => {
    if (currentRole === 'docente') return;
    setDocumentError(null);

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        documentoNombre: undefined,
        documentoUrl: undefined,
      };
    });

    const newLog: BitacoraEntry = {
      id: `b_doc_del_${Date.now()}`,
      fecha: nowIso(),
      tipo: 'Otro',
      titulo: 'Documento eliminado',
      descripcion: `Se eliminó el documento adjunto del hito procesal.`,
      participantes: [getResponsableName()],
    };

    onUpdateCausa({
      ...causa,
      checklistDebidoProceso: updatedChecklist,
      bitacora: [newLog, ...causa.bitacora],
      fechaUltimaActualizacion: nowDateOnly(),
    });

    if (fileName) {
      await deleteDocument(`${causa.id}/documentos/${fileName}`);
    }
    await refreshDocuments();
  };

  const handleSaveRegistration = async (itemId: string) => {
    if (currentRole === 'docente') return;

    const targetItem = causa.checklistDebidoProceso.find(item => item.id === itemId);
    const itemLabel = targetItem ? targetItem.label : 'Paso de Debido Proceso';

    const newLog: BitacoraEntry = {
      id: `b_step_${Date.now()}`,
      fecha: nowIso(),
      tipo: 'Notificación',
      titulo: `Registro de Hito: ${itemLabel}`,
      descripcion: `Se ha registrado formalmente la finalización de la etapa/acción "${itemLabel}". Responsable: ${regName || 'Esteban Valenzuela'}. Observaciones: ${regObservations}`,
      participantes: [regName || 'Esteban Valenzuela', privacyMode ? causa.nnaProtectedName : causa.estudianteNombre],
    };

    let documentoUrl: string | undefined = undefined;
    let documentoNombre: string | undefined = undefined;

    if (regFile) {
      const publicUrl = await uploadDocument(causa.id, regFile);
      if (publicUrl) {
        documentoUrl = publicUrl;
        documentoNombre = regFile.name;
      }
    }

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        completado: true,
        fechaCompletado: item.fechaCompletado || nowDateOnly(),
        registradoPor: regName || 'Esteban Valenzuela',
        observaciones: regObservations,
        documentoNombre,
        documentoUrl,
      };
    });

    onUpdateCausa({
      ...causa,
      checklistDebidoProceso: updatedChecklist,
      bitacora: [newLog, ...causa.bitacora],
      fechaUltimaActualizacion: nowDateOnly(),
    });

    setRegisteringItemId(null);
    setRegName('');
    setRegObservations('');
    setRegFileName('');
    setRegFile(null);
  };

  const handleResetRegistration = (itemId: string) => {
    if (currentRole === 'docente') return;

    const targetItem = causa.checklistDebidoProceso.find(item => item.id === itemId);
    const itemLabel = targetItem ? targetItem.label : 'Paso de Debido Proceso';

    const newLog: BitacoraEntry = {
      id: `b_step_reset_${Date.now()}`,
      fecha: nowIso(),
      tipo: 'Otro',
      titulo: `Invalidador Hito: ${itemLabel}`,
      descripcion: `Se ha anulado e invalidado formalmente el registro del hito "${itemLabel}". Se requiere volver a registrar este hito para la validez legal y resguardo normativo.`,
      participantes: [getResponsableName()],
    };

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        completado: false,
        fechaCompletado: undefined,
        registradoPor: undefined,
        observaciones: undefined,
        documentoNombre: undefined,
        documentoUrl: undefined,
      };
    });

    onUpdateCausa({
      ...causa,
      checklistDebidoProceso: updatedChecklist,
      bitacora: [newLog, ...causa.bitacora],
      fechaUltimaActualizacion: nowDateOnly(),
    });
  };

  const handleAddNewLog = (event: React.FormEvent) => {
    event.preventDefault();
    if (!logTitle || !logDesc) return;

    const participants = logParticipantes
      ? logParticipantes.split(',').map(value => value.trim())
      : ['No especificados'];

    const newEntry: BitacoraEntry = {
      id: `b_custom_${Date.now()}`,
      fecha: nowIso(),
      tipo: logType,
      titulo: logTitle,
      descripcion: logDesc,
      participantes: participants,
    };

    onUpdateCausa({
      ...causa,
      bitacora: [newEntry, ...causa.bitacora],
      fechaUltimaActualizacion: nowDateOnly(),
    });

    setLogTitle('');
    setLogDesc('');
    setLogParticipantes('');
    setShowLogForm(false);
  };

  return {
    showLogForm, setShowLogForm,
    logType, setLogType,
    logTitle, setLogTitle,
    logDesc, setLogDesc,
    logParticipantes, setLogParticipantes,
    expandedStages, setExpandedStages,
    registeringItemId, setRegisteringItemId,
    regName, setRegName,
    regObservations, setRegObservations,
    regFileName, setRegFileName,
    regFile,
    handleFileChange,
    handleStateChange,
    handleStartRegister,
    handleSaveRegistration,
    handleResetRegistration,
    handleAddNewLog,
    documents,
    setDocuments,
    isUploadingDocument,
    documentError,
    handleAttachDocument,
    handleRemoveDocument,
    refreshDocuments,
  };
}
