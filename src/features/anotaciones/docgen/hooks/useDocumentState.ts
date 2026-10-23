/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useEffect } from "react";
import { z } from "zod";
import { useSessionDraftKey } from "@/shared/lib/hooks/useSessionDraftKey";
import { readSessionDraft, writeSessionDraft } from "@/shared/lib/sessionDraft";
import {
  DEFAULT_LETTER_CONTENT,
  type DocType,
  type LetterContent,
} from "../DocumentPreview/docTypes";

const DOCUMENT_DEFAULTS = {
  docType: "amonestacion" as DocType,
  apoderadoName: "",
  inspectorName: "",
  coordinatorName: "",
  emittedBy: "",
  compromisoStatus: "pendiente",
  customCommitments: [] as string[],
  letterContent: DEFAULT_LETTER_CONTENT.amonestacion,
  letterContentTouched: false,
};
const documentDraftSchema = z
  .object({
    docType: z.enum(["amonestacion", "compromiso_conductual", "derivacion"]),
    apoderadoName: z.string(),
    inspectorName: z.string(),
    coordinatorName: z.string(),
    emittedBy: z.string(),
    compromisoStatus: z.string(),
    customCommitments: z.array(z.string()),
    letterContentTouched: z.boolean(),
    letterContent: z.object({
      motivo: z.string(),
      descripcion: z.string(),
      medida: z.string(),
      acuerdos: z.string(),
      cierre: z.string(),
      observaciones: z.string(),
    }),
  })
  .partial();

export function useDocumentState(recordId: string, enabled = true) {
  const scopedKey = useSessionDraftKey("letter", recordId);
  const draftKey = enabled ? scopedKey : null;
  const [draft] = useState(() =>
    readSessionDraft(draftKey, DOCUMENT_DEFAULTS, documentDraftSchema),
  );
  const [docType, setDocType] = useState<DocType>(draft.docType);
  const [apoderadoName, setApoderadoName] = useState(draft.apoderadoName);
  const [inspectorName, setInspectorName] = useState(draft.inspectorName);
  const [coordinatorName, setCoordinatorName] = useState(draft.coordinatorName);
  const [emittedBy, setEmittedBy] = useState(draft.emittedBy);
  const [compromisoStatus, setCompromisoStatus] = useState(
    draft.compromisoStatus,
  );
  const [customCommitments, setCustomCommitments] = useState<string[]>(
    draft.customCommitments,
  );
  const [letterContent, setLetterContentState] = useState<LetterContent>(
    draft.letterContent,
  );
  const [letterContentTouched, setLetterContentTouched] = useState(
    draft.letterContentTouched,
  );
  const [authorizedBypass, setAuthorizedBypass] = useState(false);
  const [authorizedDuplicate, setAuthorizedDuplicate] = useState(false);
  const [bypassProgressLock, setBypassProgressLock] = useState(false);

  useEffect(() => {
    writeSessionDraft(draftKey, {
      docType,
      apoderadoName,
      inspectorName,
      coordinatorName,
      emittedBy,
      compromisoStatus,
      customCommitments,
      letterContent,
      letterContentTouched,
    });
  }, [
    draftKey,
    docType,
    apoderadoName,
    inspectorName,
    coordinatorName,
    emittedBy,
    compromisoStatus,
    customCommitments,
    letterContent,
    letterContentTouched,
  ]);

  const setLetterContent = useCallback((next: LetterContent) => {
    setLetterContentState(next);
    setLetterContentTouched(true);
  }, []);

  const updateLetterContent = useCallback(
    (field: keyof LetterContent, value: string) => {
      setLetterContentState((prev) => ({ ...prev, [field]: value }));
      setLetterContentTouched(true);
    },
    [],
  );

  const loadDefaultLetterContent = useCallback(
    (nextDocType: DocType) => {
      if (!letterContentTouched)
        setLetterContentState(DEFAULT_LETTER_CONTENT[nextDocType]);
    },
    [letterContentTouched],
  );

  const resetLetterContent = useCallback(
    (nextDocType: DocType = docType) => {
      setLetterContentState(DEFAULT_LETTER_CONTENT[nextDocType]);
      setLetterContentTouched(false);
    },
    [docType],
  );

  const handleAddCustomCommitment = useCallback((text: string) => {
    if (text.trim()) {
      setCustomCommitments((prev) => [...prev, text.trim()]);
    }
  }, []);

  const handleRemoveCustomCommitment = useCallback((index: number) => {
    setCustomCommitments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    hasRestoredDraft: draft !== DOCUMENT_DEFAULTS,
    docType,
    setDocType,
    apoderadoName,
    setApoderadoName,
    inspectorName,
    setInspectorName,
    coordinatorName,
    setCoordinatorName,
    emittedBy,
    setEmittedBy,
    compromisoStatus,
    setCompromisoStatus,
    customCommitments,
    letterContent,
    setLetterContent,
    updateLetterContent,
    loadDefaultLetterContent,
    resetLetterContent,
    letterContentTouched,
    authorizedBypass,
    setAuthorizedBypass,
    authorizedDuplicate,
    setAuthorizedDuplicate,
    bypassProgressLock,
    setBypassProgressLock,
    handleAddCustomCommitment,
    handleRemoveCustomCommitment,
  };
}
