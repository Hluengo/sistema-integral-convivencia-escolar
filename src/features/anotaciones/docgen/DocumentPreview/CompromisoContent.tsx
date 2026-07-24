/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, LetterMetadataGrid, LetterSignatureGrid } from './SharedComponents';
import type { LetterMetadataItem, LetterSignature } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function CompromisoContent(props: DocContentProps) {
  const {
    currentName,
    currentRut,
    currentCourse,
    currentTeacher,
    apoderadoName,
    dateStr,
    negativeCount,
    letterContent,
  } = props;

  const metadataItems: LetterMetadataItem[] = [
    { label: 'Nombre del Estudiante', value: currentName },
    { label: 'RUT', value: currentRut },
    { label: 'Curso', value: currentCourse },
    { label: 'Fecha de Emisión', value: dateStr },
    { label: 'Profesor/a Jefe', value: currentTeacher },
    { label: 'Apoderado/a', value: apoderadoName || '________________' },
    { label: 'Anotaciones Negativas', value: negativeCount },
  ];

  const signatures: LetterSignature[] = [
    { name: currentName, role: 'Estudiante' },
    { name: apoderadoName, role: 'Apoderado/a' },
    { name: props.coordinatorName, role: 'Coordinador/a de Ciclo' },
  ];

  return (
    <div>
      <Section number={1} title="Antecedentes">
        <LetterMetadataGrid items={metadataItems} />
      </Section>

      <Section number={2} title="Motivo">
        <p>{letterContent.motivo}</p>
      </Section>

      <Section number={3} title="Descripción / antecedentes">
        <p>{letterContent.descripcion}</p>
        <p style={{ marginTop: '8px' }}>
          Cantidad de anotaciones negativas consideradas: <strong>{negativeCount}</strong>.
        </p>
      </Section>

      <Section number={4} title="Medida o acuerdo">
        <p>{letterContent.medida}</p>
      </Section>

      <Section number={5} title="Acuerdos y cierre">
        <p style={{ whiteSpace: 'pre-line' }}>{letterContent.acuerdos}</p>
        <p
          style={{
            marginTop: '12px',
            whiteSpace: 'pre-line',
            fontSize: '9pt',
            color: '#6b7280',
            fontStyle: 'italic',
          }}
        >
          {letterContent.cierre}
        </p>
        {letterContent.observaciones && (
          <p
            style={{
              marginTop: '12px',
              whiteSpace: 'pre-line',
              color: '#4b5563',
              fontStyle: 'italic',
            }}
          >
            Observaciones: {letterContent.observaciones}
          </p>
        )}
      </Section>

      <LetterSignatureGrid signatures={signatures} />
    </div>
  );
}
