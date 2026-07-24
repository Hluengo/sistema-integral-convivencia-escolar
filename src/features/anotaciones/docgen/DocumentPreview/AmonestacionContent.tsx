/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function AmonestacionContent(props: DocContentProps) {
  const {
    currentName,
    currentCourse,
    currentTeacher,
    apoderadoName,
    dateStr,
    negativeCount,
    letterContent,
  } = props;

  return (
    <div>
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={props.currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={currentTeacher} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Emisión" value={dateStr} />
        <DataRow label="Anotaciones Negativas" value={negativeCount} />
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

      <Section number={4} title="Medida">
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

      <div className="letter-signatures">
        <p className="letter-signatures-title">Firmas</p>
        <div className="letter-signatures-grid letter-signatures-grid-4">
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {currentTeacher || '_________________________'}
            </div>
            <p className="letter-signature-role">Profesor/a Jefe</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {props.inspectorName || '_________________________'}
            </div>
            <p className="letter-signature-role">Inspector/a</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {apoderadoName || '_________________________'}
            </div>
            <p className="letter-signature-role">Apoderado</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">{currentName}</div>
            <p className="letter-signature-role">Estudiante</p>
          </div>
        </div>
      </div>
    </div>
  );
}
