/** @license SPDX-License-Identifier: Apache-2.0 */

export type DocumentSource = 'causa' | 'anotacion';

export type CausaDocumentType =
  | 'notificacion_apertura'
  | 'citacion_entrevista'
  | 'informe_cierre_indagacion'
  | 'informe_concluyente';

export type AnotacionDocumentType =
  | 'amonestacion'
  | 'compromiso_conductual'
  | 'derivacion';

export interface CausaDocumentData {
  causaId: string;
  codigoCausa: string;
  fase: string;
  tipoInfraccion: string;
  aulaSegura: boolean;
  tieneInformeIA: boolean;
}

export interface AnotacionDocumentData {
  cartaId: string;
  tipoCarta: AnotacionDocumentType;
  emissionDate: string;
  status: string;
  apoderadoName: string;
  negativeCount: number;
}

export interface UnifiedDocument {
  id: string;
  source: DocumentSource;
  titulo: string;
  estudiante: string;
  estudianteId: string;
  curso: string;
  fecha: string;
  estado: string;
  tieneIA: boolean;
  causaData?: CausaDocumentData;
  anotacionData?: AnotacionDocumentData;
  documentoOriginal: unknown;
}

export type DocumentHubFilter = 'todos' | 'causas' | 'anotaciones';

export interface DocumentHubState {
  documentos: UnifiedDocument[];
  filtro: DocumentHubFilter;
  busqueda: string;
  cargando: boolean;
  error: string | null;
}
