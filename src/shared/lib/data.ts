/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type Causa, EstadoCausa, type ChecklistItem, type Statistics } from './types';
import { toDateOnly } from '../../shared/lib/dateUtils';
import {
  getApplicableChecklistItems,
  getInvestigationChecklistProgress,
  PHASE_PREFIXES,
} from './domain/investigationChecklist';

// Helper to calculate relative dates from current time
const relativeDate = (daysAgo: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return toDateOnly(date);
};

const _relativeDateTime = (daysAgo: number, timeStr: string): string => {
  const dStr = relativeDate(daysAgo);
  return `${dStr}T${timeStr}:00Z`;
};

export const MAPPED_STATES: Record<
  EstadoCausa,
  { fase: 'Recepción' | 'Investigación' | 'Resolución' | 'Apelación' | 'Seguimiento'; desc: string }
> = {
  [EstadoCausa.DENUNCIA_RECEPCIONADA]: {
    fase: 'Recepción',
    desc: 'Se recibe formalmente el reporte, denuncia o antecedente inicial.',
  },
  [EstadoCausa.ANTECEDENTES_REVISION_INICIAL]: {
    fase: 'Recepción',
    desc: 'Se realiza acopio preliminar de información y verificación básica de los hechos.',
  },
  [EstadoCausa.INICIO_INDAGACION_NOTIFICADO]: {
    fase: 'Recepción',
    desc: 'Se informa formalmente al estudiante y al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.',
  },

  [EstadoCausa.EN_PROCESO_INDAGACION]: {
    fase: 'Investigación',
    desc: 'Investigación activa mediante entrevistas, revisión documental y recopilación de evidencias.',
  },
  [EstadoCausa.RECOPILACION_EVIDENCIAS_CURSO]: {
    fase: 'Investigación',
    desc: 'Estado intermedio para investigaciones complejas o extensas.',
  },
  [EstadoCausa.DERIVADO_A_MEDIACION]: {
    fase: 'Investigación',
    desc: 'El caso es abordado mediante estrategia alternativa/restaurativa autorizada reglamentariamente.',
  },
  [EstadoCausa.MEDIACION_EN_DESARROLLO]: {
    fase: 'Investigación',
    desc: 'Las partes participan activamente en proceso de resolución colaborativa.',
  },
  [EstadoCausa.MEDIACION_CERRADA_ACUERDO]: {
    fase: 'Investigación',
    desc: 'Se logra acuerdo restaurativo y se suspende o cierra el proceso disciplinario.',
  },
  [EstadoCausa.MEDIACION_FRACASADA_RETORNO]: {
    fase: 'Investigación',
    desc: 'No existe acuerdo o no se cumplen condiciones para mediación.',
  },

  [EstadoCausa.INFORME_CONCLUYENTE_ELABORACION]: {
    fase: 'Resolución',
    desc: 'El Encargado de la indagación sistematiza antecedentes y redacta conclusiones.',
  },
  [EstadoCausa.INFORME_CONCLUYENTE_EMITIDO]: {
    fase: 'Resolución',
    desc: 'El informe técnico fue entregado a Equipo de Convivencia Escolar para Revisión.',
  },
  [EstadoCausa.ENTREVISTA_DISCIPLINARIA_PENDIENTE]: {
    fase: 'Resolución',
    desc: 'Citación realizada a estudiante y apoderado para presentación de hallazgos.',
  },
  [EstadoCausa.ENTREVISTA_DISCIPLINARIA_REALIZADA]: {
    fase: 'Resolución',
    desc: 'Se efectuó audiencia disciplinaria y ejercicio del derecho a ser oído.',
  },
  [EstadoCausa.RESOLUCION_ELABORACION]: {
    fase: 'Resolución',
    desc: 'Equipo de Convivencia Escolar se encuentra determinando medida Formativa y disciplinaria.',
  },
  [EstadoCausa.RESOLUCION_FINAL_NOTIFICADA]: {
    fase: 'Resolución',
    desc: 'Se entrega formalmente resolución Formativa y disciplinaria al apoderado.',
  },

  [EstadoCausa.EN_PLAZO_APELACION]: {
    fase: 'Apelación',
    desc: 'Se encuentra vigente el periodo reglamentario para presentar recurso de reconsideración.',
  },
  [EstadoCausa.APELACION_RECEPCIONADA]: {
    fase: 'Apelación',
    desc: 'Se recibe formalmente recurso de reconsideración o apelación.',
  },
  [EstadoCausa.APELACION_REVISION_RECTORIA]: {
    fase: 'Apelación',
    desc: 'Autoridad competente analiza antecedentes y emite resolución definitiva.',
  },
  [EstadoCausa.APELACION_RESUELTA]: {
    fase: 'Apelación',
    desc: 'Se confirma, modifica o revoca la medida inicialmente aplicada.',
  },
  [EstadoCausa.RESOLUCION_EJECUTORIADA]: {
    fase: 'Apelación',
    desc: 'Finaliza completamente el debido proceso administrativo interno.',
  },

  [EstadoCausa.MEDIDA_EJECUCION]: {
    fase: 'Seguimiento',
    desc: 'Se encuentra vigente la aplicación de medidas formativas o disciplinarias.',
  },
  [EstadoCausa.PROCESO_SEGUIMIENTO]: {
    fase: 'Seguimiento',
    desc: 'Se monitorea cumplimiento, conducta y evolución del estudiante.',
  },
  [EstadoCausa.SEGUIMIENTO_FINALIZADO]: {
    fase: 'Seguimiento',
    desc: 'Se concluye etapa de acompañamiento institucional.',
  },
  [EstadoCausa.CAUSA_CERRADA]: {
    fase: 'Seguimiento',
    desc: 'Procedimiento completamente finalizado y archivado.',
  },
};

