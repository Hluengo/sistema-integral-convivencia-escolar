/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from 'react';
import type { Causa } from '../../../types';
import { EstadoCausa } from '../../../types';
import { remainingProcedureDays, daysElapsedCeil } from '../../../lib/dateUtils';

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  urgent: boolean;
  causaId: string;
}

export function buildNotifications(causas: Causa[], today = new Date()): Notification[] {
  const notifications: Notification[] = [];

  causas.forEach((causa) => {
    if (
      causa.comprometeAulaSegura &&
      causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
      causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
    ) {
      const remaining = remainingProcedureDays(causa.fechaApertura, 10, today);
      if (remaining <= 2) {
        notifications.push({
          id: `${causa.id}:aula-segura`,
          title: 'Alerta Aula Segura',
          description: `Causa ${causa.id} - ${remaining <= 0 ? 'plazo EXCEDIDO' : remaining === 1 ? `vence en ${remaining} día` : `vence en ${remaining} días`}`,
          time: remaining <= 0 ? 'URGENTE' : 'Requiere atención',
          urgent: true,
          causaId: causa.id,
        });
      }
    }

    if (causa.estadoActual === EstadoCausa.EN_PLAZO_APELACION) {
      notifications.push({
        id: `${causa.id}:apelacion`,
        title: 'Plazo de apelación activo',
        description: `Causa ${causa.id} - periodo de apelación en curso`,
        time: 'Pendiente',
        urgent: true,
        causaId: causa.id,
      });
    }

    if (
      causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
      causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
    ) {
      const elapsed = daysElapsedCeil(causa.fechaApertura, today);
      if (elapsed > 60) {
        notifications.push({
          id: `${causa.id}:procedimiento-extendido`,
          title: 'Procedimiento extendido',
          description: `Causa ${causa.id} - ${elapsed} días desde apertura sin resolución definitiva`,
          time: `Hace ${elapsed - 60} días sobre plazo`,
          urgent: true,
          causaId: causa.id,
        });
      }
    }

    if (
      !causa.comprometeAulaSegura &&
      causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
      causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
    ) {
      const remaining = remainingProcedureDays(causa.fechaApertura, 60, today);
      if (remaining <= 10 && remaining > 0) {
        notifications.push({
          id: `${causa.id}:plazo-proximo`,
          title: 'Plazo próximo a vencer',
          description: `Causa ${causa.id} - ${remaining} días restantes del procedimiento ordinario`,
          time: `${remaining} días`,
          urgent: false,
          causaId: causa.id,
        });
      }
    }
  });

  return notifications.sort((left, right) => Number(right.urgent) - Number(left.urgent));
}

export function useNotifications(causas: Causa[]): Notification[] {
  return useMemo(() => buildNotifications(causas), [causas]);
}
