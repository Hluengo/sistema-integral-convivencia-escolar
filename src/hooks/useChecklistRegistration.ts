import { useState } from 'react';
import type { Causa, ChecklistItem, BitacoraEntry, UserRole } from '../types';
import { nowDateOnly, nowIso } from '../lib/dateUtils';
import { uploadDocument } from '../lib/supabase';

interface UseChecklistRegistrationArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
  currentRole: UserRole;
  privacyMode: boolean;
}

export function useChecklistRegistration({
  causa,
  onUpdateCausa,
  currentRole,
  privacyMode,
}: UseChecklistRegistrationArgs) {
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

  const getResponsableName = () => {
    const r = causa.responsable;
    if (!r) { return 'Esteban Valenzuela'; }
    return r.split(' (')[0] || 'Esteban Valenzuela';
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

  const handleSaveRegistration = async (itemId: string) => {
    if (currentRole === 'docente') { return; }

    const targetItem = causa.checklistDebidoProceso.find(item => item.id === itemId);
    const itemLabel = targetItem ? targetItem.label : 'Paso de Debido Proceso';

    const newLog: BitacoraEntry = {
      id: `b_step_${crypto.randomUUID()}`,
      fecha: nowIso(),
      tipo: 'Notificación',
      titulo: `Registro de Hito: ${itemLabel}`,
      descripcion: `Se ha registrado formalmente la finalización de la etapa/acción "${itemLabel}". Responsable: ${regName || 'Esteban Valenzuela'}. Observaciones: ${regObservations}`,
      participantes: [regName || 'Esteban Valenzuela', privacyMode ? causa.nnaProtectedName : causa.estudianteNombre],
    };

    let documentoUrl: string | undefined ;
    let documentoNombre: string | undefined ;

    if (regFile) {
      const publicUrl = await uploadDocument(causa.id, regFile);
      if (publicUrl) {
        documentoUrl = publicUrl;
        documentoNombre = regFile.name;
        newLog.documentoAdjunto = publicUrl;
      }
    }

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id !== itemId) { return item; }
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
    if (currentRole === 'docente') { return; }

    const targetItem = causa.checklistDebidoProceso.find(item => item.id === itemId);
    const itemLabel = targetItem ? targetItem.label : 'Paso de Debido Proceso';

    const newLog: BitacoraEntry = {
      id: `b_step_reset_${crypto.randomUUID()}`,
      fecha: nowIso(),
      tipo: 'Otro',
      titulo: `Invalidador Hito: ${itemLabel}`,
      descripcion: `Se ha anulado e invalidado formalmente el registro del hito "${itemLabel}". Se requiere volver a registrar este hito para la validez legal y resguardo normativo.`,
      participantes: [getResponsableName()],
    };

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id !== itemId) { return item; }
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

  return {
    expandedStages, setExpandedStages,
    registeringItemId, setRegisteringItemId,
    regName, setRegName,
    regObservations, setRegObservations,
    regFileName, setRegFileName,
    regFile,
    handleFileChange,
    handleStartRegister,
    handleSaveRegistration,
    handleResetRegistration,
  };
}
