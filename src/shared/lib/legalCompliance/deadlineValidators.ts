/** @license SPDX-License-Identifier: Apache-2.0 */
import type { Causa } from '@/shared/lib/types';
import { calcularDiasHabiles, agregarDiasHabiles } from './dateUtils';
import {
  calcularFechaLimiteInvestigacion,
  calcularFechaLimiteNotificacionSuperintendencia,
} from './deadlineCalculators';
import {
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
  DIAS_ALERTA_PLAZO_CRITICO,
  getMaxPlazoInvestigacionDias,
} from './constants';
import type { ResultadoPlazo } from './types';
import { nowDateOnly, toDateOnly } from '../../../shared/lib/dateUtils';

const INVESTIGATION_CLOSE_ITEM_ID = 'chk_res_2';
const INVESTIGATION_CLOSE_LABEL = 'Informe Cierre de Indagación Emitido';

const normalizeDateOnly = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : toDateOnly(parsed);
};

export function getInvestigationClosureDate(
  causa: Pick<Causa, 'checklistDebidoProceso' | 'bitacora'>,
): string | undefined {
  const checklistDate = causa.checklistDebidoProceso.find(
    (item) => item.id === INVESTIGATION_CLOSE_ITEM_ID && item.completado,
  )?.fechaCompletado;
  const normalizedChecklistDate = normalizeDateOnly(checklistDate);
  if (normalizedChecklistDate) return normalizedChecklistDate;

  return causa.bitacora
    .filter((entry) => entry.titulo.includes(INVESTIGATION_CLOSE_LABEL))
    .map((entry) => normalizeDateOnly(entry.fecha))
    .filter((date): date is string => Boolean(date))
    .sort()[0];
}

/**
 * Verifica el estado del plazo de investigación
 */
export function verificarPlazoInvestigacion(causa: Causa): ResultadoPlazo {
  if (!causa.fechaApertura) {
    return {
      estado: 'no_iniciado',
      diasRestantes: null,
      diasTranscurridos: null,
      fechaLimite: null,
      mensaje: 'No se ha registrado fecha de apertura',
    };
  }

  const maxDias = getMaxPlazoInvestigacionDias(
    causa.tipoInfraccion,
    causa.comprometeAulaSegura,
  );
  const fechaInicio = causa.fechaInicioInvestigacion || causa.fechaApertura;
  const fechaLimite = calcularFechaLimiteInvestigacion(
    fechaInicio,
    causa.tipoInfraccion,
    causa.comprometeAulaSegura,
  );
  const fechaCierre = getInvestigationClosureDate(causa);
  const fechaEvaluacion = fechaCierre || nowDateOnly();
  const diasTranscurridos = calcularDiasHabiles(fechaInicio, fechaEvaluacion);
  const diasRestantes = maxDias - diasTranscurridos;

  if (fechaCierre && fechaCierre <= fechaLimite) {
    return {
      estado: 'cumplido',
      diasRestantes: Math.max(0, diasRestantes),
      diasTranscurridos,
      fechaLimite,
      mensaje: 'Investigación cerrada dentro de plazo',
    };
  }

  if (diasRestantes <= 0) {
    return {
      estado: 'vencido',
      diasRestantes: 0,
      diasTranscurridos,
      fechaLimite,
      mensaje: fechaCierre
        ? `PLAZO VENCIDO: La investigación cerró fuera de los ${maxDias} días hábiles`
        : `PLAZO VENCIDO: La investigación ha excedido los ${maxDias} días hábiles`,
    };
  }

  if (diasRestantes <= DIAS_ALERTA_PLAZO_CRITICO) {
    return {
      estado: 'alerta',
      diasRestantes,
      diasTranscurridos,
      fechaLimite,
      mensaje: `ALERTA: Quedan solo ${diasRestantes} días hábiles para vencer el plazo de investigación`,
    };
  }

  return {
    estado: 'cumplido',
    diasRestantes,
    diasTranscurridos,
    fechaLimite,
    mensaje: `Plazo de investigación: ${diasRestantes} días hábiles restantes`,
  };
}

