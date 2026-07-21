import { useState, useCallback } from 'react';

type DocType = 'amonestacion' | 'compromiso_conductual' | 'derivacion';

interface DocumentState {
  docType: DocType;
  apoderadoName: string;
  inspectorName: string;
  coordinatorName: string;
  emittedBy: string;
  docObservations: string;
  compromisoStatus: string;
  customCommitments: string[];
  authorizedBypass: boolean;
  authorizedDuplicate: boolean;
  bypassProgressLock: boolean;
  isRegistering: boolean;
}

export function useDocumentState() {
  const [docType, setDocType] = useState<'amonestacion' | 'compromiso_conductual' | 'derivacion'>('amonestacion');
  const [apoderadoName, setApoderadoName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [emittedBy, setEmittedBy] = useState('');
  const [docObservations, setDocObservations] = useState('');
  const [compromisoStatus, setCompromisoStatus] = useState('pendiente');
  const [customCommitments, setCustomCommitments] = useState<string[]>([]);
  const [authorizedBypass, setAuthorizedBypass] = useState(false);
  const [authorizedDuplicate, setAuthorizedDuplicate] = useState(false);
  const [bypassProgressLock, setBypassProgressLock] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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
    // State
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
    docObservations,
    setDocObservations,
    compromisoStatus,
    setCompromisoStatus,
    customCommitments,
    authorizedBypass,
    setAuthorizedBypass,
    authorizedDuplicate,
    setAuthorizedDuplicate,
    bypassProgressLock,
    setBypassProgressLock,
    isRegistering,
    setIsRegistering,
    // Actions
    handleAddCustomCommitment,
    handleRemoveCustomCommitment,
    handleRegisterCommitment,
  };
}