/** @license SPDX-License-Identifier: Apache-2.0 */

import { Section, DataRow } from './SharedComponents';
import { DEFAULT_COMMITMENTS } from './docTypes';
import type { CompromisoDocProps } from './docTypes';

export default function CompromisoContent(props: CompromisoDocProps) {
  const { currentName, currentCourse, apoderadoName, dateStr, coordinatorName, docObservations } = props;

  return (
    <div className="space-y-1">
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={props.currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={props.currentTeacher} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Emisión" value={dateStr} />
        <DataRow label="Encargado de Convivencia" value={coordinatorName || '________________'} />
        <DataRow label="N° de Anotaciones Negativas" value={props.negativeCount} />
        <p className="mt-1 text-neutral-500 text-xs italic">
          De conformidad con el Artículo 16E de la Ley 21.809, Reglamento Interno RICE 2026 y
          Circular 482 de la Superintendencia de Educación.
        </p>
      </Section>

      <Section number={2} title="Hechos">
        <p className="mb-2">
          El/La estudiante <strong>{currentName}</strong> del curso <strong>{currentCourse}</strong>{' '}
          ha acumulado <strong>{props.negativeCount} anotaciones negativas</strong>, lo que constituye una
          reiteración de conductas contrarias a las normas de convivencia escolar establecidas,
          alcanzando el umbral que activa el presente compromiso conductual.
        </p>
      </Section>

      <Section number={3} title="Compromisos del Estudiante">
        <p className="mb-1 font-medium text-neutral-700">
          El/La estudiante se compromete libre y voluntariamente a:
        </p>
        <ol className="ml-2 list-inside list-decimal space-y-1 text-neutral-700 text-xs">
          {props.customCommitments.length > 0
            ? props.customCommitments.map((c, i) => <li key={c || i}>{c}</li>)
            : DEFAULT_COMMITMENTS.map((c, i) => <li key={c || i}>{c}</li>)}
        </ol>
      </Section>

      <Section number={4} title="Compromisos del Apoderado">
        <p className="mb-1 font-medium text-neutral-700">
          El/La apoderado/a <strong>{apoderadoName || '________________'}</strong> se compromete a:
        </p>
        <ol className="ml-2 list-inside list-decimal space-y-1 text-neutral-700 text-xs">
          <li>Supervisar el cumplimiento de los compromisos adquiridos por el/la estudiante.</li>
          <li>Mantener comunicación periódica con el profesor jefe y Convivencia Escolar.</li>
          <li>Asistir a las reuniones y citaciones realizadas por el establecimiento.</li>
          <li>Reforzar en el hogar los valores de respeto, responsabilidad y sana convivencia.</li>
          <li>Acompañar al estudiante en el proceso formativo y correctivo establecido.</li>
        </ol>
      </Section>

      <Section number={5} title="Seguimiento">
        <p>
          El presente compromiso tendrá una duración de <strong>30 días hábiles</strong>, periodo
          durante el cual se realizará un monitoreo semanal del comportamiento del estudiante por
          parte del equipo de Convivencia Escolar.
        </p>
        <ul className="mt-1 ml-2 list-inside list-disc space-y-1 text-neutral-700 text-xs">
          <li>Se programarán reuniones quincenales de seguimiento con el apoderado.</li>
          <li>El profesor jefe reportará semanalmente la evolución del estudiante.</li>
          <li>Al término del periodo, se evaluará el cumplimiento de los compromisos.</li>
        </ul>
        {docObservations && (
          <p className="mt-2 text-neutral-600 italic">Observaciones: {docObservations}</p>
        )}
      </Section>

      <div className="mt-8 border-neutral-300 border-t pt-4">
        <p className="mb-6 text-center font-bold text-neutral-700 text-xs uppercase tracking-wide">
          Firma de Compromiso
        </p>
        <div className="grid grid-cols-3 gap-6 text-neutral-600 text-xs">
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">{currentName}</div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Estudiante</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">
              {apoderadoName || '_________________________'}
            </div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Apoderado/a</p>
          </div>
          <div className="text-center">
            <div className="mt-8 border-neutral-400 border-t pt-1">
              {coordinatorName || '_________________________'}
            </div>
            <p className="mt-0.5 text-[10px] text-neutral-500">Coordinador/a de Ciclo</p>
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] text-neutral-400 italic">
          Firmado en {dateStr}, en conformidad con el debido proceso establecido en la Circular
          482/2018 y la Ley 21.809.
        </p>
      </div>
    </div>
  );
}
