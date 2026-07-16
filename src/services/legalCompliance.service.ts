/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Utilidades de Cumplimiento Legal - Circular 482 / Ley 21809
 */

import { type Causa, EstadoCausa, } from '../types';

// ============================================================
// CONSTANTES LEGALES
// ============================================================

/** Máximo días de investigación para estudiantes (Ley 21809, Art. 16E, letra g) */
export const MAX_PLAZO_INVESTIGACION_DIAS = 60;

/** Máximo días de suspensión (Ley 21809, Art. 16E, letra j) */
export const MAX_PLAZO_SUSPENSION_DIAS = 15;

/** Plazo para notificar a Superintendencia en casos de expulsión (5 días hábiles) */
export const MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS = 5;

/** Alertar cuando queden N días para vencer el plazo */
export const DIAS_ALERTA_PLAZO_CRITICO = 3;

// ============================================================
// FUNCIONES DE CÁLCULO DE FECHAS
// ============================================================

/**
 * Calcula días hábiles entre dos fechas (excluye fines de semana)
 */
export function calcularDiasHabiles(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  let dias = 0;
  const actual = new Date(inicio);

  while (actual <= fin) {
    const diaSemana = actual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias++;
    }
    actual.setDate(actual.getDate() + 1);
  }

  return dias;
}

/**
 * Agrega días hábiles a una fecha
 */
export function agregarDiasHabiles(fechaInicio: string, diasHabiles: number): string {
  const fecha = new Date(fechaInicio);
  let diasAgregados = 0;

  while (diasAgregados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }

  return fecha.toISOString().split('T')[0];
}

/**
 * Calcula fecha límite de investigación
 */
export function calcularFechaLimiteInvestigacion(fechaApertura: string): string {
  return agregarDiasHabiles(fechaApertura, MAX_PLAZO_INVESTIGACION_DIAS);
}

/**
 * Calcula fecha límite de notificación a Superintendencia
 */
export function calcularFechaLimiteNotificacionSuperintendencia(
  fechaResolucion: string
): string {
  return agregarDiasHabiles(fechaResolucion, MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS);
}

// ============================================================
// FUNCIONES DE VALIDACIÓN DE PLAZOS
// ============================================================

export type EstadoPlazo = 'cumplido' | 'alerta' | 'vencido' | 'no_iniciado';

export interface ResultadoPlazo {
  estado: EstadoPlazo;
  diasRestantes: number | null;
  diasTranscurridos: number | null;
  fechaLimite: string | null;
  mensaje: string;
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
      mensaje: 'No se ha registrado fecha de apertura'
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
      mensaje: `PLAZO VENCIDO: La investigación ha excedido los ${MAX_PLAZO_INVESTIGACION_DIAS} días hábiles`
    };
  }

  if (diasRestantes <= DIAS_ALERTA_PLAZO_CRITICO) {
    return {
      estado: 'alerta',
      diasRestantes,
      diasTranscurridos,
      fechaLimite,
      mensaje: `ALERTA: Quedan solo ${diasRestantes} días hábiles para vencer el plazo de investigación`
    };
  }

  return {
    estado: 'cumplido',
    diasRestantes,
    diasTranscurridos,
    fechaLimite,
    mensaje: `Plazo de investigación: ${diasRestantes} días hábiles restantes`
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
      mensaje: 'No hay suspensión activa'
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
      mensaje: `INCUMPLIMIENTO: La suspensión excede los ${MAX_PLAZO_SUSPENSION_DIAS} días hábiles permitidos`
    };
  }

  if (diasRestantes <= 0) {
    return {
      estado: 'vencido',
      diasRestantes: 0,
      diasTranscurridos,
      fechaLimite,
      mensaje: 'La suspensión ha finalizado'
    };
  }

  if (diasRestantes <= DIAS_ALERTA_PLAZO_CRITICO) {
    return {
      estado: 'alerta',
      diasRestantes,
      diasTranscurridos,
      fechaLimite,
      mensaje: `ALERTA: Quedan solo ${diasRestantes} días de suspensión`
    };
  }

  return {
    estado: 'cumplido',
    diasRestantes,
    diasTranscurridos,
    fechaLimite,
    mensaje: `Suspensión: ${diasRestantes} días hábiles restantes`
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
      mensaje: 'No requiere notificación a Superintendencia'
    };
  }

  if (!causa.fechaNotificacionSuperintendencia) {
    // Calcular desde la última actualización si no hay fecha de notificación
    const fechaReferencia = causa.fechaUltimaActualizacion || new Date().toISOString().split('T')[0];
    const fechaLimite = calcularFechaLimiteNotificacionSuperintendencia(fechaReferencia);
    const hoy = new Date().toISOString().split('T')[0];
    const diasTranscurridos = calcularDiasHabiles(fechaReferencia, hoy);
    const diasRestantes = MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS - diasTranscurridos;

    if (diasRestantes <= 0) {
      return {
        estado: 'vencido',
        diasRestantes: 0,
        diasTranscurridos,
        fechaLimite,
        mensaje: `PLAZO VENCIDO: No se ha notificado a Superintendencia dentro de los ${MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS} días hábiles`
      };
    }

    if (diasRestantes <= DIAS_ALERTA_PLAZO_CRITICO) {
      return {
        estado: 'alerta',
        diasRestantes,
        diasTranscurridos,
        fechaLimite,
        mensaje: `ALERTA: Quedan solo ${diasRestantes} días hábiles para notificar a Superintendencia`
      };
    }

    return {
      estado: 'cumplido',
      diasRestantes,
      diasTranscurridos,
      fechaLimite,
      mensaje: `Notificación a Superintendencia: ${diasRestantes} días hábiles restantes`
    };
  }

  return {
    estado: 'cumplido',
    diasRestantes: null,
    diasTranscurridos: null,
    fechaLimite: null,
    mensaje: 'Notificación a Superintendencia completada'
  };
}

