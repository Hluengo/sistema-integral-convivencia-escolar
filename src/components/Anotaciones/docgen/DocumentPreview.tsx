/** @license SPDX-License-Identifier: Apache-2.0 */

import { Printer, FileDown, FileText } from 'lucide-react';
import type { Annotation } from '../../../types';
import { LOGO_BASE64 } from '../../../lib/logoBase64';

const DEFAULT_COMMITMENTS = [
  'Asistir a todas las clases según horario establecido.',
  'Mantener una conducta respetuosa y acorde a las normas del establecimiento.',
  'Cumplir con las tareas y trabajos académicos asignados.',
  'Participar en las actividades formativas y de orientación programadas por Convivencia Escolar.',
];

// ── Types ───────────────────────────────────────────────────────

interface DocumentPreviewProps {
  docType: 'amonestacion' | 'compromiso_conductual' | 'derivacion';
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  docObservations: string;
  customCommitments: string[];
  selectedAnnsObjects: Annotation[];
  hasTenOrMore: boolean;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
}

interface AnnotationsListProps {
  annotations: Annotation[];
}

const TITLE_MAP: Record<string, string> = {
  amonestacion: 'Amonestación Escrita',
  compromiso_conductual: 'Carta de Compromiso Conductual',
  derivacion: 'Derivación Equipo de Convivencia Escolar',
};

