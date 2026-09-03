/** @license SPDX-License-Identifier: Apache-2.0 */

import { EstadoCausa, type Causa } from '../../shared/lib/types';
import { getCausaDeadline } from '../causas/causaPresentation';

export type DashboardActionUrgency = 'overdue' | 'critical' | 'warning';

export interface DashboardAction {
  causa: Causa;
  remainingDays: number;
  label: string;
  urgency: DashboardActionUrgency;
}

const isClosed = (causa: Causa) =>
  causa.estadoActual === EstadoCausa.CAUSA_CERRADA ||
  causa.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA;

export function getDashboardActions(causas: Causa[], today = new Date()): DashboardAction[] {
  return causas
    .filter((causa) => !isClosed(causa))
    .map((causa) => {
      const deadline = getCausaDeadline(causa, today);
      if (deadline.tone === 'normal') return null;
      const urgency: DashboardActionUrgency =
        deadline.remainingDays < 0
          ? 'overdue'
          : deadline.remainingDays <= 2
            ? 'critical'
            : 'warning';
      return { causa, remainingDays: deadline.remainingDays, label: deadline.text, urgency };
    })
    .filter((action): action is DashboardAction => Boolean(action))
    .filter((action) => action.urgency !== 'warning' || action.remainingDays <= 5)
    .sort((left, right) => left.remainingDays - right.remainingDays);
}
