import { useMemo } from 'react';
import { type Causa, EstadoCausa } from '@/src/types';
import { getFaseForEstado } from '@/src/data';
import {
  verificarPlazoInvestigacion,
  verificarPlazoSuspension,
  verificarPlazoNotificacionSuperintendencia,
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
} from '@/src/lib/legalCompliance';

export function useBreaches(causa: Causa): string[] {
  return useMemo(() => {
    const result: string[] = [];
    const hasResguardo = causa.checklistDebidoProceso.find((c) => c.id === 'chk_inv_2')?.completado;
    const hasAcompanamiento = causa.checklistDebidoProceso.find((c) => c.id === 'chk_seg_1')?.completado;

    const casePhase = getFaseForEstado(causa.estadoActual);
    const isInInvestigacionOrBeyond =
      casePhase === 'Investigación' || casePhase === 'Resolución' ||
      casePhase === 'Apelación' || casePhase === 'Seguimiento';

    if (
      (causa.tipoInfraccion === 'Grave' || causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') &&
      !hasResguardo && isInInvestigacionOrBeyond
    ) {
      result.push(
        `Alerta de Resguardo: El expediente se clasifica como Falta ${causa.tipoInfraccion} pero no se ha decretado el 'Decreto de Apoyos y Medidas de Resguardo' (chk_inv_2) para proteger la integridad del menor según la Circular 482.`
      );
    }

    if (
      (causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') &&
      !hasAcompanamiento && causa.estadoActual === EstadoCausa.PROCESO_SEGUIMIENTO
    ) {
      result.push(
        "Alerta Socioemocional: En estado de Seguimiento para faltas de alta complejidad, se requiere establecer el 'Plan de Acompañamiento' (chk_seg_1) y compromisos formatorios."
      );
    }

    if (causa.comprometeAulaSegura && causa.estadoActual === EstadoCausa.MEDIACION_EN_DESARROLLO) {
      result.push('Contradicción Procedimental: El caso compromete Aula Segura (Ley 21.128), lo cual es legalmente incompatible con derivaciones o procesos de mediación activa.');
    }

    const plazoInvestigacion = verificarPlazoInvestigacion(causa);
    if (plazoInvestigacion.estado === 'vencido') {
      result.push(`INCUMPLIMIENTO LEGAL: ${plazoInvestigacion.mensaje}. Máximo permitido: ${MAX_PLAZO_INVESTIGACION_DIAS} días hábiles (Ley 21809, Art. 16E, letra g).`);
    } else if (plazoInvestigacion.estado === 'alerta') {
      result.push(`ALERTA LEGAL: ${plazoInvestigacion.mensaje}`);
    }

    const plazoSuspension = verificarPlazoSuspension(causa);
    if (plazoSuspension.estado === 'vencido') {
      result.push(`INCUMPLIMIENTO LEGAL: ${plazoSuspension.mensaje}. Máximo permitido: ${MAX_PLAZO_SUSPENSION_DIAS} días hábiles (Ley 21809, Art. 16E, letra j).`);
    } else if (plazoSuspension.estado === 'alerta') {
      result.push(`ALERTA LEGAL: ${plazoSuspension.mensaje}`);
    }

    const plazoNotificacion = verificarPlazoNotificacionSuperintendencia(causa);
    if (plazoNotificacion.estado === 'vencido') {
      result.push(`INCUMPLIMIENTO LEGAL: ${plazoNotificacion.mensaje}. Plazo: ${MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS} días hábiles (Ley 21809, Art. 16E).`);
    } else if (plazoNotificacion.estado === 'alerta') {
      result.push(`ALERTA LEGAL: ${plazoNotificacion.mensaje}`);
    }

    if (causa.esDenunciaConfidencial && !causa.identidadReservada) {
      result.push('ALERTA LEGAL: La denuncia está marcada como confidencial pero no se ha reservado la identidad del denunciante (Ley 21809, Art. 16E, letra e).');
    }

    if (causa.fechaInicioSuspension && !causa.monitoreoPedagogico) {
      result.push('ALERTA LEGAL: La suspensión requiere monitoreo pedagógico obligatorio (Ley 21809, Art. 16E, letra j).');
    }

    return result;
  }, [causa]);
}