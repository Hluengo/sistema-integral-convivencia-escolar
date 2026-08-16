/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BitacoraEntry, Causa } from '../../shared/lib/types';
import { EstadoCausa } from '../../shared/lib/types';
import { nowDateOnly, nowIso } from '../../shared/lib/dateUtils';

export interface ForceCloseCausaInput {
  responsable: string;
  titulo: string;
  motivo: string;
  documentoAdjunto?: string;
}

interface ForceCloseCausaOptions {
  entryId?: string;
  fecha?: string;
  fechaCivil?: string;
}

export function buildForceClosedCausa(
  causa: Causa,
  input: ForceCloseCausaInput,
  options: ForceCloseCausaOptions = {},
): Causa {
  const responsable = input.responsable.trim();
  const titulo = input.titulo.trim();
  const motivo = input.motivo.trim();
  const entry: BitacoraEntry = {
    id: options.entryId ?? `b_cierre_${crypto.randomUUID()}`,
    fecha: options.fecha ?? nowIso(),
    tipo: 'Resolución',
    titulo,
    descripcion: `Cierre anticipado fundado.\n\nResponsable del cierre: ${responsable}\n\nFundamento: ${motivo}`,
    participantes: [responsable],
    ...(input.documentoAdjunto ? { documentoAdjunto: input.documentoAdjunto } : {}),
  };

  return {
    ...causa,
    estadoActual: EstadoCausa.CAUSA_CERRADA,
    fechaUltimaActualizacion: options.fechaCivil ?? nowDateOnly(),
    bitacora: [entry, ...causa.bitacora],
  };
}
