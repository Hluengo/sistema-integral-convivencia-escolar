/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function AmonestacionContent(props: DocContentProps) {
  const { currentName, currentCourse, currentTeacher, apoderadoName, dateStr, docObservations, negativeCount } = props;

  return (
    <div className="space-y-1">
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={props.currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={currentTeacher} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Emisión" value={dateStr} />
        <DataRow label="N° de Anotaciones Negativas" value={negativeCount} />
      </Section>

      <Section number={2} title="Hechos">
        <p>
          El/La estudiante <strong>{currentName}</strong> del curso <strong>{currentCourse}</strong>{' '}
          ha incurrido en <strong>{negativeCount} falta{negativeCount !== 1 ? 's' : ''}</strong> registrada{negativeCount !== 1 ? 's' : ''} en el libro de clases y hoja de vida del estudiante, cuyo detalle consta en el sistema de anotaciones del establecimiento, conforme al Reglamento Interno RICE 2026.
        </p>
      </Section>

      <Section number={3} title="Fundamentación">
        <p>
          Las conductas descritas constituyen una infracción a las normas de convivencia escolar
          establecidas en el Reglamento Interno RICE 2026, contraviniendo los principios de respeto,
          responsabilidad y buena convivencia que rigen la vida escolar.
        </p>
        <p className="mt-2">
          De conformidad con el Artículo 16E de la Ley 21.809 y la Circular 482 de la
          Superintendencia de Educación, se procede a emitir la presente amonestación escrita como
          medida formativa y correctiva.
        </p>
        {docObservations && (
          <p className="mt-2 text-neutral-600 italic">Observaciones: {docObservations}</p>
        )}
      </Section>

      <Section number={4} title="Medida">
        <p>
          Se aplica la medida de <strong>Amonestación Escrita</strong>, consistente en la
          notificación formal por escrito al estudiante, apoderado y profesor jefe, quedando
          registro en la hoja de vida escolar del estudiante.
        </p>
        <p className="mt-2">
          El apoderado deberá tomar conocimiento y firmar la presente carta, comprometiéndose a
          reforzar en el hogar las normas de conducta y respeto hacia la comunidad educativa.
        </p>
      </Section>

      <Section number={5} title="Compromisos">
        <p className="mb-1 font-medium text-neutral-700">El estudiante se compromete a:</p>
        <ol className="ml-2 list-inside list-decimal space-y-1 text-neutral-700 text-xs">
          <li>Cumplir con las normas del Reglamento Interno RICE 2026.</li>
          <li>Mantener una conducta respetuosa hacia compañeros, docentes y asistentes de la educación.</li>
          <li>Asistir puntualmente a clases y participar activamente en las actividades pedagógicas.</li>
          <li>Reparar el daño causado, si correspondiere, según lo acordado con Convivencia Escolar.</li>
        </ol>
        <p className="mt-3 text-[10px] text-neutral-500 italic">
          La reincidencia en la conducta posterior a la firma de esta comunicación oficial derivará en una escalada a falta grave.
        </p>
      </Section>

      <div className="mt-8 border-neutral-300 border-t pt-4">
        <p className="mb-6 text-center font-bold text-neutral-700 text-xs uppercase tracking-wide">
          Firmas
        </p>
        <div className="grid grid-cols-4 gap-4 text-neutral-600 text-xs">
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">
              {currentTeacher || '_________________________'}
            </div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Profesor/a Jefe</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">
              {props.coordinatorName || '_________________________'}
            </div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Inspector/a</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">
              {apoderadoName || '_________________________'}
            </div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Apoderado</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">
              {currentName}
            </div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Estudiante</p>
          </div>
        </div>
      </div>
    </div>
  );
}
