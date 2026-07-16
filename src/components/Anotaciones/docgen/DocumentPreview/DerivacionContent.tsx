/** @license SPDX-License-Identifier: Apache-2.0 */

import { AnnotationsList, Section, DataRow } from './SharedComponents';
import type { DocContentProps } from './docTypes';

export default function DerivacionContent(props: DocContentProps) {
  const { currentName, currentCourse, coordinatorName, dateStr, docObservations } = props;

  return (
    <div className="space-y-1">
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={props.currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={props.currentTeacher} />
        <DataRow label="Apoderado" value={props.apoderadoName || '________________'} />
        <DataRow label="Fecha de Derivación" value={dateStr} />
        <DataRow label="Derivado por" value={coordinatorName || '________________'} />
        <DataRow label="N° de Anotaciones Negativas" value={props.negativeCount} />
        <p className="mt-1 text-neutral-500 text-xs italic">
          En el marco de la Ley 21.809, Ley 20.845 de Inclusión Escolar, Circular 482/2018 y
          Reglamento Interno RICE 2026.
        </p>
      </Section>

      <Section number={2} title="Motivo de Derivación">
        <p>
          Se deriva al/la estudiante <strong>{currentName}</strong> al Equipo de Convivencia Escolar
          debido a la acumulación de <strong>{props.negativeCount} anotaciones negativas</strong>, que
          evidencian conductas reiteradas que afectan la sana convivencia del establecimiento educacional.
        </p>
        <div className="mt-2">
          <p className="mb-1 font-medium text-neutral-700">Registro de anotaciones:</p>
          <AnnotationsList annotations={props.selectedAnnsObjects} />
        </div>
      </Section>

      <Section number={3} title="Intervenciones Realizadas">
        <ul className="ml-2 list-inside list-disc space-y-1 text-neutral-700 text-xs">
          <li>Entrevistas con el/la estudiante por parte del profesor jefe.</li>
          <li>Comunicaciones y citaciones al apoderado.</li>
          <li>Registro de anotaciones negativas en el sistema de convivencia escolar.</li>
          <li>Medidas pedagógicas y formativas previas aplicadas en el aula.</li>
          <li>Entrevista con el equipo directivo y/o UTP según corresponda.</li>
        </ul>
      </Section>

      <Section number={4} title="Acciones Sugeridas">
        <ul className="ml-2 list-inside list-disc space-y-1 text-neutral-700 text-xs">
          <li>Evaluación socioemocional del estudiante por parte del equipo psicosocial.</li>
          <li>Plan de acompañamiento conductual individualizado.</li>
          <li>Derivación a redes de apoyo externas si se estima pertinente (CESFAM, COSAM, etc.).</li>
          <li>Incorporación al Programa de Integración Escolar (PIE) si correspondiere.</li>
          <li>Entrevista con el apoderado para establecer compromisos conjuntos.</li>
        </ul>
      </Section>

      <Section number={5} title="Observaciones">
        {docObservations ? (
          <p>{docObservations}</p>
        ) : (
          <p className="text-neutral-400 italic">Sin observaciones adicionales.</p>
        )}
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            <strong>Marco Legal:</strong> La presente derivación se realiza en conformidad con el
            Artículo 16E de la Ley 21.809, que modifica la Ley General de Educación, estableciendo
            la obligación de los establecimientos educacionales de implementar procedimientos de
            convivencia escolar con debido proceso. Asimismo, se considera lo dispuesto en la
            Circular 482/2018 de la Superintendencia de Educación Escolar y el Reglamento Interno
            RICE 2026 del establecimiento.
          </p>
        </div>
      </Section>

      <div className="mt-8 border-neutral-300 border-t pt-4 text-center">
        <div className="mt-8 inline-block border-neutral-400 border-t px-12 pt-1">
          {coordinatorName || '_________________________'}
        </div>
        <p className="mt-0.5 text-[10px] text-neutral-500">Encargado/a de Convivencia Escolar</p>
      </div>
    </div>
  );
}
