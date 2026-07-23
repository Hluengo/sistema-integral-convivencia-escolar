/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function AmonestacionContent(props: DocContentProps) {
  const { currentName, currentCourse, currentTeacher, apoderadoName, dateStr, negativeCount, letterContent } = props;

  return (
    <div className="space-y-1">
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
        <p className="mt-2">
          Cantidad de anotaciones negativas consideradas: <strong>{negativeCount}</strong>.
        </p>
      </Section>

      <Section number={4} title="Medida">
        <p>{letterContent.medida}</p>
      </Section>

      <Section number={5} title="Acuerdos y cierre">
        <p className="whitespace-pre-line">{letterContent.acuerdos}</p>
        <p className="mt-3 whitespace-pre-line text-[10px] text-neutral-500 italic">{letterContent.cierre}</p>
        {letterContent.observaciones && (
          <p className="mt-3 whitespace-pre-line text-neutral-600 italic">Observaciones: {letterContent.observaciones}</p>
        )}
      </Section>

      <div className="mt-8 border-t border-neutral-300 pt-4">
        <p className="mb-6 text-center text-xs font-bold uppercase tracking-wide text-neutral-700">Firmas</p>
        <div className="grid grid-cols-4 gap-4 text-xs text-neutral-600">
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{currentTeacher || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Profesor/a Jefe</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{props.inspectorName || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Inspector/a</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{apoderadoName || '_________________________'}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Apoderado</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-t border-neutral-400 pt-1">{currentName}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Estudiante</p>
          </div>
        </div>
      </div>
    </div>
  );
}
