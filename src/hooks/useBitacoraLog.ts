import { useState } from 'react';
import { Causa, BitacoraEntry } from '../types';
import { nowDateOnly, nowIso } from '../lib/dateUtils';

interface UseBitacoraLogArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
}

export function useBitacoraLog({ causa, onUpdateCausa }: UseBitacoraLogArgs) {
  const [showLogForm, setShowLogForm] = useState<boolean>(false);
  const [logType, setLogType] = useState<BitacoraEntry['tipo']>('Entrevista');
  const [logTitle, setLogTitle] = useState<string>('');
  const [logDesc, setLogDesc] = useState<string>('');
  const [logParticipantes, setLogParticipantes] = useState<string>('');

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
    handleAddNewLog,
  };
}
