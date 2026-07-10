/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Causa, EstadoCausa, ChecklistItem, Statistics } from './types';

// Helper to calculate relative dates from current time (2026-05-27)
const relativeDate = (daysAgo: number): string => {
  const date = new Date('2026-05-27T14:50:29Z');
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
 };

const relativeDateTime = (daysAgo: number, timeStr: string): string => {
  const dStr = relativeDate(daysAgo);
  return `${dStr}T${timeStr}:00Z`;
};

export const MAPPED_STATES: Record<EstadoCausa, { fase: 'Recepción' | 'Investigación' | 'Resolución' | 'Impugnación' | 'Seguimiento'; desc: string }> = {
  [EstadoCausa.DENUNCIA_RECEPCIONADA]: { fase: 'Recepción', desc: 'Se recibe formalmente el reporte, denuncia o antecedente inicial.' },
  [EstadoCausa.ANTECEDENTES_REVISION_INICIAL]: { fase: 'Recepción', desc: 'Se realiza acopio preliminar de información y verificación básica de los hechos.' },
  [EstadoCausa.INICIO_INDAGACION_NOTIFICADO]: { fase: 'Recepción', desc: 'Se informa formalmente al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.' },

  [EstadoCausa.EN_PROCESO_INDAGACION]: { fase: 'Investigación', desc: 'Investigación activa mediante entrevistas, revisión documental y recopilación de evidencias.' },
  [EstadoCausa.RECOPILACION_EVIDENCIAS_CURSO]: { fase: 'Investigación', desc: 'Estado intermedio para investigaciones complejas o extensas.' },
  [EstadoCausa.DERIVADO_A_MEDIACION]: { fase: 'Investigación', desc: 'El caso es abordado mediante estrategia alternativa/restaurativa autorizada reglamentariamente.' },
  [EstadoCausa.MEDIACION_EN_DESARROLLO]: { fase: 'Investigación', desc: 'Las partes participan activamente en proceso de resolución colaborativa.' },
  [EstadoCausa.MEDIACION_CERRADA_ACUERDO]: { fase: 'Investigación', desc: 'Se logra acuerdo restaurativo y se suspende o cierra el proceso disciplinario.' },
  [EstadoCausa.MEDIACION_FRACASADA_RETORNO]: { fase: 'Investigación', desc: 'No existe acuerdo o no se cumplen condiciones para mediación.' },

  [EstadoCausa.INFORME_CONCLUYENTE_ELABORACION]: { fase: 'Resolución', desc: 'El Encargado de Convivencia sistematiza antecedentes y redacta conclusiones.' },
  [EstadoCausa.INFORME_CONCLUYENTE_EMITIDO]: { fase: 'Resolución', desc: 'El informe técnico fue entregado a Dirección/Rectoría para resolución.' },
  [EstadoCausa.ENTREVISTA_DISCIPLINARIA_PENDIENTE]: { fase: 'Resolución', desc: 'Citación realizada a estudiante y apoderado para presentación de hallazgos.' },
  [EstadoCausa.ENTREVISTA_DISCIPLINARIA_REALIZADA]: { fase: 'Resolución', desc: 'Se efectuó audiencia disciplinaria y ejercicio del derecho a ser oído.' },
  [EstadoCausa.RESOLUCION_ELABORACION]: { fase: 'Resolución', desc: 'Rectoría o Dirección se encuentra determinando medida disciplinaria.' },
  [EstadoCausa.RESOLUCION_FINAL_NOTIFICADA]: { fase: 'Resolución', desc: 'Se entrega formalmente resolución disciplinaria al apoderado.' },

  [EstadoCausa.EN_PLAZO_APELACION]: { fase: 'Impugnación', desc: 'Se encuentra vigente el periodo reglamentario para presentar recurso de reconsideración.' },
  [EstadoCausa.APELACION_RECEPCIONADA]: { fase: 'Impugnación', desc: 'Se recibe formalmente recurso de reconsideración o apelación.' },
  [EstadoCausa.APELACION_REVISION_RECTORIA]: { fase: 'Impugnación', desc: 'Autoridad competente analiza antecedentes y emite resolución definitiva.' },
  [EstadoCausa.APELACION_RESUELTA]: { fase: 'Impugnación', desc: 'Se confirma, modifica o revoca la medida inicialmente aplicada.' },
  [EstadoCausa.RESOLUCION_EJECUTORIADA]: { fase: 'Impugnación', desc: 'Finaliza completamente el debido proceso administrativo interno.' },

  [EstadoCausa.MEDIDA_EJECUCION]: { fase: 'Seguimiento', desc: 'Se encuentra vigente la aplicación de medidas formativas o disciplinarias.' },
  [EstadoCausa.PROCESO_SEGUIMIENTO]: { fase: 'Seguimiento', desc: 'Se monitorea cumplimiento, conducta y evolución del estudiante.' },
  [EstadoCausa.SEGUIMIENTO_FINALIZADO]: { fase: 'Seguimiento', desc: 'Se concluye etapa de acompañamiento institucional.' },
  [EstadoCausa.CAUSA_CERRADA]: { fase: 'Seguimiento', desc: 'Procedimiento completamente finalizado y archivado.' },
};

