/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Paragraph, Table } from 'docx';
import type { BuildDocxParams } from '../types';
import { bodyPara, sectionTitle, emptyLine } from '../helpers/paragraphs';
import { dataTable } from '../helpers/tables';
import { getAnnotationBlocks } from '../helpers/annotations';
import { FONT_SIZE_SMALL } from '../constants';

export function buildCompromisoContent(p: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];

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
      'Por medio del presente documento, y en el marco del Plan de Gesti\u00F3n de la ' +
        'Convivencia Escolar, se convoca a usted y al/la estudiante ' +
        p.studentName +
        ' a suscribir un Compromiso de Convivencia Escolar, en raz\u00F3n de las ' +
        'siguientes situaciones:',
    ),
  );
  parts.push(emptyLine());
  parts.push(bodyPara(p.observations));
  parts.push(emptyLine());

  const blocks = getAnnotationBlocks(p.annotations);
  if (blocks.length > 0) {
    parts.push(bodyPara('Antecedentes previos:', { bold: true }));
    for (const a of blocks) {
      parts.push(
        bodyPara(`\u2022  [${a.date}] (${a.severity}) ${a.text}`, {
          size: FONT_SIZE_SMALL,
        }),
      );
    }
    parts.push(emptyLine());
  }

  parts.push(sectionTitle('III.  COMPROMISOS DEL ESTUDIANTE'));
  parts.push(
    bodyPara(
      'El/la estudiante se compromete voluntariamente a:',
    ),
  );
  parts.push(emptyLine());
  const studentDefaults = [
    'Respetar a todos los miembros de la comunidad educativa.',
    'Cumplir con las normas establecidas en el Reglamento Interno.',
    'Asistir puntualmente a clases y participar activamente en su proceso formativo.',
    'Abstenerse de realizar conductas que afecten la sana convivencia escolar.',
  ];
  const studentComms = p.customCommitments ?? studentDefaults;
  for (const c of studentComms) {
    parts.push(bodyPara(`\u2022  ${c}`, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('IV.  COMPROMISOS DEL APODERADO'));
  parts.push(
    bodyPara(
      'El/la apoderado/a se compromete a:',
    ),
  );
  parts.push(emptyLine());
  const apoderadoDefaults = [
    'Acompa\u00F1ar y supervisar el proceso formativo del/la estudiante.',
    'Asistir a las citaciones y reuniones programadas por el establecimiento.',
    'Reforzar en el hogar las normas de convivencia y respeto.',
    'Mantener una comunicaci\u00F3n permanente con el profesor/a jefe/a.',
    'Apoyar el cumplimiento de los compromisos asumidos por el/la estudiante.',
  ];
  for (const c of apoderadoDefaults) {
    parts.push(bodyPara(`\u2022  ${c}`, { size: FONT_SIZE_SMALL }));
  }
  parts.push(emptyLine());

  parts.push(sectionTitle('V.  SEGUIMIENTO'));
  parts.push(
    bodyPara(
      'El presente compromiso tendr\u00E1 una duraci\u00F3n de [per\u00EDodo a definir] y ser\u00E1 ' +
        'objeto de seguimiento por parte de la Direcci\u00F3n de Convivencia Escolar, ' +
        'el/la profesor/a jefe/a y el equipo de gesti\u00F3n pedag\u00F3gica. Se programar\u00E1n ' +
        'reuniones peri\u00F3dicas para evaluar el cumplimiento de los acuerdos adoptados.',
    ),
  );
  parts.push(emptyLine());
  parts.push(
    bodyPara(
      'El incumplimiento de los compromisos aqu\u00ED adquiridos podr\u00E1 derivar en la ' +
        'aplicaci\u00F3n de medidas disciplinarias de mayor entidad, conforme al ' +
        'Reglamento Interno del establecimiento.',
      { bold: true },
    ),
  );
  parts.push(emptyLine());

  return parts;
}
