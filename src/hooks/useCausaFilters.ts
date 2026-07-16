/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { type Causa, EstadoCausa, type FaseProcedimental } from '../types';
import { getFaseForEstado } from '../data';

export function useCausaFilters(causas: Causa[]) {
  return useMemo(() => {
    const active: Causa[] = [];
    const closed: Causa[] = [];
    const aulaSegura: Causa[] = [];
    for (const c of causas) {
      const isClosed = c.estadoActual === EstadoCausa.CAUSA_CERRADA;
      if (isClosed) {
        closed.push(c);
      } else {
        active.push(c);
        if (c.comprometeAulaSegura) {
          aulaSegura.push(c);
        }
      }
    }
    return { activeCausas: active, closedCausas: closed, aulaSeguraCausas: aulaSegura };
  }, [causas]);
}

export function useCausaSearch(
  activeCausas: Causa[],
  selectedFaseFilter: FaseProcedimental | 'Todas',
  searchQuery: string
) {
  return useMemo(
    () =>
      activeCausas.filter((c) => {
        if (selectedFaseFilter !== 'Todas') {
          const fase = getFaseForEstado(c.estadoActual);
          if (fase !== selectedFaseFilter) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName =
            c.estudianteNombre.toLowerCase().includes(query) ||
            c.nnaProtectedName.toLowerCase().includes(query);
          const matchId = c.id.toLowerCase().includes(query);
          const matchCourse = c.estudianteCurso.toLowerCase().includes(query);
          if (!matchName && !matchId && !matchCourse) {
            return false;
          }
        }

        return true;
      }),
    [activeCausas, selectedFaseFilter, searchQuery]
  );
}
