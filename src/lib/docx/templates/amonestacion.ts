/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Paragraph, Table } from 'docx';
import type { BuildDocxParams } from '../types';
import { bodyPara, sectionTitle, emptyLine } from '../helpers/paragraphs';
import { dataTable } from '../helpers/tables';
import { getAnnotationBlocks } from '../helpers/annotations';
import { FONT_SIZE_SMALL, FONT_SIZE_SECTION, COLOR_ACCENT } from '../constants';

export function buildAmonestacionContent(p: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];
  const blocks = getAnnotationBlocks(p.annotations);

  parts.push(sectionTitle('I.  ANTECEDENTES'));
  parts.push(bodyPara(`Estimado/a Sr./Sra. ${p.apoderadoName}:`));
  parts.push(emptyLine());
  parts.push(
    dataTable([
      ['Nombre del Estudiante', p.studentName],
      ['RUT', p.studentRut],
      ['Curso', p.course],
      ['Profesor(a) Jefe(a)', p.teacher],
      ['Apoderado(a)', p.apoderadoName],
    ]),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('II.  HECHOS'));
  parts.push(
    bodyPara(
      'Mediante la presente, y en virtud de las atribuciones conferidas por el ' +
        'Reglamento Interno del establecimiento y la normativa educacional vigente, ' +
        'se comunica a usted que el/la estudiante ' +
        p.studentName +
        ' del curso ' +
        p.course +
        ' ha incurrido en las siguientes conductas contrarias a la sana convivencia escolar:',
    ),
  );
  parts.push(emptyLine());
  parts.push(bodyPara(p.observations, { bold: false }));
  parts.push(emptyLine());

  if (blocks.length > 0) {
    parts.push(bodyPara('Registro de observaciones anteriores:', { bold: true }));
    parts.push(emptyLine());
    for (const a of blocks) {
      parts.push(
        bodyPara(
          `\u2022  [${a.date}] (${a.severity}) ${a.text}`,
          { size: FONT_SIZE_SMALL },
        ),
      );
    }
    parts.push(emptyLine());
  }

  parts.push(
    bodyPara(
      `Cantidad de observaciones negativas registradas a la fecha: ${p.negativeCount}.`,
      { bold: true },
    ),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('III.  FUNDAMENTACI\u00D3N'));
  parts.push(
    bodyPara(
      'Lo anterior se enmarca en lo dispuesto en el Decreto N\u00B0 67/2018 sobre ' +
        'Evaluaci\u00F3n, la Ley N\u00B0 20.845 de Inclusi\u00F3n Escolar, la Ley N\u00B0 21.809 que ' +
        'modifica la Ley General de Educaci\u00F3n en materia de convivencia escolar, y la ' +
        'Circular N\u00B0 482 de la Superintendencia de Educaci\u00F3n, as\u00ED como en las ' +
        'disposiciones del Reglamento Interno del establecimiento.',
    ),
  );
  parts.push(
    bodyPara(
      'La convivencia escolar se fundamenta en el respeto mutuo, la responsabilidad ' +
        'y el compromiso de todos los actores de la comunidad educativa. Las conductas ' +
        'se\u00F1aladas afectan el normal desarrollo de las actividades acad\u00E9micas y ' +
        'el clima de respeto necesario para el proceso formativo.',
    ),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('IV.  MEDIDA'));
  parts.push(
    bodyPara(
      'En virtud de los hechos descritos y en aplicaci\u00F3n del Reglamento Interno, ' +
        'se aplica la siguiente medida disciplinaria:',
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'AMONESTACI\u00D3N ESCRITA',
      { bold: true, alignment: 'center', size: FONT_SIZE_SECTION, color: COLOR_ACCENT },
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'La presente medida queda registrada en el libro de clases y en la hoja de ' +
        'vida del/la estudiante. Se deja constancia que la reiteraci\u00F3n de estas ' +
        'conductas podr\u00E1 dar lugar a medidas de mayor complejidad, conforme al ' +
        'procedimiento gradual establecido en el Reglamento Interno.',
    ),
  );
  parts.push(emptyLine());

  parts.push(sectionTitle('V.  COMPROMISOS'));
  parts.push(
    bodyPara(
      'Se solicita al apoderado/a tomar conocimiento de la presente y asumir los ' +
        'siguientes compromisos:',
    ),
  );
  parts.push(emptyLine());

  const defaultCommitments = [
    'Reforzar en el hogar los valores de respeto y responsabilidad.',
    'Mantener comunicaci\u00F3n fluida con el profesor/a jefe/a y/o la Direcci\u00F3n de Convivencia Escolar.',
    'Supervisar el cumplimiento de las normas de convivencia por parte del/la estudiante.',
    'Asistir a las reuniones y citaciones que realice el establecimiento.',
  ];
  const commitments = p.customCommitments ?? defaultCommitments;

  for (const c of commitments) {
    parts.push(bodyPara(`\u2022  ${c}`, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  return parts;
}
