import { useState } from 'react';
import type { Causa, BitacoraEntry, UserRole } from '../../../types';
import { nowDateOnly, nowIso } from '../../../lib/dateUtils';
import { uploadDocument, listDocuments, deleteDocument } from '../../../services/storage.service';

interface UseDocumentManagerArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
  currentRole: UserRole;
  privacyMode: boolean;
  regName: string;
}

export function useDocumentManager({
  causa,
  onUpdateCausa,
  currentRole,
  privacyMode,
  regName,
}: UseDocumentManagerArgs) {
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const getResponsableName = () => {
    const r = causa.responsable;
    if (!r) { return 'Esteban Valenzuela'; }
    return r.split(' (')[0] || 'Esteban Valenzuela';
  };

  const refreshDocuments = async () => {
    setDocumentError(null);
    const list = await listDocuments(causa.id);
    setDocuments(list);
  };

  const handleAttachDocument = async (itemId: string, file: File | null) => {
    if (!file || currentRole === 'docente') { return; }
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
        if (item.id !== itemId) { return item; }
        return {
          ...item,
          documentoNombre: file.name,
          documentoUrl: publicUrl,
        };
      });

      const newLog: BitacoraEntry = {
        id: `b_doc_${crypto.randomUUID()}`,
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
    } catch (error: unknown) {
      setDocumentError(error instanceof Error ? error.message : 'Error al adjuntar el documento.');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleRemoveDocument = async (itemId: string, fileName?: string) => {
    if (currentRole === 'docente') { return; }
    setDocumentError(null);

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id !== itemId) { return item; }
      return {
        ...item,
        documentoNombre: undefined,
        documentoUrl: undefined,
      };
    });

    const newLog: BitacoraEntry = {
      id: `b_doc_del_${crypto.randomUUID()}`,
      fecha: nowIso(),
      tipo: 'Otro',
      titulo: 'Documento eliminado',
      descripcion: 'Se eliminó el documento adjunto del hito procesal.',
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

  return {
    documents,
    setDocuments,
    isUploadingDocument,
    documentError,
    handleAttachDocument,
    handleRemoveDocument,
    refreshDocuments,
  };
}
