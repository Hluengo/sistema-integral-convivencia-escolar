import { type Causa } from '@/src/types';
import {
  calcularDiasHabiles,
  agregarDiasHabiles,
} from './dateUtils';
import { calcularFechaLimiteInvestigacion, calcularFechaLimiteNotificacionSuperintendencia } from './deadlineCalculators';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
  DIAS_ALERTA_PLAZO_CRITICO,
} from './constants';
import { type ResultadoPlazo, type EstadoPlazo } from './types';

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

  const fechaLimite = calcularFechaLimiteInvestigacion(causa.fechaApertura);
  const hoy = new Date().toISOString().split('T')[0];
  const diasTranscurridos = calcularDiasHabiles(causa.fechaApertura, hoy);
  const diasRestantes = MAX_PLAZO_INVESTIGACION_DIAS - diasTranscurridos;

  if (diasRestantes <= 0) {
    return {
      estado: 'vencido',
      diasRestantes: 0,
      diasTranscurridos,
      fechaLimite,
      mensaje: `PLAZO VENCIDO: La investigación ha excedido los ${MAX_PLAZO_INVESTIGACION_DIAS} días hábiles`,
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
  const hoy = new Date().toISOString().split('T')[0];
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
    const fechaReferencia = causa.fechaUltimaActualizacion || new Date().toISOString().split('T')[0];
    const fechaLimite = calcularFechaLimiteNotificacionSuperintendencia(fechaReferencia);
    const hoy = new Date().toISOString().split('T')[0];
    const diasTranscurridos = calcularDiasHabiles(fechaReferencia, hoy);
    const diasRestantes = 5 - diasTranscurridos;

    if (diasRestantes <= 0) {
      return {
        estado: 'vencido',
        diasRestantes: 0,
        diasTranscurridos,
        fechaLimite,
        mensaje: `PLAZO VENCIDO: No se ha notificado a Superintendencia dentro de los 5 días hábiles`,
      };
    }

    if (diasRestantes <= 3) {
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