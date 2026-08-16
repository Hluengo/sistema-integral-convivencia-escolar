/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from 'react';
import { type Causa, EstadoCausa } from '@/shared/lib/types';
import { getFaseForEstado } from '@/shared/lib/data';
import {
  verificarPlazoInvestigacion,
  verificarPlazoSuspension,
  verificarPlazoNotificacionSuperintendencia,
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
} from '@/shared/lib/legalCompliance';

/**
 * Lógica pura de detección de brechas de debido proceso (Circular 482 / Ley 21809).
 * Separada del hook para poder testearla sin infraestructura de rendering.
 */
export function computeBreaches(causa: Causa): string[] {
  const result: string[] = [];
  const hasResguardo = causa.checklistDebidoProceso.find((c) => c.id === 'chk_inv_2')?.completado;
  const hasAcompanamiento = causa.checklistDebidoProceso.find(
    (c) => c.id === 'chk_seg_1',
  )?.completado;

  const casePhase = getFaseForEstado(causa.estadoActual);
  const isInInvestigacionOrBeyond =
    casePhase === 'Investigación' ||
    casePhase === 'Resolución' ||
    casePhase === 'Apelación' ||
    casePhase === 'Seguimiento';

  if (
    (causa.tipoInfraccion === 'Grave' ||
      causa.tipoInfraccion === 'Muy Grave' ||
      causa.tipoInfraccion === 'Gravísima') &&
    !hasResguardo &&
    isInInvestigacionOrBeyond
  ) {
    result.push(
      `Alerta de Resguardo: El expediente se clasifica como Falta ${causa.tipoInfraccion} pero no se ha decretado el 'Decreto de Apoyos y Medidas de Resguardo' (chk_inv_2) para proteger la integridad del menor según la Circular 482.`,
    );
  }

  if (
    (causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') &&
    !hasAcompanamiento &&
    causa.estadoActual === EstadoCausa.PROCESO_SEGUIMIENTO
  ) {
    result.push(
      "Alerta Socioemocional: En estado de Seguimiento para faltas de alta complejidad, se requiere establecer el 'Plan de Acompañamiento' (chk_seg_1) y compromisos formatorios.",
    );
  }

  if (causa.comprometeAulaSegura && causa.estadoActual === EstadoCausa.MEDIACION_EN_DESARROLLO) {
    result.push(
      'Contradicción Procedimental: El caso compromete Aula Segura (Ley 21.128), lo cual es legalmente incompatible con derivaciones o procesos de mediación activa.',
    );
  }

  const plazoInvestigacion = verificarPlazoInvestigacion(causa);
  if (plazoInvestigacion.estado === 'vencido') {
    result.push(
      `INCUMPLIMIENTO LEGAL: ${plazoInvestigacion.mensaje}. Máximo permitido: ${MAX_PLAZO_INVESTIGACION_DIAS} días hábiles (Ley 21809, Art. 16E, letra g).`,
    );
  } else if (plazoInvestigacion.estado === 'alerta') {
    result.push(`ALERTA LEGAL: ${plazoInvestigacion.mensaje}`);
  }

  const plazoSuspension = verificarPlazoSuspension(causa);
  if (plazoSuspension.estado === 'vencido') {
    result.push(
      `INCUMPLIMIENTO LEGAL: ${plazoSuspension.mensaje}. Máximo permitido: ${MAX_PLAZO_SUSPENSION_DIAS} días hábiles (Ley 21809, Art. 16E, letra j).`,
    );
  } else if (plazoSuspension.estado === 'alerta') {
    result.push(`ALERTA LEGAL: ${plazoSuspension.mensaje}`);
  }

  const plazoNotificacion = verificarPlazoNotificacionSuperintendencia(causa);
  if (plazoNotificacion.estado === 'vencido') {
    result.push(
      `INCUMPLIMIENTO LEGAL: ${plazoNotificacion.mensaje}. Plazo: ${MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS} días hábiles (Ley 21809, Art. 16E).`,
    );
  } else if (plazoNotificacion.estado === 'alerta') {
    result.push(`ALERTA LEGAL: ${plazoNotificacion.mensaje}`);
  }

  if (causa.esDenunciaConfidencial && !causa.identidadReservada) {
    result.push(
      'ALERTA LEGAL: La denuncia está marcada como confidencial pero no se ha reservado la identidad del denunciante (Ley 21809, Art. 16E, letra e).',
    );
  }

  if (causa.fechaInicioSuspension && !causa.monitoreoPedagogico) {
    result.push(
      'ALERTA LEGAL: La suspensión requiere monitoreo pedagógico obligatorio (Ley 21809, Art. 16E, letra j).',
    );
  }

  // Derecho a apelación: la resolución ejecutoriada presupone que se informó el
  // derecho a recurrir (chk_imp_1 = vigencia del plazo de reconsideración).
  const hasApelacionInformada = causa.checklistDebidoProceso.find(
    (c) => c.id === 'chk_imp_1',
  )?.completado;
  if (
    (causa.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA ||
      causa.estadoActual === EstadoCausa.CAUSA_CERRADA) &&
    !hasApelacionInformada
  ) {
    result.push(
      'ALERTA LEGAL: El expediente alcanzó resolución ejecutoriada sin registrar que se informó al apoderado su derecho a solicitar reconsideración o apelación (chk_imp_1).',
    );
  }

  // Priorizar medidas formativas sobre disciplinarias: si el expediente declara
  // medidas ejecutadas pero ninguna formativa, se contraviene el enfoque
  // formativo de la Circular 482.
  const medidas = causa.medidasEjecutadas ?? [];
  const hasMedidaDisciplinaria = medidas.some((m) =>
    /amonestaci|suspensi|expulsi|derivaci|compromiso/i.test(m),
  );
  const hasMedidaFormativa = medidas.some((m) =>
    /pedag|format|acompa|apoyo|taller|orientaci/i.test(m),
  );
  if (
    hasMedidaDisciplinaria &&
    !hasMedidaFormativa &&
    (causa.estadoActual === EstadoCausa.MEDIDA_EJECUCION ||
      causa.estadoActual === EstadoCausa.PROCESO_SEGUIMIENTO ||
      causa.estadoActual === EstadoCausa.CAUSA_CERRADA)
  ) {
    result.push(
      'ALERTA LEGAL: Se aplicaron medidas disciplinarias sin registrar medidas formativas previas; la Circular 482 exige priorizar el enfoque formativo antes de sancionar.',
    );
  }

  return result;
}

export function useBreaches(causa: Causa): string[] {
  return useMemo(() => computeBreaches(causa), [causa]);
}
