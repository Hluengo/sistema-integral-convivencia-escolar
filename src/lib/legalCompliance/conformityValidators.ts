/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Validadores de conformidad legal completa
 */

import { type Causa, EstadoCausa } from '@/src/types';
import { getFaseForEstado } from '@/src/data';
import { verificarPlazoInvestigacion, verificarPlazoSuspension, verificarPlazoNotificacionSuperintendencia } from './deadlineValidators';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
  DIAS_ALERTA_PLAZO_CRITICO,
} from './constants';
import type { ItemConformidad, NivelConformidad } from './types';

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
      accionRequerida: 'Activar reserva de identidad del denunciante',
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
      accionRequerida: 'Finalizar investigación inmediatamente o justificar extensión',
    });
  } else if (plazoInvestigacion.estado === 'alerta') {
    items.push({
      id: 'plazo_investigacion',
      titulo: 'Plazo de investigación próximo a vencer',
      descripcion: plazoInvestigacion.mensaje,
      nivel: 'alerta',
      norma: 'Ley 21809, Art. 16E, letra g',
      accionRequerida: 'Agilizar investigación para finalizar antes del vencimiento',
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
        accionRequerida: 'Levantar suspensión inmediatamente',
      });
    } else if (plazoSuspension.estado === 'alerta') {
      items.push({
        id: 'plazo_suspension',
        titulo: 'Suspensión próxima a finalizar',
        descripcion: plazoSuspension.mensaje,
        nivel: 'alerta',
        norma: 'Ley 21809, Art. 16E, letra j',
        accionRequerida: 'Preparar retorno del estudiante',
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
        accionRequerida: 'Implementar monitoreo pedagógico del estudiante suspendido',
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
        accionRequerida: 'Notificar a Superintendencia inmediatamente',
      });
    } else if (plazoNotificacion.estado === 'alerta') {
      items.push({
        id: 'notificacion_superintendencia',
        titulo: 'Notificación a Superintendencia próxima a vencer',
        descripcion: plazoNotificacion.mensaje,
        nivel: 'alerta',
        norma: 'Ley 21809, Art. 16E',
        accionRequerida: 'Preparar y enviar notificación a Superintendencia',
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
      accionRequerida: 'Revisar medidas para asegurar que no son discriminatorias',
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
      accionRequerida: 'Avanzar a fase de resolución o justificar extensión',
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
    porcentajeCumplimiento: Math.round((conformes / 6) * 100),
  };
}