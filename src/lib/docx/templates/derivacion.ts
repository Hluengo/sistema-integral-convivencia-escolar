/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Paragraph, Table } from 'docx';
import type { BuildDocxParams } from '../types';
import { bodyPara, sectionTitle, emptyLine } from '../helpers/paragraphs';
import { dataTable } from '../helpers/tables';
import { FONT_SIZE_SMALL } from '../constants';

export function buildDerivacionContent(p: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];

  parts.push(sectionTitle('I.  ANTECEDENTES'));
  parts.push(bodyPara('A quien corresponda:'));
  parts.push(emptyLine());
  parts.push(
    dataTable([
      ['Nombre del Estudiante', p.studentName],
      ['RUT', p.studentRut],
      ['Curso', p.course],
      ['Profesor(a) Jefe(a)', p.teacher],
      ['Apoderado(a)', p.apoderadoName],
      ['Fecha de Derivaci\u00F3n', p.dateStr],
    ]),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('II.  MOTIVO DE DERIVACI\u00D3N'));
  parts.push(
    bodyPara(
      'Se deriva el caso del/la estudiante ' +
        p.studentName +
        ' del curso ' +
        p.course +
        ' por las siguientes razones:',
    ),
  );
  parts.push(emptyLine());
  parts.push(bodyPara(p.observations));
  parts.push(emptyLine());

  parts.push(sectionTitle('III.  INTERVENCIONES REALIZADAS'));
  parts.push(
    bodyPara(
      'Previo a esta derivaci\u00F3n, se han realizado las siguientes intervenciones ' +
        'desde la Direcci\u00F3n de Convivencia Escolar:',
    ),
  );
  parts.push(emptyLine());

  const intervDefaults = [
    'Di\u00E1logo formativo con el/la estudiante.',
    'Entrevista con el/la apoderado/a.',
    'Registro de observaciones en hoja de vida del estudiante.',
    'Aplicaci\u00F3n de medidas pedag\u00F3gicas y formativas seg\u00FAn corresponda.',
  ];
  for (const i of intervDefaults) {
    parts.push(bodyPara(`\u2022  ${i}`, { size: FONT_SIZE_SMALL }));
  }

  if (p.annotations && p.annotations.length > 0) {
    parts.push(emptyLine());
    parts.push(bodyPara('Detalle de intervenciones previas:', { bold: true }));
    for (const a of p.annotations) {
      parts.push(
        bodyPara(`\u2022  [${a.date}] ${a.text}`, { size: FONT_SIZE_SMALL }),
      );
    }
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('IV.  ACCIONES SUGERIDAS'));
  parts.push(
    bodyPara(
      'Se sugiere al profesional o unidad receptora considerar las siguientes ' +
        'acciones para abordar la situaci\u00F3n presentada:',
    ),
  );
  parts.push(emptyLine());
  const sugeridas = [
    'Evaluaci\u00F3n psicopedag\u00F3gica o psicosocial del/la estudiante.',
    'Derivaci\u00F3n a redes de apoyo externas (CESFAM, COSAM, OPD, etc.).',
    'Implementaci\u00F3n de adecuaciones curriculares si correspondiere.',
    'Plan de acompa\u00F1amiento individual con enfoque formativo.',
    'Coordinaci\u00F3n con el Programa de Integraci\u00F3n Escolar (PIE) si el/la ' +
      'estudiante se encuentra inscrito.',
  ];
  for (const s of sugeridas) {
    parts.push(bodyPara(`\u2022  ${s}`, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('V.  OBSERVACIONES'));
  parts.push(
    bodyPara(
      'Se agradece la atenci\u00F3n dispensada y se solicita mantener informada a ' +
        'esta Direcci\u00F3n sobre las acciones y avances respecto del caso derivado.',
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'Quedamos atentos a cualquier consulta o requerimiento adicional para ' +
        'complementar la informaci\u00F3n proporcionada.',
    ),
  );
  parts.push(emptyLine());

  return parts;
}
