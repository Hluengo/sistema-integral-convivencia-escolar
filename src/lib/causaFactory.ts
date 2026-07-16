import { getBaseChecklist } from '../data';
import { type Causa, EstadoCausa } from '../types';
import { nowDateOnly, nowIso } from './dateUtils';

export function generateInitials(fullName: string): string {
  if (!fullName) { return 'N. N.'; }
  return fullName
    .split(' ')
    .filter(word => word.length >= 2)
    .map(word => `${word[0].toUpperCase()}.`)
    .join(' ');
}

export function formatSequentialCaseId(counter: number, year = new Date().getFullYear()): string {
  const padding = counter < 10 ? `00${counter}` : counter < 100 ? `0${counter}` : `${counter}`;
  return `DC-${year}-${padding}`;
}

interface CreateDraftCausaArgs {
  counter: number;
  estudianteNombre: string;
  estudianteCurso: string;
  runEstudiante: string;
  tipoInfraccion: Causa['tipoInfraccion'];
  comprometeAulaSegura: boolean;
  observaciones: string;
  responsable: string;
}

export function createDraftCausa({
  counter,
  estudianteNombre,
  estudianteCurso,
  runEstudiante,
  tipoInfraccion,
  comprometeAulaSegura,
  observaciones,
  responsable,
}: CreateDraftCausaArgs): Causa {
  const dateOnly = nowDateOnly();

  return {
    id: formatSequentialCaseId(counter),
    estudianteNombre,
    estudianteCurso,
    nnaProtectedName: generateInitials(estudianteNombre),
    runEstudiante,
    fechaApertura: dateOnly,
    estadoActual: EstadoCausa.DENUNCIA_RECEPCIONADA,
    tipoInfraccion,
    responsable,
    comprometeAulaSegura,
    fechaUltimaActualizacion: dateOnly,
    observaciones: observaciones || 'Registro inicial del procedimiento regulado.',
    bitacora: [
      {
        id: `b_init_${Date.now()}`,
        fecha: nowIso(),
        tipo: 'Otro',
        titulo: 'Apertura formal de Causa de Convivencia',
        descripcion: 'Se inicia formalmente la tramitación del expediente de disciplina de conformidad con el Reglamento Interno (RIE) del colegio.',
        participantes: [responsable ? responsable.split(' (')[0] : 'Esteban Valenzuela'],
      },
    ],
    checklistDebidoProceso: getBaseChecklist(),
  };
}
