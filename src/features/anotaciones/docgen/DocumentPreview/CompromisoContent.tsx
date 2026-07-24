/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function CompromisoContent(props: DocContentProps) {
  const { currentName, currentCourse, apoderadoName, dateStr, coordinatorName, letterContent } =
    props;

  return (
    <div>
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={props.currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={props.currentTeacher} />
        <DataRow label="Inspector/a" value={props.inspectorName || '________________'} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Emisión" value={dateStr} />
        <DataRow label="Coordinador/a de Ciclo" value={coordinatorName || '________________'} />
        <DataRow label="Anotaciones Negativas" value={props.negativeCount} />
      </Section>

      <Section number={2} title="Motivo">
        <p>{letterContent.motivo}</p>
      </Section>

      <Section number={3} title="Descripción / antecedentes">
        <p>{letterContent.descripcion}</p>
        <p style={{ marginTop: '8px' }}>
          Cantidad de anotaciones negativas consideradas: <strong>{props.negativeCount}</strong>.
        </p>
      </Section>

      <Section number={4} title="Medida o acuerdo">
        <p>{letterContent.medida}</p>
      </Section>

      <Section number={5} title="Acuerdos y seguimiento">
        <p style={{ whiteSpace: 'pre-line' }}>{letterContent.acuerdos}</p>
        <p style={{ marginTop: '12px', whiteSpace: 'pre-line', color: '#4b5563' }}>
          {letterContent.cierre}
        </p>
        {letterContent.observaciones && (
          <p
            style={{
              marginTop: '8px',
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
        <p className="letter-signatures-title">Firma de Compromiso</p>
        <div className="letter-signatures-grid letter-signatures-grid-3">
          <div className="letter-signature-item">
            <div className="letter-signature-line">{currentName}</div>
            <p className="letter-signature-role">Estudiante</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {apoderadoName || '_________________________'}
            </div>
            <p className="letter-signature-role">Apoderado/a</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {coordinatorName || '_________________________'}
            </div>
            <p className="letter-signature-role">Coordinador/a de Ciclo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
