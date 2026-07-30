/** @license SPDX-License-Identifier: Apache-2.0 */

import type { FaseProcedimental } from '../../types';

export type TimelineTab = 'resumen' | Lowercase<FaseProcedimental> | 'bitacora' | 'asistente_ia';

export const PHASE_TAB_TO_NAME: Partial<Record<TimelineTab, FaseProcedimental>> = {
  recepción: 'Recepción',
  investigación: 'Investigación',
  resolución: 'Resolución',
  apelación: 'Apelación',
  seguimiento: 'Seguimiento',
};
