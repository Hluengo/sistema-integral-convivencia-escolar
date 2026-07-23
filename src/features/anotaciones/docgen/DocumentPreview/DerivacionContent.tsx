/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function DerivacionContent(props: DocContentProps) {
  const { currentName, currentCourse, coordinatorName, inspectorName, currentTeacher, dateStr, letterContent } = props;

  return (
    <div className="space-y-1">
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
        <p className="mt-2">
          Cantidad de anotaciones negativas consideradas: <strong>{props.negativeCount}</strong>.
        </p>
      </Section>

      <Section number={4} title="Medida / acciones sugeridas">
        <p>{letterContent.medida}</p>
        <p className="mt-2 whitespace-pre-line">{letterContent.acuerdos}</p>
      </Section>

      <Section number={5} title="Cierre y observaciones">
        <p className="whitespace-pre-line">{letterContent.cierre}</p>
        {letterContent.observaciones ? (
          <p className="mt-2 whitespace-pre-line">{letterContent.observaciones}</p>
        ) : (
          <p className="mt-2 text-neutral-400 italic">Sin observaciones adicionales.</p>
        )}
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[10px] leading-relaxed text-neutral-500">
            <strong>Marco Legal:</strong> La presente derivación se realiza en conformidad con el Reglamento Interno RICE 2026, Circular 482/2018 de la Superintendencia de Educación Escolar y normativa vigente sobre convivencia escolar.
          </p>
        </div>
      </Section>

      <div className="mt-8 border-t border-neutral-300 pt-4">
        <p className="mb-6 text-center text-xs font-bold uppercase tracking-wide text-neutral-700">Firmas</p>
        <div className="grid grid-cols-3 gap-4 text-xs text-neutral-600">
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{inspectorName || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Inspector/a</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{coordinatorName || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Coordinador/a de Ciclo</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{currentTeacher || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Profesor/a Jefe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