export const getFaseForEstado = (estado: EstadoCausa) => {
  return MAPPED_STATES[estado]?.fase || 'Recepción';
};

export const getBaseChecklist = (): ChecklistItem[] => [
  // 1. Recepción y Apertura (chk_rec_1, chk_rec_2, chk_rec_3)
  {
    id: 'chk_rec_1',
    label: 'Recepción de Denuncia',
    descripcion: 'Se recibe formalmente el reporte, denuncia o antecedente inicial.',
    completado: false,
    requeridoPor: 'Circular 482',
  },
  {
    id: 'chk_rec_2',
    label: 'Revisión Inicial de Antecedentes',
    descripcion: 'Se realiza acopio preliminar de información y verificación básica de los hechos.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },
  {
    id: 'chk_rec_3',
    label: 'Notificación de Inicio de Indagación',
    descripcion:
      'Se informa formalmente al estudiante y al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.',
    completado: false,
    requeridoPor: 'Circular 482',
  },

  // 2. Estado de Investigación (chk_inv_1 a chk_inv_6)
  {
    id: 'chk_inv_1',
    label: 'En Proceso de Indagación',
    descripcion:
      'Investigación activa mediante interviews, revisión documental y recopilación de evidencias.',
    completado: false,
    requeridoPor: 'Circular 482',
  },
  {
    id: 'chk_inv_2',
    label: 'Recopilación de Evidencias en Curso',
    descripcion: 'Estado intermedio para investigaciones complejas o extensas.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },
  {
    id: 'chk_inv_3',
    label: 'Derivado a Mediación',
    descripcion:
      'El caso es abordado mediante estrategia alternativa/restaurativa autorizada reglamentariamente.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },
  {
    id: 'chk_inv_4',
    label: 'Mediación en Desarrollo',
    descripcion: 'Las partes participan activamente en proceso de resolución colaborativa.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },
  {
    id: 'chk_inv_5',
    label: 'Mediación Cerrada con Acuerdo',
    descripcion: 'Se logra acuerdo restaurativo y se suspende o cierra el proceso disciplinario.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },
  {
    id: 'chk_inv_6',
    label: 'Mediación Fracasada – Retorno a Indagación',
    descripcion: 'No existe acuerdo o no se cumplen condiciones para mediación.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },

  // 3. Estado de Análisis y Resolución. chk_res_1, chk_res_3 y chk_res_5
  // se conservan para expedientes históricos, pero no son hitos operativos.
  {
    id: 'chk_res_1',
    label: 'Informe Cierre de Indagación en Elaboración',
    descripcion: 'El Encargado de la indagación sistematiza antecedentes y redacta conclusiones.',
    completado: false,
    requeridoPor: 'Circular 482',
  },
  {
    id: 'chk_res_2',
    label: 'Informe Cierre de Indagación Emitido',
    descripcion: 'El informe técnico fue entregado a Equipo de Convivencia Escolar para Revisión.',
    completado: false,
    requeridoPor: 'Circular 482',
  },
  {
    id: 'chk_res_3',
    label: 'Entrevista Disciplinaria Pendiente',
    descripcion: 'Citación realizada a estudiante y apoderado para presentación de hallazgos.',
    completado: false,
    requeridoPor: 'Ambas',
  },
  {
    id: 'chk_res_4',
    label: 'Entrevista Disciplinaria Realizada',
    descripcion: 'Se efectuó audiencia disciplinaria y ejercicio del derecho a ser oído.',
    completado: false,
    requeridoPor: 'Ambas',
  },
  {
    id: 'chk_res_5',
    label: 'Informe Concluyente en Elaboración',
    descripcion:
      'Equipo de Convivencia Escolar se encuentra determinando medida Formativa y disciplinaria.',
    completado: false,
    requeridoPor: 'Ambas',
  },
  {
    id: 'chk_res_6',
    label: 'Informe Concluyente Emitido',
    descripcion: 'Se entrega formalmente resolución Formativa y disciplinaria al apoderado.',
    completado: false,
    requeridoPor: 'Ambas',
  },

  // 4. Estado de Apelación. chk_imp_3 es estado interno de revisión.
  {
    id: 'chk_imp_1',
    label: 'Derecho a Apelación Informado',
    descripcion:
      'Se informa al estudiante y al apoderado el derecho a recurrir y el plazo reglamentario aplicable.',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_imp_2',
    label: 'Apelación Recepcionada',
    descripcion: 'Se recibe formalmente recurso de reconsideración o apelación.',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_imp_3',
    label: 'Apelación en Revisión por Rectoría',
    descripcion: 'Autoridad competente analiza antecedentes y emite resolución definitiva.',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_imp_4',
    label: 'Apelación Resuelta',
    descripcion: 'Se confirma, modifica o revoca la medida inicialmente aplicada.',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_imp_5',
    label: 'Resolución Ejecutoriada',
    descripcion: 'Finaliza completamente el debido proceso administrativo interno.',
    completado: false,
    requeridoPor: 'Ley 21809',
  },

  // 5. Estado de Seguimiento. chk_seg_2 se integra con el plan/medida.
  {
    id: 'chk_seg_1',
    label: 'Medida o Plan de Acompañamiento Iniciado',
    descripcion:
      'Se inicia la aplicación de la medida formativa o disciplinaria y el plan de acompañamiento correspondiente.',
    completado: false,
    requeridoPor: 'Circular 482',
  },
  {
    id: 'chk_seg_2',
    label: 'En Proceso de Seguimiento',
    descripcion: 'Se monitorea cumplimiento, conducta y evolución del estudiante.',
    completado: false,
    requeridoPor: 'Circular 482',
  },
  {
    id: 'chk_seg_3',
    label: 'Seguimiento Finalizado',
    descripcion: 'Se concluye etapa de acompañamiento institucional.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },
  {
    id: 'chk_seg_4',
    label: 'Causa Cerrada',
    descripcion: 'Procedimiento completamente finalizado y archivado.',
    completado: false,
    requeridoPor: 'Reglamento Interno',
  },

  // 6. Cumplimiento Legal Obligatorio (Ley 21809)
  {
    id: 'chk_legal_1',
    label: 'Canal Confidencial Activado',
    descripcion:
      'Se ha activado el canal seguro y confidencial para la denuncia con reserva de identidad del denunciante (Ley 21809, Art. 16E.e).',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_legal_2',
    label: 'Plazo de Investigación Controlado',
    descripcion:
      'Se ha registrado el inicio de investigación y se controla el plazo máximo de 60 días hábiles (Ley 21809, Art. 16E.g).',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_legal_3',
    label: 'Medidas de Protección de Víctima',
    descripcion:
      'Se han determinado medidas de protección para la persona afectada desde el conocimiento de los hechos (Ley 21809, Art. 16E.j).',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_legal_4',
    label: 'Suspensión Dentro de Plazo Legal',
    descripcion:
      'La suspensión no excede los 15 días hábiles y se ha implementado monitoreo pedagógico obligatorio (Ley 21809, Art. 16E.j).',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_legal_5',
    label: 'Verificación NEE/Discapacidad',
    descripcion:
      'Se ha verificado que el estudiante no tiene NEE o discapacidad que pudiera fundamentar sanciones discriminatorias (Ley 21809, Art. 16E).',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
  {
    id: 'chk_legal_6',
    label: 'Notificación a Superintendencia',
    descripcion:
      'Se ha notificado a la Superintendencia de Educación dentro de los 5 días hábiles en caso de expulsión (Ley 21809, Art. 16E).',
    completado: false,
    requeridoPor: 'Ley 21809',
  },
];

const _buildChecklistForCausa = (
  completedItems: {
    id: string;
    registradoPor?: string;
    observaciones?: string;
    documentoNombre?: string;
    fechaCompletado?: string;
  }[],
): ChecklistItem[] => {
  return getBaseChecklist().map((baseItem) => {
    const override = completedItems.find((o) => o.id === baseItem.id);
    if (override) {
      return {
        ...baseItem,
        completado: true,
        fechaCompletado: override.fechaCompletado || relativeDate(5),
        registradoPor: override.registradoPor || 'Esteban Valenzuela',
        observaciones: override.observaciones || 'Hito procesal cerrado conforme a debido proceso.',
        documentoNombre: override.documentoNombre,
        documentoUrl: override.documentoNombre ? '#' : undefined,
      };
    }
    return baseItem;
  });
};

export const getStats = (causas: Causa[]): Statistics => {
  const stats: Statistics = {
    total: causas.length,
    porFase: {
      Recepción: 0,
      Investigación: 0,
      Resolución: 0,
      Apelación: 0,
      Seguimiento: 0,
    },
    porGravedad: {
      Leve: 0,
      Grave: 0,
      'Muy Grave': 0,
      Gravísima: 0,
    },
    conPlazoCritico: 0,
    aulaSeguraActivas: 0,
  };

  causas.forEach((c) => {
    const fase = getFaseForEstado(c.estadoActual);
    stats.porFase[fase] += 1;

    stats.porGravedad[c.tipoInfraccion] = (stats.porGravedad[c.tipoInfraccion] || 0) + 1;

    if (c.comprometeAulaSegura) {
      stats.aulaSeguraActivas += 1;
    }

    if (
      c.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
      c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
    ) {
      if (c.comprometeAulaSegura) {
        stats.conPlazoCritico += 1;
      }
    }
  });

  return stats;
};

export function getPhaseProgress(
  causaOrChecklist: Causa | Causa['checklistDebidoProceso'],
  phaseName: string,
) {
  if (!(phaseName in PHASE_PREFIXES)) {
    return { total: 0, completed: 0 };
  }

  const phase = phaseName as keyof typeof PHASE_PREFIXES;
  if (phase === 'Investigación') {
    const context = Array.isArray(causaOrChecklist)
      ? { checklistDebidoProceso: causaOrChecklist }
      : causaOrChecklist;
    return getInvestigationChecklistProgress(context);
  }

  const context = Array.isArray(causaOrChecklist)
    ? { checklistDebidoProceso: causaOrChecklist }
    : causaOrChecklist;
  const items = getApplicableChecklistItems(context, phase);
  const total = items.length;
  const completed = items.filter((item) => item.completado).length;
  return { total, completed };
}
