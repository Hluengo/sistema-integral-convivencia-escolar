/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function DerivacionContent(props: DocContentProps) {
  const {
    currentName,
    currentCourse,
    coordinatorName,
    inspectorName,
    currentTeacher,
    dateStr,
    letterContent,
  } = props;

  return (
    <div>
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={props.currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={currentTeacher} />
        <DataRow label="Inspector/a" value={inspectorName || '________________'} />
        <DataRow label="Coordinador/a de Ciclo" value={coordinatorName || '________________'} />
        <DataRow label="Fecha de Derivación" value={dateStr} />
        <DataRow label="Anotaciones Negativas" value={props.negativeCount} />
      </Section>

      <Section number={2} title="Motivo de Derivación">
        <p>{letterContent.motivo}</p>
      </Section>

      <Section number={3} title="Descripción / antecedentes">
        <p>{letterContent.descripcion}</p>
        <p style={{ marginTop: '8px' }}>
          Cantidad de anotaciones negativas consideradas: <strong>{props.negativeCount}</strong>.
        </p>
      </Section>

      <Section number={4} title="Medida / acciones sugeridas">
        <p>{letterContent.medida}</p>
        <p style={{ marginTop: '8px', whiteSpace: 'pre-line' }}>{letterContent.acuerdos}</p>
      </Section>

      <Section number={5} title="Cierre y observaciones">
        <p style={{ whiteSpace: 'pre-line' }}>{letterContent.cierre}</p>
        {letterContent.observaciones ? (
          <p style={{ marginTop: '8px', whiteSpace: 'pre-line' }}>{letterContent.observaciones}</p>
        ) : (
          <p style={{ marginTop: '8px', color: '#9ca3af', fontStyle: 'italic' }}>
            Sin observaciones adicionales.
          </p>
        )}
        <div className="letter-legal-box">
          <p className="letter-legal-text">
            <strong>Marco Legal:</strong> La presente derivación se realiza en conformidad con el
            Reglamento Interno RICE 2026, Circular 482/2018 de la Superintendencia de Educación
            Escolar y normativa vigente sobre convivencia escolar.
          </p>
        </div>
      </Section>

      <div className="letter-signatures">
        <p className="letter-signatures-title">Firmas</p>
        <div className="letter-signatures-grid letter-signatures-grid-3">
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {inspectorName || '_________________________'}
            </div>
            <p className="letter-signature-role">Inspector/a</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {coordinatorName || '_________________________'}
            </div>
            <p className="letter-signature-role">Coordinador/a de Ciclo</p>
          </div>
          <div className="letter-signature-item">
            <div className="letter-signature-line">
              {currentTeacher || '_________________________'}
            </div>
            <p className="letter-signature-role">Profesor/a Jefe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
