/** @license SPDX-License-Identifier: Apache-2.0 */
import { getBaseChecklist } from '../shared/lib/data';
import { type Causa, EstadoCausa } from '../shared/lib/types';
import { nowDateOnly, nowIso } from '../shared/lib/dateUtils';

export function generateInitials(fullName: string): string {
  if (!fullName) {
    return 'N. N.';
  }
  return fullName
    .split(' ')
    .filter((word) => word.length >= 2)
    .map((word) => `${word[0].toUpperCase()}.`)
    .join(' ');
}

export function formatSequentialCaseId(counter: number, year = new Date().getFullYear()): string {
  const padding = counter < 10 ? `00${counter}` : counter < 100 ? `0${counter}` : `${counter}`;
  return `DC-${year}-${padding}`;
}

interface CreateDraftCausaArgs {
  counter: number;
  studentId?: string;
  incidenteId?: string;
  estudianteNombre: string;
  estudianteCurso: string;
  runEstudiante: string;
  tipoInfraccion: Causa['tipoInfraccion'];
  conductaRiceId?: string;
  comprometeAulaSegura: boolean;
  observaciones: string;
  responsable: string;
}

export function createDraftCausa({
  counter,
  studentId,
  incidenteId,
  estudianteNombre,
  estudianteCurso,
  runEstudiante,
  tipoInfraccion,
  conductaRiceId,
  comprometeAulaSegura,
  observaciones,
  responsable,
}: CreateDraftCausaArgs): Causa {
  const dateOnly = nowDateOnly();

  return {
    id: formatSequentialCaseId(counter),
    ...(studentId ? { studentId } : {}),
    ...(incidenteId ? { incidenteId } : {}),
    estudianteNombre,
    estudianteCurso,
    nnaProtectedName: generateInitials(estudianteNombre),
    runEstudiante,
    fechaApertura: dateOnly,
    estadoActual: EstadoCausa.DENUNCIA_RECEPCIONADA,
    tipoInfraccion,
    ...(conductaRiceId ? { conductaRiceId } : {}),
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
        descripcion:
          'Se inicia formalmente la tramitación del expediente de disciplina de conformidad con el Reglamento Interno (RIE) del colegio.',
        participantes: [responsable ? responsable.split(' (')[0] : 'Esteban Valenzuela'],
      },
    ],
    checklistDebidoProceso: getBaseChecklist(),
  };
}
