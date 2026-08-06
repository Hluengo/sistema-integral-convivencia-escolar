import { useState } from 'react';
import type { Causa, BitacoraEntry, UserRole } from '../types';
import { nowDateOnly, nowIso } from '../../../shared/lib/dateUtils';
import { uploadDocument, listDocuments, deleteDocument } from '../../api/services/storage.service';

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
    const fromResponsable = r ? r.split(' (')[0] : '';
    // Evita nombres por defecto que no existen en el sistema: si no hay
    // responsable registrado se usa el nombre de quien registra o un rol
    // institucional genérico, nunca una persona inventada.
    return fromResponsable || regName || 'Equipo de Convivencia Escolar';
  };

  const refreshDocuments = async () => {
    setDocumentError(null);
    try {
      const list = await listDocuments(causa.id);
      setDocuments(list);
    } catch (error: unknown) {
      setDocumentError(
        error instanceof Error ? error.message : 'Error al listar los documentos adjuntos.',
      );
    }
  };

  const handleAttachDocument = async (itemId: string, file: File | null) => {
    if (!file || currentRole === 'docente') {
      return;
    }
    setIsUploadingDocument(true);
    setDocumentError(null);
    try {
      const publicUrl = await uploadDocument(causa.id, file);
      if (!publicUrl) {
        setDocumentError('No se pudo subir el documento. Verifique el bucket de Storage.');
        setIsUploadingDocument(false);
        return;
      }

      const updatedChecklist = causa.checklistDebidoProceso.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
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
        participantes: [
          regName || getResponsableName(),
          privacyMode ? causa.nnaProtectedName : causa.estudianteNombre,
        ],
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
    if (currentRole === 'docente') {
      return;
    }
    setDocumentError(null);

    const previousCausa = causa;
    const updatedChecklist = causa.checklistDebidoProceso.map((item) => {
      if (item.id !== itemId) {
        return item;
      }
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
      participantes: [regName || getResponsableName()],
    };

    // Mutación optimista: se refleja de inmediato en la UI.
    onUpdateCausa({
      ...causa,
      checklistDebidoProceso: updatedChecklist,
      bitacora: [newLog, ...causa.bitacora],
      fechaUltimaActualizacion: nowDateOnly(),
    });

    try {
      if (fileName) {
        await deleteDocument(`${causa.id}/documentos/${fileName}`);
      }
      await refreshDocuments();
    } catch (error: unknown) {
      // Rollback de la mutación optimista para no dejar la UI divergente
      // del almacenamiento (el archivo sigue existiendo si falló la baja).
      onUpdateCausa(previousCausa);
      setDocumentError(
        error instanceof Error ? error.message : 'Error al eliminar el documento adjunto.',
      );
      await refreshDocuments();
    }
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