function AnnotationsList({ annotations }: AnnotationsListProps) {
  if (!annotations.length) {
    return (
      <p className="text-sm text-neutral-400 italic">
        No se han seleccionado anotaciones.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {annotations.map((ann, idx) => (
        <li
          key={ann.id}
          className="flex items-start gap-2 text-xs text-neutral-700 border-b border-dashed border-neutral-200 pb-1.5 last:border-b-0"
        >
          <span className="font-mono text-neutral-400 shrink-0 w-5 text-right">
            {idx + 1}.
          </span>
          <span className="font-medium text-neutral-500 shrink-0 whitespace-nowrap">
            {ann.date ?? '—'}
          </span>
          <span className="text-neutral-700 leading-snug">{ann.text}</span>
          <span
            className={`shrink-0 ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
              ann.severity === 'Leve'
                ? 'bg-yellow-100 text-yellow-700'
                : ann.severity === 'Grave'
                  ? 'bg-orange-100 text-orange-700'
                  : ann.severity === 'Muy Grave'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-rose-100 text-rose-800'
            }`}
          >
            {ann.severity}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-neutral-800 border-b-2 border-neutral-300 pb-1 mb-3 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 text-white text-[11px] font-bold shrink-0">
          {number}
        </span>
        {title}
      </h3>
      <div className="text-xs text-neutral-700 leading-relaxed space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="flex gap-2">
      <span className="font-semibold text-neutral-600 shrink-0 w-36">{label}:</span>
      <span className="text-neutral-800">{value}</span>
    </p>
  );
}

export default function DocumentPreview({
  docType,
  currentName,
  currentRut,
  currentCourse,
  currentTeacher,
  coordinatorName,
  apoderadoName,
  dateStr,
  negativeCount,
  docObservations,
  customCommitments,
  selectedAnnsObjects,
  onPrint,
  onExportPDF,
  onExportWord,
}: DocumentPreviewProps) {
  const title = TITLE_MAP[docType] ?? 'Documento Disciplinario';

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Acciones del Documento
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-700 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={onExportWord}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            Descargar Word
          </button>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-lg rounded-xl border border-neutral-200 p-8 print:p-0 print:border-none print:shadow-none mx-auto">
        {/* School header */}
        <div className="flex items-center gap-4 pb-5 mb-5 border-b-2 border-neutral-300">
          <img
            src={LOGO_BASE64}
            alt="Logo Colegio"
            className="h-16 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
              Fundación Educacional Colegio Carmela Romero de Espinosa
            </span>
            <span className="text-sm font-bold text-neutral-800 mt-0.5">
              DIRECCIÓN DE CONVIVENCIA ESCOLAR
            </span>
            <span className="text-[11px] text-neutral-500">Año 2026</span>
          </div>
        </div>

        <h2 className="text-lg font-extrabold text-neutral-900 text-center uppercase tracking-wide mb-6">
          {title}
        </h2>

        {docType === 'amonestacion' && (
          <AmonestacionContent
            currentName={currentName}
            currentRut={currentRut}
            currentCourse={currentCourse}
            currentTeacher={currentTeacher}
            coordinatorName={coordinatorName}
            apoderadoName={apoderadoName}
            dateStr={dateStr}
            negativeCount={negativeCount}
            docObservations={docObservations}
            selectedAnnsObjects={selectedAnnsObjects}
          />
        )}

        {docType === 'compromiso_conductual' && (
          <CompromisoContent
            currentName={currentName}
            currentRut={currentRut}
            currentCourse={currentCourse}
            currentTeacher={currentTeacher}
            coordinatorName={coordinatorName}
            apoderadoName={apoderadoName}
            dateStr={dateStr}
            negativeCount={negativeCount}
            docObservations={docObservations}
            customCommitments={customCommitments}
            selectedAnnsObjects={selectedAnnsObjects}
          />
        )}

        {docType === 'derivacion' && (
          <DerivacionContent
            currentName={currentName}
            currentRut={currentRut}
            currentCourse={currentCourse}
            currentTeacher={currentTeacher}
            coordinatorName={coordinatorName}
            apoderadoName={apoderadoName}
            dateStr={dateStr}
            negativeCount={negativeCount}
            docObservations={docObservations}
            selectedAnnsObjects={selectedAnnsObjects}
          />
        )}
      </div>
    </div>
  );
}

function AmonestacionContent({
  currentName,
  currentRut,
  currentCourse,
  currentTeacher,
  coordinatorName,
  apoderadoName,
  dateStr,
  negativeCount,
  docObservations,
  selectedAnnsObjects,
}: {
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  docObservations: string;
  selectedAnnsObjects: Annotation[];
}) {
  return (
    <div className="space-y-1">
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={currentTeacher} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Emisión" value={dateStr} />
        <DataRow label="Encargado de Convivencia" value={coordinatorName || '________________'} />
        <DataRow label="N° de Anotaciones Negativas" value={negativeCount} />
        <p className="text-xs text-neutral-500 mt-1 italic">
          En virtud de lo dispuesto en el Reglamento Interno RICE 2026 y la Circular 482/2018.
        </p>
      </Section>

      <Section number={2} title="Hechos">
        <p className="mb-2">
          El/La estudiante <strong>{currentName}</strong> del curso <strong>{currentCourse}</strong> ha incurrido en
          las siguientes faltas registradas en el sistema de anotaciones del establecimiento:
        </p>
        <AnnotationsList annotations={selectedAnnsObjects} />
      </Section>

      <Section number={3} title="Fundamentación">
        <p>
          Las conductas descritas constituyen una infracción a las normas de convivencia escolar
          establecidas en el Reglamento Interno RICE 2026, contraviniendo los principios de respeto,
          responsabilidad y buena convivencia que rigen la vida escolar.
        </p>
        <p className="mt-2">
          De conformidad con el Artículo 16E de la Ley 21.809 y la Circular 482 de la Superintendencia
          de Educación, se procede a emitir la presente amonestación escrita como medida formativa
          y correctiva.
        </p>
        {docObservations && (
          <p className="mt-2 text-neutral-600 italic">
            Observaciones: {docObservations}
          </p>
        )}
      </Section>

      <Section number={4} title="Medida">
        <p>
          Se aplica la medida de <strong>Amonestación Escrita</strong>, consistente en la notificación
          formal por escrito al estudiante, apoderado y profesor jefe, quedando registro en la hoja de
          vida escolar del estudiante.
        </p>
        <p className="mt-2">
          El apoderado deberá tomar conocimiento y firmar la presente carta, comprometiéndose a
          reforzar en el hogar las normas de conducta y respeto hacia la comunidad educativa.
        </p>
      </Section>

      <Section number={5} title="Compromisos">
        <p className="font-medium text-neutral-700 mb-1">El estudiante se compromete a:</p>
        <ol className="list-decimal list-inside text-xs text-neutral-700 space-y-1 ml-2">
          <li>Cumplir con las normas del Reglamento Interno RICE 2026.</li>
          <li>Mantener una conducta respetuosa hacia compañeros, docentes y asistentes de la educación.</li>
          <li>Asistir puntualmente a clases y participar activamente en las actividades pedagógicas.</li>
          <li>Reparar el daño causado, si correspondiere, según lo acordado con Convivencia Escolar.</li>
        </ol>
        <p className="mt-3 text-[10px] text-neutral-500 italic">
          El incumplimiento de los presentes compromisos podrá derivar en la aplicación de medidas
          disciplinarias de mayor severidad, conforme al debido proceso y la normativa vigente.
        </p>
      </Section>

      <div className="mt-8 pt-4 border-t border-neutral-300 grid grid-cols-2 gap-8 text-xs text-neutral-600">
        <div className="text-center">
          <div className="border-t border-neutral-400 pt-1 mt-8">
            {coordinatorName || '_________________________'}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5">Encargado/a de Convivencia Escolar</p>
        </div>
        <div className="text-center">
          <div className="border-t border-neutral-400 pt-1 mt-8">
            {apoderadoName || '_________________________'}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5">Apoderado/a</p>
        </div>
      </div>
    </div>
  );
}

function CompromisoContent({
  currentName,
  currentRut,
  currentCourse,
  currentTeacher,
  coordinatorName,
  apoderadoName,
  dateStr,
  negativeCount,
  docObservations,
  customCommitments,
  selectedAnnsObjects,
}: {
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  docObservations: string;
  customCommitments: string[];
  selectedAnnsObjects: Annotation[];
}) {
  return (
    <div className="space-y-1">
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={currentTeacher} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Emisión" value={dateStr} />
        <DataRow label="Encargado de Convivencia" value={coordinatorName || '________________'} />
        <DataRow label="N° de Anotaciones Negativas" value={negativeCount} />
        <p className="text-xs text-neutral-500 mt-1 italic">
          De conformidad con el Artículo 16E de la Ley 21.809, Reglamento Interno RICE 2026
          y Circular 482 de la Superintendencia de Educación.
        </p>
      </Section>

      <Section number={2} title="Hechos">
        <p className="mb-2">
          El/La estudiante <strong>{currentName}</strong> del curso <strong>{currentCourse}</strong>
          {' '}ha acumulado <strong>{negativeCount} anotaciones negativas</strong>, lo que constituye una
          reiteración de conductas contrarias a las normas de convivencia escolar establecidas,
          alcanzando el umbral que activa el presente compromiso conductual.
        </p>
      </Section>

      <Section number={3} title="Compromisos del Estudiante">
        <p className="font-medium text-neutral-700 mb-1">
          El/La estudiante se compromete libre y voluntariamente a:
        </p>
        <ol className="list-decimal list-inside text-xs text-neutral-700 space-y-1 ml-2">
          {customCommitments.length > 0
            ? customCommitments.map((c, i) => (
                <li key={c || i}>{c}</li>
              ))
            : DEFAULT_COMMITMENTS.map((c, i) => (
                <li key={c || i}>{c}</li>
              ))}
        </ol>
      </Section>

      <Section number={4} title="Compromisos del Apoderado">
        <p className="font-medium text-neutral-700 mb-1">
          El/La apoderado/a <strong>{apoderadoName || '________________'}</strong> se compromete a:
        </p>
        <ol className="list-decimal list-inside text-xs text-neutral-700 space-y-1 ml-2">
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
        <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 ml-2 mt-1">
          <li>Se programarán reuniones quincenales de seguimiento con el apoderado.</li>
          <li>El profesor jefe reportará semanalmente la evolución del estudiante.</li>
          <li>Al término del periodo, se evaluará el cumplimiento de los compromisos.</li>
        </ul>
        {docObservations && (
          <p className="mt-2 text-neutral-600 italic">Observaciones: {docObservations}</p>
        )}
      </Section>

      <div className="mt-8 pt-4 border-t border-neutral-300">
        <p className="text-xs font-bold text-neutral-700 text-center mb-6 uppercase tracking-wide">
          Firma de Compromiso
        </p>
        <div className="grid grid-cols-3 gap-6 text-xs text-neutral-600">
          <div className="text-center">
            <div className="border-t border-neutral-400 pt-1 mt-8">
              {currentName}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Estudiante</p>
          </div>
          <div className="text-center">
            <div className="border-t border-neutral-400 pt-1 mt-8">
              {apoderadoName || '_________________________'}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Apoderado/a</p>
          </div>
          <div className="text-center">
            <div className="border-t border-neutral-400 pt-1 mt-8">
              {coordinatorName || '_________________________'}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Encargado/a de Convivencia Escolar</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-neutral-400 mt-4 italic">
          Firmado en {dateStr}, en conformidad con el debido proceso establecido en la Circular 482/2018
          y la Ley 21.809.
        </p>
      </div>
    </div>
  );
}

function DerivacionContent({
  currentName,
  currentRut,
  currentCourse,
  currentTeacher,
  coordinatorName,
  apoderadoName,
  dateStr,
  negativeCount,
  docObservations,
  selectedAnnsObjects,
}: {
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  docObservations: string;
  selectedAnnsObjects: Annotation[];
}) {
  return (
    <div className="space-y-1">
      <Section number={1} title="Antecedentes">
        <DataRow label="Nombre del Estudiante" value={currentName} />
        <DataRow label="RUT" value={currentRut} />
        <DataRow label="Curso" value={currentCourse} />
        <DataRow label="Profesor Jefe" value={currentTeacher} />
        <DataRow label="Apoderado" value={apoderadoName || '________________'} />
        <DataRow label="Fecha de Derivación" value={dateStr} />
        <DataRow label="Derivado por" value={coordinatorName || '________________'} />
        <DataRow label="N° de Anotaciones Negativas" value={negativeCount} />
        <p className="text-xs text-neutral-500 mt-1 italic">
          En el marco de la Ley 21.809, Ley 20.845 de Inclusión Escolar, Circular 482/2018
          y Reglamento Interno RICE 2026.
        </p>
      </Section>

      <Section number={2} title="Motivo de Derivación">
        <p>
          Se deriva al/la estudiante <strong>{currentName}</strong> al Equipo de Convivencia Escolar
          debido a la acumulación de <strong>{negativeCount} anotaciones negativas</strong>,
          que evidencian conductas reiteradas que afectan la sana convivencia del establecimiento
          educacional.
        </p>
        <div className="mt-2">
          <p className="font-medium text-neutral-700 mb-1">Registro de anotaciones:</p>
          <AnnotationsList annotations={selectedAnnsObjects} />
        </div>
      </Section>

      <Section number={3} title="Intervenciones Realizadas">
        <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 ml-2">
          <li>Entrevistas con el/la estudiante por parte del profesor jefe.</li>
          <li>Comunicaciones y citaciones al apoderado.</li>
          <li>Registro de anotaciones negativas en el sistema de convivencia escolar.</li>
          <li>Medidas pedagógicas y formativas previas aplicadas en el aula.</li>
          <li>Entrevista con el equipo directivo y/o UTP según corresponda.</li>
        </ul>
      </Section>

      <Section number={4} title="Acciones Sugeridas">
        <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 ml-2">
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
          <p className="text-neutral-400 italic">
            Sin observaciones adicionales.
          </p>
        )}
        <div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            <strong>Marco Legal:</strong> La presente derivación se realiza en conformidad con el Artículo 16E
            de la Ley 21.809, que modifica la Ley General de Educación, estableciendo la obligación de los
            establecimientos educacionales de implementar procedimientos de convivencia escolar con debido
            proceso. Asimismo, se considera lo dispuesto en la Circular 482/2018 de la Superintendencia
            de Educación Escolar y el Reglamento Interno RICE 2026 del establecimiento.
          </p>
        </div>
      </Section>

      <div className="mt-8 pt-4 border-t border-neutral-300 text-center">
        <div className="border-t border-neutral-400 pt-1 mt-8 inline-block px-12">
          {coordinatorName || '_________________________'}
        </div>
        <p className="text-[10px] text-neutral-500 mt-0.5">Encargado/a de Convivencia Escolar</p>
      </div>
    </div>
  );
}