// ============================================================
// FUNCIONES DE VALIDACIÓN DE CONFORMIDAD LEGAL
// ============================================================

export type NivelConformidad = 'conforme' | 'alerta' | 'incumplimiento';

export interface ItemConformidad {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: NivelConformidad;
  norma: string;
  accionRequerida?: string;
}

/**
 * Verifica conformidad legal completa de una causa
 */
export function verificarConformidadLegal(causa: Causa): ItemConformidad[] {
  const items: ItemConformidad[] = [];

  // 1. Canal seguro y confidencial (Ley 21809, Art. 16E, letra e)
  if (causa.esDenunciaConfidencial && !causa.identidadReservada) {
    items.push({
      id: 'canal_confidencial',
      titulo: 'Canal Confidencial incompleto',
      descripcion: 'La denuncia está marcada como confidencial pero no se ha reservado la identidad del denunciante',
      nivel: 'alerta',
      norma: 'Ley 21809, Art. 16E, letra e',
      accionRequerida: 'Activar reserva de identidad del denunciante'
    });
  }

  // 2. Plazo de investigación (Ley 21809, Art. 16E, letra g)
  const plazoInvestigacion = verificarPlazoInvestigacion(causa);
  if (plazoInvestigacion.estado === 'vencido') {
    items.push({
      id: 'plazo_investigacion',
      titulo: 'Plazo de investigación vencido',
      descripcion: plazoInvestigacion.mensaje,
      nivel: 'incumplimiento',
      norma: 'Ley 21809, Art. 16E, letra g',
      accionRequerida: 'Finalizar investigación inmediatamente o justificar extensión'
    });
  } else if (plazoInvestigacion.estado === 'alerta') {
    items.push({
      id: 'plazo_investigacion',
      titulo: 'Plazo de investigación próximo a vencer',
      descripcion: plazoInvestigacion.mensaje,
      nivel: 'alerta',
      norma: 'Ley 21809, Art. 16E, letra g',
      accionRequerida: 'Agilizar investigación para finalizar antes del vencimiento'
    });
  }

  // 3. Suspensión (Ley 21809, Art. 16E, letra j)
  if (causa.fechaInicioSuspension) {
    const plazoSuspension = verificarPlazoSuspension(causa);
    if (plazoSuspension.estado === 'vencido') {
      items.push({
        id: 'plazo_suspension',
        titulo: 'Suspensión excede plazo legal',
        descripcion: plazoSuspension.mensaje,
        nivel: 'incumplimiento',
        norma: 'Ley 21809, Art. 16E, letra j',
        accionRequerida: 'Levantar suspensión inmediatamente'
      });
    } else if (plazoSuspension.estado === 'alerta') {
      items.push({
        id: 'plazo_suspension',
        titulo: 'Suspensión próxima a finalizar',
        descripcion: plazoSuspension.mensaje,
        nivel: 'alerta',
        norma: 'Ley 21809, Art. 16E, letra j',
        accionRequerida: 'Preparar retorno del estudiante'
      });
    }

    // Verificar monitoreo pedagógico
    if (!causa.monitoreoPedagogico) {
      items.push({
        id: 'monitoreo_pedagogico',
        titulo: 'Monitoreo pedagógico no registrado',
        descripcion: 'La suspensión requiere monitoreo pedagógico obligatorio',
        nivel: 'alerta',
        norma: 'Ley 21809, Art. 16E, letra j',
        accionRequerida: 'Implementar monitoreo pedagógico del estudiante suspendido'
      });
    }
  }

  // 4. Notificación a Superintendencia (Ley 21809, Art. 16E)
  if (causa.requiereNotificacionSuperintendencia) {
    const plazoNotificacion = verificarPlazoNotificacionSuperintendencia(causa);
    if (plazoNotificacion.estado === 'vencido') {
      items.push({
        id: 'notificacion_superintendencia',
        titulo: 'Notificación a Superintendencia vencida',
        descripcion: plazoNotificacion.mensaje,
        nivel: 'incumplimiento',
        norma: 'Ley 21809, Art. 16E',
        accionRequerida: 'Notificar a Superintendencia inmediatamente'
      });
    } else if (plazoNotificacion.estado === 'alerta') {
      items.push({
        id: 'notificacion_superintendencia',
        titulo: 'Notificación a Superintendencia próxima a vencer',
        descripcion: plazoNotificacion.mensaje,
        nivel: 'alerta',
        norma: 'Ley 21809, Art. 16E',
        accionRequerida: 'Preparar y enviar notificación a Superintendencia'
      });
    }
  }

  // 5. NEE/Discapacidad (Ley 21809, Art. 16E)
  if (causa.estudianteTieneNEE && causa.sancionesNEEDesactivadas) {
    items.push({
      id: 'nee_sanciones',
      titulo: 'Estudiante con NEE - Verificar sanciones',
      descripcion: 'El estudiante tiene NEE registrado. Verificar que no se apliquen sanciones por esta condición',
      nivel: 'alerta',
      norma: 'Ley 21809, Art. 16E',
      accionRequerida: 'Revisar medidas para asegurar que no son discriminatorias'
    });
  }

  // 6. Verificar etapa del procedimiento
  const fasesRequierenPlazo: EstadoCausa[] = [
    EstadoCausa.EN_PROCESO_INDAGACION,
    EstadoCausa.RECOPILACION_EVIDENCIAS_CURSO,
    EstadoCausa.DERIVADO_A_MEDIACION,
    EstadoCausa.MEDIACION_EN_DESARROLLO,
  ];

  if (fasesRequierenPlazo.includes(causa.estadoActual) && plazoInvestigacion.estado === 'vencido') {
    items.push({
      id: 'fase_investigacion_plazo',
      titulo: 'Fase de investigación con plazo vencido',
      descripcion: `La causa se encuentra en fase "${causa.estadoActual}" pero el plazo de investigación está vencido`,
      nivel: 'incumplimiento',
      norma: 'Ley 21809, Art. 16E, letra g',
      accionRequerida: 'Avanzar a fase de resolución o justificar extensión'
    });
  }

  return items;
}

/**
 * Genera resumen de conformidad legal
 */
export function generarResumenConformidad(causa: Causa): {
  nivelGeneral: NivelConformidad;
  totalItems: number;
  conformes: number;
  alertas: number;
  incumplimientos: number;
  porcentajeCumplimiento: number;
} {
  const items = verificarConformidadLegal(causa);
  const alertas = items.filter(i => i.nivel === 'alerta').length;
  const incumplimientos = items.filter(i => i.nivel === 'incumplimiento').length;
  const conformes = Math.max(0, 6 - alertas - incumplimientos); // 6 puntos de conformidad base
  
  let nivelGeneral: NivelConformidad = 'conforme';
  if (incumplimientos > 0) { nivelGeneral = 'incumplimiento'; }
  else if (alertas > 0) { nivelGeneral = 'alerta'; }

  return {
    nivelGeneral,
    totalItems: items.length,
    conformes,
    alertas,
    incumplimientos,
    porcentajeCumplimiento: Math.round((conformes / 6) * 100)
  };
}