/**
 * Verifica el estado del plazo de suspensión
 */
export function verificarPlazoSuspension(causa: Causa): ResultadoPlazo {
  if (!causa.fechaInicioSuspension) {
    return {
      estado: 'no_iniciado',
      diasRestantes: null,
      diasTranscurridos: null,
      fechaLimite: null,
      mensaje: 'No hay suspensión activa',
    };
  }

  const duracion = causa.duracionSuspensionDias || 0;
  const fechaLimite = agregarDiasHabiles(causa.fechaInicioSuspension, duracion);
  const hoy = nowDateOnly();
  const diasTranscurridos = calcularDiasHabiles(causa.fechaInicioSuspension, hoy);
  const diasRestantes = duracion - diasTranscurridos;

  if (duracion > MAX_PLAZO_SUSPENSION_DIAS) {
    return {
      estado: 'vencido',
      diasRestantes: 0,
      diasTranscurridos,
      fechaLimite,
      mensaje: `INCUMPLIMIENTO: La suspensión excede los ${MAX_PLAZO_SUSPENSION_DIAS} días hábiles permitidos`,
    };
  }

  if (diasRestantes <= 0) {
    return {
      estado: 'vencido',
      diasRestantes: 0,
      diasTranscurridos,
      fechaLimite,
      mensaje: 'La suspensión ha finalizado',
    };
  }

  if (diasRestantes <= DIAS_ALERTA_PLAZO_CRITICO) {
    return {
      estado: 'alerta',
      diasRestantes,
      diasTranscurridos,
      fechaLimite,
      mensaje: `ALERTA: Quedan solo ${diasRestantes} días de suspensión`,
    };
  }

  return {
    estado: 'cumplido',
    diasRestantes,
    diasTranscurridos,
    fechaLimite,
    mensaje: `Suspensión: ${diasRestantes} días hábiles restantes`,
  };
}

/**
 * Verifica el estado del plazo de notificación a Superintendencia
 */
export function verificarPlazoNotificacionSuperintendencia(causa: Causa): ResultadoPlazo {
  if (!causa.requiereNotificacionSuperintendencia) {
    return {
      estado: 'no_iniciado',
      diasRestantes: null,
      diasTranscurridos: null,
      fechaLimite: null,
      mensaje: 'No requiere notificación a Superintendencia',
    };
  }

  if (!causa.fechaNotificacionSuperintendencia) {
    // Calcular desde la última actualización si no hay fecha de notificación
    const fechaReferencia = causa.fechaUltimaActualizacion || nowDateOnly();
    const fechaLimite = calcularFechaLimiteNotificacionSuperintendencia(fechaReferencia);
    const hoy = nowDateOnly();
    const diasTranscurridos = calcularDiasHabiles(fechaReferencia, hoy);
    const diasRestantes = MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS - diasTranscurridos;

    if (diasRestantes <= 0) {
      return {
        estado: 'vencido',
        diasRestantes: 0,
        diasTranscurridos,
        fechaLimite,
        mensaje: `PLAZO VENCIDO: No se ha notificado a Superintendencia dentro de los ${MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS} días hábiles`,
      };
    }

    if (diasRestantes <= DIAS_ALERTA_PLAZO_CRITICO) {
      return {
        estado: 'alerta',
        diasRestantes,
        diasTranscurridos,
        fechaLimite,
        mensaje: `ALERTA: Quedan solo ${diasRestantes} días hábiles para notificar a Superintendencia`,
      };
    }

    return {
      estado: 'cumplido',
      diasRestantes,
      diasTranscurridos,
      fechaLimite,
      mensaje: `Notificación a Superintendencia: ${diasRestantes} días hábiles restantes`,
    };
  }

  return {
    estado: 'cumplido',
    diasRestantes: null,
    diasTranscurridos: null,
    fechaLimite: null,
    mensaje: 'Notificación a Superintendencia completada',
  };
}
