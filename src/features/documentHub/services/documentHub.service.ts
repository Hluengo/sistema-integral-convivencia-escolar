/** @license SPDX-License-Identifier: Apache-2.0 */

import { fetchCausas } from '@/src/services/cases';
import { fetchStudentsWithAnnotationCounts } from '@/src/services/annotations.service';
import { fetchCartas } from '@/src/services/cartas.service';
import type { Causa, CartaDisciplinaria, AnotacionStudent } from '@/src/shared/lib/types';
import type { UnifiedDocument, CausaDocumentData, AnotacionDocumentData } from '../types/documentHub.types';
import { getLetterTypeLabel, mapLetterTypeToDocType } from '../utils/documentHub.utils';

function getFaseForEstado(estado: string): string {
  if (estado.includes('Recepci\u00f3n') || estado.includes('Denuncia') || estado.includes('Apertura')) return 'Recepci\u00f3n';
  if (estado.includes('Invest') || estado.includes('Indagaci\u00f3n') || estado.includes('Evidencias') || estado.includes('Mediaci\u00f3n')) return 'Investigaci\u00f3n';
  if (estado.includes('Informe') || estado.includes('Entrevista') || estado.includes('Resoluci\u00f3n')) return 'Resoluci\u00f3n';
  if (estado.includes('Apelac') || estado.includes('Ejecutoriada')) return 'Apelaci\u00f3n';
  if (estado.includes('Seguim') || estado.includes('Ejecuci\u00f3n') || estado.includes('Cerrada')) return 'Seguimiento';
  return 'Investigaci\u00f3n';
}

function mapCausaToUnified(causa: Causa): UnifiedDocument {
  const causaData: CausaDocumentData = {
    causaId: causa.id,
    codigoCausa: causa.id,
    fase: getFaseForEstado(causa.estadoActual),
    tipoInfraccion: causa.tipoInfraccion,
    aulaSegura: causa.comprometeAulaSegura,
    tieneInformeIA: false,
  };

  return {
    id: `causa-${causa.id}`,
    source: 'causa',
    titulo: `Expediente ${causa.id}`,
    estudiante: causa.estudianteNombre,
    estudianteId: '',
    curso: causa.estudianteCurso,
    fecha: causa.fechaUltimaActualizacion || causa.fechaApertura,
    estado: causa.estadoActual,
    tieneIA: true,
    causaData,
    documentoOriginal: causa as unknown,
  };
}

function mapCartaToUnified(
  carta: CartaDisciplinaria,
  student: AnotacionStudent
): UnifiedDocument {
  const anotacionData: AnotacionDocumentData = {
    cartaId: carta.id,
    tipoCarta: mapLetterTypeToDocType(carta.letter_type),
    emissionDate: carta.emission_date,
    status: carta.status,
    apoderadoName: carta.apoderado_name,
    negativeCount: student.annotations_count || 0,
  };

  return {
    id: `anotacion-${carta.id}`,
    source: 'anotacion',
    titulo: getLetterTypeLabel(carta.letter_type),
    estudiante: student.full_name,
    estudianteId: student.id,
    curso: student.course_name || '',
    fecha: carta.emission_date,
    estado: carta.status,
    tieneIA: false,
    anotacionData,
    documentoOriginal: carta as unknown,
  };
}

export async function fetchUnifiedDocuments(): Promise<UnifiedDocument[]> {
  const [causas, studentsResult] = await Promise.all([
    fetchCausas(0),
    fetchStudentsWithAnnotationCounts(),
  ]);

  const students = studentsResult.filter(
    (s: AnotacionStudent) => (s.annotations_count || 0) > 0
  );

  const estudiantesConCartas = students.length > 0
    ? await Promise.all(students.map((s: AnotacionStudent) => fetchCartas(s.id)))
    : [];

  const causaDocs = causas.map(mapCausaToUnified);

  const anotacionDocs: UnifiedDocument[] = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const cartas = estudiantesConCartas[i] || [];
    for (const carta of cartas) {
      anotacionDocs.push(mapCartaToUnified(carta, student));
    }
  }

  return [...causaDocs, ...anotacionDocs].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}
