/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tipos para validación de plazos legales
 */

/** Estado posible de un plazo legal */
export type EstadoPlazo = 'cumplido' | 'alerta' | 'vencido' | 'no_iniciado';

/** Resultado de la verificación de un plazo */
export interface ResultadoPlazo {
  estado: EstadoPlazo;
  diasRestantes: number | null;
  diasTranscurridos: number | null;
  fechaLimite: string | null;
  mensaje: string;
}

/** Nivel de conformidad legal de conformidad legal */
export type NivelConformidad = 'conforme' | 'alerta' | 'incumplimiento';

/** Item individual de verificación de conformidad */
export interface ItemConformidad {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: NivelConformidad;
  norma: string;
  accionRequerida?: string;
}