/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from 'react';
import type { Causa } from '../types';
import { EstadoCausa } from '../types';
import { remainingProcedureDays, daysElapsedCeil } from '../lib/dateUtils';

export interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  urgent: boolean;
  causaId?: string;
}

export function useNotifications(causas: Causa[]): Notification[] {
  return useMemo(() => {
    const n: Notification[] = [];

    causas.forEach((causa, idx) => {
      if (
        causa.comprometeAulaSegura &&
        causa.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        causa.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA
      ) {
        const remaining = remainingProcedureDays(causa.fechaApertura, 10);
        if (remaining <= 2) {
          n.push({
            id: idx * 10 + 1,
            title: 'Alerta Aula Segura',
            description: `Causa ${causa.id} - ${remaining <= 0 ? 'plazo EXCEDIDO' : remaining === 1 ? `vence en ${remaining} día` : `vence en ${remaining} días`}`,
            time: remaining <= 0 ? 'URGENTE' : 'Requiere atención',
            urgent: true,
            causaId: causa.id,
          });
        }
      }

      if (causa.estadoActual === EstadoCausa.EN_PLAZO_APELACION) {
        n.push({
          id: idx * 10 + 2,
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
        const elapsed = daysElapsedCeil(causa.fechaApertura);
        if (elapsed > 60) {
          n.push({
            id: idx * 10 + 3,
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
        const remaining = remainingProcedureDays(causa.fechaApertura, 60);
        if (remaining <= 10 && remaining > 0) {
          n.push({
            id: idx * 10 + 4,
            title: 'Plazo próximo a vencer',
            description: `Causa ${causa.id} - ${remaining} días restantes del procedimiento ordinario`,
            time: `${remaining} días`,
            urgent: false,
            causaId: causa.id,
          });
        }
      }
    });

    return n;
  }, [causas]);
}
