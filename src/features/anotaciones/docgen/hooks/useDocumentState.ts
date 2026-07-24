import { useState, useCallback } from 'react';
import {
  DEFAULT_LETTER_CONTENT,
  type DocType,
  type LetterContent,
} from '../DocumentPreview/docTypes';

export function useDocumentState() {
  const [docType, setDocType] = useState<DocType>('amonestacion');
  const [apoderadoName, setApoderadoName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [emittedBy, setEmittedBy] = useState('');
  const [compromisoStatus, setCompromisoStatus] = useState('pendiente');
  const [customCommitments, setCustomCommitments] = useState<string[]>([]);
  const [letterContent, setLetterContentState] = useState<LetterContent>(
    DEFAULT_LETTER_CONTENT.amonestacion
  );
  const [letterContentTouched, setLetterContentTouched] = useState(false);
  const [authorizedBypass, setAuthorizedBypass] = useState(false);
  const [authorizedDuplicate, setAuthorizedDuplicate] = useState(false);
  const [bypassProgressLock, setBypassProgressLock] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const setLetterContent = useCallback((next: LetterContent) => {
    setLetterContentState(next);
    setLetterContentTouched(true);
  }, []);

  const updateLetterContent = useCallback((field: keyof LetterContent, value: string) => {
    setLetterContentState((prev) => ({ ...prev, [field]: value }));
    setLetterContentTouched(true);
  }, []);

  const loadDefaultLetterContent = useCallback(
    (nextDocType: DocType) => {
      if (!letterContentTouched) setLetterContentState(DEFAULT_LETTER_CONTENT[nextDocType]);
    },
    [letterContentTouched]
  );

  const resetLetterContent = useCallback(
    (nextDocType: DocType = docType) => {
      setLetterContentState(DEFAULT_LETTER_CONTENT[nextDocType]);
      setLetterContentTouched(false);
    },
    [docType]
  );

  const handleAddCustomCommitment = useCallback((text: string) => {
    if (text.trim()) {
      setCustomCommitments((prev) => [...prev, text.trim()]);
    }
  }, []);

  const handleRemoveCustomCommitment = useCallback((index: number) => {
    setCustomCommitments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRegisterCommitment = useCallback(() => {
    // This will be overridden by the component with actual logic
  }, []);

  return {
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
    isRegistering,
    setIsRegistering,
    handleAddCustomCommitment,
    handleRemoveCustomCommitment,
    handleRegisterCommitment,
  };
}