export const FASES_LIST: { name: 'Recepción' | 'Investigación' | 'Resolución' | 'Impugnación' | 'Seguimiento'; color: string; bg: string; border: string }[] = [
  { name: 'Recepción', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'Investigación', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'Resolución', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Impugnación', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { name: 'Seguimiento', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' }
];

export const getFaseForEstado = (estado: EstadoCausa) => {
  return MAPPED_STATES[estado]?.fase || 'Recepción';
};

export const getBaseChecklist = (): ChecklistItem[] => [
  // 1. Recepción y Apertura (chk_rec_1, chk_rec_2, chk_rec_3)
  {
    id: 'chk_rec_1',
    label: 'Denuncia Recepcionada',
    descripcion: 'Se recibe formalmente el reporte, denuncia o antecedente inicial.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_rec_2',
    label: 'Antecedentes en Revisión Inicial',
    descripcion: 'Se realiza acopio preliminar de información y verificación básica de los hechos.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_rec_3',
    label: 'Inicio de Indagación Notificado',
    descripcion: 'Se informa formalmente al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.',
    completado: false,
    requeridoPor: 'Circular 482'
  },

  // 2. Estado de Investigación (chk_inv_1 a chk_inv_6)
  {
    id: 'chk_inv_1',
    label: 'En Proceso de Indagación',
    descripcion: 'Investigación activa mediante interviews, revisión documental y recopilación de evidencias.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_inv_2',
    label: 'Recopilación de Evidencias en Curso',
    descripcion: 'Estado intermedio para investigaciones complejas o extensas.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_3',
    label: 'Derivado a Mediación',
    descripcion: 'El caso es abordado mediante estrategia alternativa/restaurativa autorizada reglamentariamente.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_4',
    label: 'Mediación en Desarrollo',
    descripcion: 'Las partes participan activamente en proceso de resolución colaborativa.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_5',
    label: 'Mediación Cerrada con Acuerdo',
    descripcion: 'Se logra acuerdo restaurativo y se suspende o cierra el proceso disciplinario.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_inv_6',
    label: 'Mediación Fracasada – Retorno a Indagación',
    descripcion: 'No existe acuerdo o no se cumplen condiciones para mediación.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },

  // 3. Estado de Análisis y Resolución (chk_res_1 a chk_res_6)
  {
    id: 'chk_res_1',
    label: 'Informe Concluyente en Elaboración',
    descripcion: 'El Encargado de Convivencia sistematiza antecedentes y redacta conclusiones.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_res_2',
    label: 'Informe Concluyente Emitido',
    descripcion: 'El informe técnico fue entregado a Dirección/Rectoría para resolución.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_res_3',
    label: 'Entrevista Disciplinaria Pendiente',
    descripcion: 'Citación realizada a estudiante y apoderado para presentación de hallazgos.',
    completado: false,
    requeridoPor: 'Ambas'
  },
  {
    id: 'chk_res_4',
    label: 'Entrevista Disciplinaria Realizada',
    descripcion: 'Se efectuó audiencia disciplinaria y ejercicio del derecho a ser oído.',
    completado: false,
    requeridoPor: 'Ambas'
  },
  {
    id: 'chk_res_5',
    label: 'Resolución en Elaboración',
    descripcion: 'Rectoría o Dirección se encuentra determinando medida disciplinaria.',
    completado: false,
    requeridoPor: 'Ambas'
  },
  {
    id: 'chk_res_6',
    label: 'Resolución Final Notificada',
    descripcion: 'Se entrega formalmente resolución disciplinaria al apoderado.',
    completado: false,
    requeridoPor: 'Ambas'
  },

  // 4. Estado de Impugnación (chk_imp_1 a chk_imp_5)
  {
    id: 'chk_imp_1',
    label: 'En Plazo de Apelación',
    descripcion: 'Se encuentra vigente el periodo reglamentario para presentar recurso de reconsideración.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_2',
    label: 'Apelación Recepcionada',
    descripcion: 'Se recibe formalmente recurso de reconsideración o apelación.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_3',
    label: 'Apelación en Revisión por Rectoría',
    descripcion: 'Autoridad competente analiza antecedentes y emite resolución definitiva.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_4',
    label: 'Apelación Resuelta',
    descripcion: 'Se confirma, modifica o revoca la medida inicialmente aplicada.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },
  {
    id: 'chk_imp_5',
    label: 'Resolución Ejecutoriada',
    descripcion: 'Finaliza completamente el debido proceso administrativo interno.',
    completado: false,
    requeridoPor: 'Ley 21809'
  },

  // 5. Estado de Seguimiento (chk_seg_1 a chk_seg_4)
  {
    id: 'chk_seg_1',
    label: 'Medida en Ejecución',
    descripcion: 'Se encuentra vigente la aplicación de medidas formativas o disciplinarias.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_seg_2',
    label: 'En Proceso de Seguimiento',
    descripcion: 'Se monitorea cumplimiento, conducta y evolución del estudiante.',
    completado: false,
    requeridoPor: 'Circular 482'
  },
  {
    id: 'chk_seg_3',
    label: 'Seguimiento Finalizado',
    descripcion: 'Se concluye etapa de acompañamiento institucional.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  },
  {
    id: 'chk_seg_4',
    label: 'Causa Cerrada',
    descripcion: 'Procedimiento completamente finalizado y archivado.',
    completado: false,
    requeridoPor: 'Reglamento Interno'
  }
];

const buildChecklistForCausa = (
  completedItems: { id: string; registradoPor?: string; observaciones?: string; documentoNombre?: string; fechaCompletado?: string }[]
): ChecklistItem[] => {
  return getBaseChecklist().map(baseItem => {
    const override = completedItems.find(o => o.id === baseItem.id);
    if (override) {
      return {
        ...baseItem,
        completado: true,
        fechaCompletado: override.fechaCompletado || relativeDate(5),
        registradoPor: override.registradoPor || 'Esteban Valenzuela',
        observaciones: override.observaciones || 'Hito procesal cerrado conforme a debido proceso.',
        documentoNombre: override.documentoNombre,
        documentoUrl: override.documentoNombre ? '#' : undefined
      };
    }
    return baseItem;
  });
};

export const getStats = (causas: Causa[]): Statistics => {
  const stats: Statistics = {
    total: causas.length,
    porFase: {
      'Recepción': 0,
      'Investigación': 0,
      'Resolución': 0,
      'Impugnación': 0,
      'Seguimiento': 0
    },
    porGravedad: {
      'Leve': 0,
      'Grave': 0,
      'Muy Grave': 0,
      'Gravísima': 0
    },
    conPlazoCritico: 0,
    aulaSeguraActivas: 0
  };

  causas.forEach(c => {
    const fase = getFaseForEstado(c.estadoActual);
    stats.porFase[fase] += 1;

    stats.porGravedad[c.tipoInfraccion] = (stats.porGravedad[c.tipoInfraccion] || 0) + 1;

    if (c.comprometeAulaSegura) {
      stats.aulaSeguraActivas += 1;
    }

    if (c.estadoActual !== EstadoCausa.CAUSA_CERRADA && c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA) {
      if (c.comprometeAulaSegura) {
        stats.conPlazoCritico += 1;
      }
    }
  });

  return stats;
};

export const PHASE_PREFIXES: Record<string, string> = {
  'Recepción': 'chk_rec',
  'Investigación': 'chk_inv',
  'Resolución': 'chk_res',
  'Impugnación': 'chk_imp',
  'Seguimiento': 'chk_seg',
};

export const PHASE_SHORT: Record<string, string> = {
  'Recepción': 'Recep.',
  'Investigación': 'Invest.',
  'Resolución': 'Resoluc.',
  'Impugnación': 'Impugn.',
  'Seguimiento': 'Seguim.'
};

export function getPhaseProgress(checklist: Causa['checklistDebidoProceso'], phaseName: string) {
  const prefix = PHASE_PREFIXES[phaseName];
  if (!prefix) return { total: 0, completed: 0 };
  const items = checklist.filter(item => item.id.startsWith(prefix));
  const total = items.length;
  const completed = items.filter(item => item.completado).length;
  return { total, completed };
}
