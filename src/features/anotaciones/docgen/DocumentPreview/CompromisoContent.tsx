/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function CompromisoContent(props: DocContentProps) {
  const { currentName, currentCourse, apoderadoName, dateStr, coordinatorName, letterContent } = props;

  return (
    <div className="space-y-1">
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
        <p className="mt-2">
          Cantidad de anotaciones negativas consideradas: <strong>{props.negativeCount}</strong>.
        </p>
      </Section>

      <Section number={4} title="Medida o acuerdo">
        <p>{letterContent.medida}</p>
      </Section>

      <Section number={5} title="Acuerdos y seguimiento">
        <p className="whitespace-pre-line">{letterContent.acuerdos}</p>
        <p className="mt-3 whitespace-pre-line text-neutral-600">{letterContent.cierre}</p>
        {letterContent.observaciones && (
          <p className="mt-2 whitespace-pre-line text-neutral-600 italic">Observaciones: {letterContent.observaciones}</p>
        )}
      </Section>

      <div className="mt-8 border-t border-neutral-300 pt-4">
        <p className="mb-6 text-center text-xs font-bold uppercase tracking-wide text-neutral-700">Firma de Compromiso</p>
        <div className="grid grid-cols-3 gap-6 text-xs text-neutral-600">
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{currentName}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Estudiante</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{apoderadoName || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Apoderado/a</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{coordinatorName || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Coordinador/a de Ciclo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
