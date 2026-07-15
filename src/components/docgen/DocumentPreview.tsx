import React from 'react';
import { Printer, Download, FileText } from 'lucide-react';
import { Annotation } from '../../types';
import { LOGO_BASE64 } from '../../lib/logoBase64';

type DocType = 'amonestacion' | 'derivacion' | 'compromiso_conductual';

interface DocumentPreviewProps {
  docType: DocType;
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

function CompromisoConductualPreview({
  currentName,
  currentRut,
  currentCourse,
  coordinatorName,
  apoderadoName,
  dateStr,
  negativeCount,
  customCommitments,
}: Omit<DocumentPreviewProps, 'docType' | 'currentTeacher' | 'docObservations' | 'selectedAnnsObjects' | 'hasTenOrMore' | 'onPrint' | 'onExportPDF' | 'onExportWord'>) {
  return (
    <>
      {/* Logo & Centered Header */}
      <div className="text-center pb-2">
        <img src={LOGO_BASE64} className="w-12 h-auto mx-auto mb-2" alt="Escudo Colegio" />
        <h4 className="text-xs font-extrabold tracking-tight text-slate-900 uppercase">
          COLEGIO CARMELA ROMERO DE ESPINOSA
        </h4>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">MADRES DOMINICAS DE CONCEPCIÓN</p>
        <p className="text-[9px] text-amber-700 font-bold uppercase">DIRECCIÓN DE CONVIVENCIA ESCOLAR</p>
        <div className="w-24 h-0.5 bg-amber-500 mx-auto mt-2" />
      </div>

      <h3 className="text-xs font-extrabold text-center uppercase tracking-tight text-slate-950 bg-slate-50 py-2 border rounded-md">
        CARTA DE COMPROMISO CONDUCTUAL 2026
      </h3>

      {/* Section I */}
      <div className="space-y-1.5">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          I. IDENTIFICACIÓN
        </h5>
        <div className="grid grid-cols-2 gap-y-1 text-slate-700 text-[11px]">
          <div>
            <strong>Estudiante:</strong> {currentName}
          </div>
          <div>
            <strong>RUT:</strong> {currentRut}
          </div>
          <div>
            <strong>Curso:</strong> {currentCourse}
          </div>
          <div>
            <strong>Fecha:</strong> {dateStr}
          </div>
          <div>
            <strong>Autoridad:</strong> Coordinación de Ciclo
          </div>
          <div>
            <strong>Responsable:</strong> {coordinatorName}
          </div>
          <div className="col-span-2">
            <strong>Apoderado:</strong> {apoderadoName || '__________________________________'}
          </div>
        </div>
      </div>

      {/* Section II */}
      <div className="space-y-1">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          II. ANTECEDENTES Y FUNDAMENTACIÓN
        </h5>
        <p className="text-slate-600 text-[11px] text-justify leading-relaxed">
          Se informa al apoderado que el estudiante ha incurrido en una Falta Grave de acuerdo con lo estipulado en el
          Artículo 24 BIS del Reglamento Interno de Convivencia Escolar (RICE) 2026, al alcanzar una acumulación de más de{' '}
          {negativeCount} anotaciones negativas a la fecha.
        </p>
      </div>

      {/* Section III */}
      <div className="space-y-1">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          III. MEDIDA DISCIPLINARIA APLICADA
        </h5>
        <p className="text-slate-600 text-[11px] text-justify leading-relaxed">
          En coherencia con el carácter formativo de nuestra disciplina y habiendo agotado las instancias pedagógicas previas
          (Llamado de atención y Amonestación Escrita), se aplica la Medida N° 4: Carta de Compromiso Conductual.
        </p>
        <p className="text-slate-600 text-[11px] text-justify leading-relaxed mt-1">
          Esta medida busca promover la autorregulación, la reflexión profunda sobre el impacto de las acciones propias y
          evitar que la conducta escale a faltas muy graves que comprometan la permanencia en el establecimiento.
        </p>
      </div>

      {/* Section IV */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          IV. COMPROMISOS ESPECÍFICOS DEL ESTUDIANTE
        </h5>
        <div className="space-y-2 text-[11px] text-slate-700 leading-normal">
          <p>
            <strong>1. Respeto Normativo Estricto:</strong>
            <br />
            <span className="text-slate-600">
              Evitar incurrir en cualquier conducta que amerite una nueva anotación negativa o medida disciplinaria durante la
              vigencia de este compromiso.
            </span>
          </p>
          <p>
            <strong>2. Relaciones Prosociales y Buen Trato:</strong>
            <br />
            <span className="text-slate-600">
              Mantener un trato digno, empático y respetuoso con todos los integrantes de la comunidad educativa, eliminando el
              uso de lenguaje ofensivo o gestos despectivos.
            </span>
          </p>
          <p>
            <strong>3. Responsabilidad Personal:</strong>
            <br />
            <span className="text-slate-600">
              Asumir un rol activo en la mejora del clima del curso, colaborando en actividades de orientación y consejo de
              curso.
            </span>
          </p>
        </div>
        {customCommitments.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg mt-2 space-y-1.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              Compromisos Personalizados Incorporados:
            </span>
            <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[11px]">
              {customCommitments.map((comm, i) => (
                <li key={comm || i} className="leading-relaxed">
                  {comm}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Section V */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          V. SEGUIMIENTO, MONITOREO Y VIGENCIA
        </h5>
        <div className="space-y-1 text-[11px] text-slate-600">
          <p>
            • <strong>Vigencia:</strong> Este compromiso se mantendrá durante el transcurso del año escolar vigente.
          </p>
          <p>
            • <strong>Seguimiento:</strong> El estudiante mantendrá reuniones periódicas con el Coordinador de Ciclo y su
            Profesor Jefe para evaluar el avance de sus objetivos.
          </p>
          <p>
            • <strong>Apoyo Psicosocial:</strong> Se deriva al estudiante a entrevista con la Psicóloga de Ciclo para identificar
            factores emocionales subyacentes y fortalecer habilidades socioemocionales cuando corresponda.
          </p>
          <p>
            • <strong>Incumplimiento:</strong> El incumplimiento de estos compromisos facultará al establecimiento para escalar
            las medidas disciplinarias según el Reglamento de Convivencia Escolar vigente.
          </p>
        </div>
      </div>

      {/* Signatures */}
      <div className="border-t border-slate-200 pt-8 mt-4 grid grid-cols-3 gap-4 text-center text-[9px] text-slate-500 font-medium">
        <div>
          <div className="border-t border-slate-300 w-24 mx-auto pt-1 font-bold text-slate-700">Coordinador de Ciclo</div>
          <span>{coordinatorName}</span>
        </div>
        <div>
          <div className="border-t border-slate-300 w-24 mx-auto pt-1 font-bold text-slate-700">Apoderado</div>
          <span>Firma / RUT</span>
        </div>
        <div>
          <div className="border-t border-slate-300 w-24 mx-auto pt-1 font-bold text-slate-700">Estudiante</div>
          <span>{currentName}</span>
        </div>
      </div>
    </>
  );
}

function AmonestacionPreview({
  currentName,
  currentCourse,
  coordinatorName,
  currentTeacher,
  apoderadoName,
  negativeCount,
  customCommitments,
}: Pick<DocumentPreviewProps, 'currentName' | 'currentCourse' | 'coordinatorName' | 'currentTeacher' | 'apoderadoName'> & {
  negativeCount: number;
  customCommitments: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Section I */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          I. IDENTIFICACIÓN
        </h5>
        <div className="text-[11px] text-slate-700 space-y-0.5">
          <p>
            <strong>Estudiante:</strong> {currentName}
          </p>
          <p>
            <strong>Curso:</strong> {currentCourse}
          </p>
          <p>
            <strong>Autoridad que Notifica:</strong> {coordinatorName}
          </p>
        </div>
      </div>

      {/* Section II */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          II. ANTECEDENTES Y FUNDAMENTACIÓN
        </h5>
        <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
          Se informa al apoderado que el estudiante registra a la fecha una acumulación de{' '}
          <strong>{negativeCount} anotaciones</strong> en su hoja de vida por conductas y/o responsabilidad.
        </p>
        <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
          De acuerdo con lo estipulado en el Artículo 24 BIS del Reglamento Interno de Convivencia Escolar (RICE) 2026, al
          haber alcanzado y superado el umbral de la{' '}
          <em>Primera acumulación (5 anotaciones leves acumuladas)</em>, corresponde aplicar la medida regulada para este
          tramo.
        </p>
      </div>

      {/* Section III */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          III. MEDIDA DISCIPLINARIA APLICADA
        </h5>
        <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
          En coherencia con el carácter formativo de nuestra disciplina (Art. 5 y Art. 15), se procede a aplicar la Medida N°
          3: Amonestación Escrita Formal (según el Art. 18 y el Art. 24 BIS del RICE 2026).
        </p>
        <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
          El propósito es promover la autorregulación inmediata y la reflexión formativa en el estudiante para evitar que su
          conducta continúe escalando en el registro de observaciones.
        </p>
      </div>

      {/* Section IV */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          IV. COMPROMISOS ESPECÍFICOS DEL ESTUDIANTE Y APODERADO
        </h5>
        <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
          El estudiante, en conjunto con su familia, se compromete formalmente a cumplir con los siguientes objetivos de
          mejora:
        </p>
        <div className="space-y-1.5 text-[11px] text-slate-700">
          <p>
            <strong>Desarrollo de Actitudes Positivas:</strong>{' '}
            <span className="text-slate-600">
              Estimular el esfuerzo personal del alumno para desarrollar conductas constructivas y fortalecer habilidades
              sociales en beneficio de una sana convivencia escolar.
            </span>
          </p>
          <p>
            <strong>Respeto y Resguardo del Clima Escolar:</strong>{' '}
            <span className="text-slate-600">
              Velar activamente por la sana convivencia de la comunidad, evitando de forma estricta participar en juegos,
              bromas, disturbios o desórdenes que puedan generar daño físico o emocional a terceros.
            </span>
          </p>
          <p>
            <strong>Supervisión Familiar Directa:</strong>{' '}
            <span className="text-slate-600">
              El apoderado se compromete a supervisar de forma regular el comportamiento de su pupilo, entregándole
              directrices claras alineadas con la línea educativa y los valores de nuestro Colegio.
            </span>
          </p>
          <p>
            <strong>Comunicación Activa Casa-Colegio:</strong>{' '}
            <span className="text-slate-600">
              El apoderado mantendrá un contacto fluido con la institución, a través de la Profesora Jefe, para informarse
              oportunamente sobre el desempeño, avances y logros del alumno.
            </span>
          </p>
        </div>
        {customCommitments.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg mt-2 space-y-1.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              Compromisos Personalizados Incorporados:
            </span>
            <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[11px]">
              {customCommitments.map((comm, i) => (
                <li key={comm || i} className="leading-relaxed">
                  {comm}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Section V */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          V. SEGUIMIENTO, MONITOREO Y VIGENCIA
        </h5>
        <div className="space-y-1.5 text-[11px] text-slate-600">
          <p>
            • <strong>Vigencia:</strong> Este proceso de acompañamiento y la presente amonestación se mantendrán vigentes
            durante el transcurso del año escolar 2026.
          </p>
          <p>
            • <strong>Seguimiento:</strong> El estudiante será acompañado en su proceso formativo-educativo a través de un
            seguimiento constante y comunicación directa entre el apoderado, la Profesora Jefe y la Inspectora de Ciclo.
          </p>
          <p>
            • <strong>Advertencia:</strong> Se advierte al apoderado que, de continuar acumulando observaciones negativas y
            alcanzar las diez (10) anotaciones, el Colegio se verá en la necesidad de aplicar la{' '}
            <em>Segunda acumulación</em> contemplada en el Art. 24 BIS, correspondiente a la Medida N° 4: Carta de Compromiso
            Conductual.
          </p>
        </div>
      </div>
    </div>
  );
}

function DerivacionPreview({
  currentName,
  currentCourse,
  currentRut,
  currentTeacher,
}: Pick<DocumentPreviewProps, 'currentName' | 'currentCourse' | 'currentRut' | 'currentTeacher'>) {
  return (
    <div className="space-y-3.5 text-slate-600">
      {/* Section I */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          I. IDENTIFICACIÓN
        </h5>
        <div className="text-[11px] text-slate-700 space-y-0.5">
          <p><strong>Estudiante:</strong> {currentName}</p>
          <p><strong>Curso:</strong> {currentCourse}</p>
          <p><strong>Autoridad que Notifica:</strong> Coordinación de Convivencia Escolar</p>
        </div>
      </div>

      {/* Section II */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          II. ANTECEDENTES DEL PROCESO FORMATIVO PREVIO
        </h5>
        <div className="text-[11px] text-slate-600 space-y-1.5">
          <p><strong>1. Fecha de Suscripción de la Carta de Compromiso:</strong> ____________________</p>
          <p><strong>2. Objeto del Compromiso Firmado:</strong> Adherencia estricta a las pautas normativas del aula, cese definitivo de conductas disruptivas, respeto a los profesionales de la educación y cumplimiento de la responsabilidad escolar.</p>
          <p><strong>3. Estado de Cumplimiento actual:</strong> INCUMPLIDO / NO RESPETADO. El o la estudiante no ha modificado su comportamiento a pesar de los compromisos firmados. Muestra una actitud de desinterés y rechazo frente a las normas de la sala de clases y no sigue las indicaciones de apoyo que el colegio le ha entregado para ayudarle a mejorar.</p>
        </div>
      </div>

      {/* Section III */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          III. SUSTENTO NORMATIVO SEGÚN EL RICE 2026
        </h5>
        <div className="text-[11px] text-slate-600 space-y-1.5">
          <p><strong>1. Configuración del Carácter de la Falta (Art. 24 BIS):</strong> De acuerdo al Artículo 24 BIS del RICE, acumular de forma constante anotaciones negativas daña la sana convivencia dentro del colegio. Esta situación hace que el comportamiento del estudiante pase a ser una <strong><em>Falta Grave por Acumulación y Desobediencia</em></strong>. Esto permite que la Coordinación de Ciclo y el Equipo de Convivencia Escolar intervenogan de inmediato con un plan de apoyo intensivo y evalúen medidas más estrictas (como la Condicionalidad de la Matrícula).</p>
          <p><strong>2. Evaluación Longitudinal de la Hoja de Vida (Art. 15.5):</strong> La determinación de las medidas correctivas exige ponderar la receptividad y la trayectoria conductual del menor a lo largo del año académico. En este caso, concurre la circunstancia <strong><em>Agravante de Reiteración Sistemática (Art. 17)</em></strong>, invalidando los compromisos previos debido a su comportamiento posterior en el aula.</p>
        </div>
      </div>

      {/* Section IV */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          IV. OBJETIVOS ESPECÍFICOS DE LA DERIVACIÓN ACTUAL
        </h5>
        <div className="text-[11px] text-slate-600 space-y-1.5">
          <p><strong>1. Intervención y Soporte Psicosocial Intensivo:</strong> Ejecutar el programa de acompañamiento psicosocial diseñado para estudiantes que presentan resistencia severa al cambio conductual y normativo (Art. 12, Rol del Área de Apoyo).</p>
          <p><strong>2. Diagnóstico Formativo Interno:</strong> Evaluar si las constantes transgresiones a las reglas de comportamiento responden a dificultades emocionales latentes o a dinámicas de interrelación específicas dentro del grupo curso.</p>
          <p><strong>3. Preparación de Antecedentes Directivos:</strong> Levantar un informe técnico que sirva de insumo formativo prioritario ante el Consejo de Profesores y la Dirección del establecimiento en caso de requerirse una resolución disciplinaria formal de condicionalidad o no renovación de matrícula.</p>
        </div>
      </div>

      {/* Section V */}
      <div className="space-y-2">
        <h5 className="font-extrabold text-slate-900 text-[10px] border-b pb-0.5 uppercase tracking-wide">
          V. DOCUMENTACIÓN OBLIGATORIA ADJUNTA AL EXPEDIENTE
        </h5>
        <div className="text-[11px] text-slate-600 space-y-1">
          <p>☐  Copia digitalizada de la Carta de Compromiso Institucional firmada por el apoderado, el alumno y la coordinación.</p>
          <p>☐  Reporte digital completo y firmado de la Hoja de Vida del Estudiante (Libro de clases).</p>
          <p>☐  Bitácora de entrevistas previas sostenidas por el Profesor Jefe con el apoderado.</p>
        </div>
      </div>
    </div>
  );
}

function AnnotationsList({
  selectedAnnsObjects,
}: {
  selectedAnnsObjects: Annotation[];
}) {
  return (
    <div className="bg-slate-50/70 p-3.5 rounded border border-slate-200">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
        Historial de Anotaciones Seleccionadas:
      </span>
      {selectedAnnsObjects.length > 0 ? (
        <div className="space-y-2">
          {selectedAnnsObjects.map(ann => (
            <div key={ann.id} className="text-[11px] border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>
                  {ann.date} • {ann.registered_by}
                </span>
                <span className="font-extrabold text-red-600 uppercase text-[8px]">{ann.severity}</span>
              </div>
              <p className="text-slate-700 mt-0.5">{ann.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <span className="italic text-[11px] text-slate-400">
          No se han seleccionado anotaciones para este documento escolar.
        </span>
      )}
    </div>
  );
}

function ObservationsBox({ observations }: { observations: string }) {
  if (!observations) return null;
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        Observaciones y acuerdos de mejora:
      </span>
      <p className="bg-amber-50/30 p-2.5 rounded border border-amber-200/50 text-[11px] text-slate-700 leading-relaxed italic">
        &quot;{observations}&quot;
      </p>
    </div>
  );
}

function AmonestacionSignatures({
  coordinatorName,
  currentTeacher,
  apoderadoName,
  currentName,
  currentRut,
}: Pick<DocumentPreviewProps, 'coordinatorName' | 'currentTeacher' | 'apoderadoName' | 'currentName' | 'currentRut'>) {
  return (
    <div className="border-t border-slate-200 pt-8 mt-4 text-[9px] text-slate-500 font-medium">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr>
            <th className="pb-2 border-b border-slate-300 font-bold text-slate-700">FIRMA INSPECTOR/A</th>
            <th className="pb-2 border-b border-slate-300 font-bold text-slate-700">FIRMA PROFESOR/A JEFE</th>
            <th className="pb-2 border-b border-slate-300 font-bold text-slate-700">FIRMA APODERADO/A</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pt-12 px-2">{coordinatorName}</td>
            <td className="pt-12 px-2">{currentTeacher}</td>
            <td className="pt-12 px-2">{apoderadoName || '________________'}</td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse text-center mt-4">
        <thead>
          <tr>
            <th className="pb-2 border-b border-slate-300 font-bold text-slate-700">FIRMA ESTUDIANTE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pt-12 px-2">
              {currentName} — RUT: {currentRut}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DerivacionSignatures({
  currentRut,
  apoderadoName,
  currentTeacher,
  coordinatorName,
}: Pick<DocumentPreviewProps, 'currentRut' | 'apoderadoName' | 'currentTeacher' | 'coordinatorName'>) {
  return (
    <div className="border-t border-slate-100 pt-8 grid grid-cols-2 gap-x-8 gap-y-12 text-center text-[9px] text-slate-400 font-medium">
      <div>
        <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-bold text-slate-600">Estudiante</div>
        <span>RUT: {currentRut}</span>
      </div>
      <div>
        <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-bold text-slate-600">Apoderado/a</div>
        <span>{apoderadoName || 'Firma Apoderado'}</span>
      </div>
      <div>
        <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-bold text-slate-600">Profesor/a Jefe</div>
        <span>{currentTeacher}</span>
      </div>
      <div>
        <div className="border-t border-slate-300 w-32 mx-auto pt-1 font-bold text-slate-600">
          Inspectoría / Convivencia
        </div>
        <span>{coordinatorName}</span>
      </div>
    </div>
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
  hasTenOrMore,
  onPrint,
  onExportPDF,
  onExportWord,
}: DocumentPreviewProps) {
  return (
    <div className="lg:col-span-7 space-y-3">
      <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <span>Vista de Impresión Escolar</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1 text-[10px] bg-white border rounded px-2 py-1 text-slate-700 hover:bg-slate-50 transition-all font-semibold"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button
            type="button"
            onClick={onExportPDF}
            className="flex items-center gap-1 text-[10px] bg-white border rounded px-2 py-1 text-red-700 hover:bg-red-50 border-red-200 transition-all font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            type="button"
            onClick={onExportWord}
            className="flex items-center gap-1 text-[10px] bg-white border rounded px-2 py-1 text-indigo-700 hover:bg-indigo-50 border-indigo-200 transition-all font-semibold"
          >
            <FileText className="w-3.5 h-3.5" /> Word (.docx)
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-300 p-8 shadow-md rounded-2xl text-slate-800 leading-normal font-sans text-xs select-none max-h-[620px] overflow-y-auto space-y-6 relative border-t-[8px] border-t-indigo-600">
        {docType === 'compromiso_conductual' ? (
          <CompromisoConductualPreview
            currentName={currentName}
            currentRut={currentRut}
            currentCourse={currentCourse}
            coordinatorName={coordinatorName}
            apoderadoName={apoderadoName}
            dateStr={dateStr}
            negativeCount={negativeCount}
            customCommitments={customCommitments}
          />
        ) : (
          <>
            {/* Shared Preview Header for Amonestación & Derivación */}
            <div className="text-center border-b border-slate-100 pb-4">
              <img src={LOGO_BASE64} className="w-12 h-auto mx-auto mb-2" alt="Escudo Colegio" />
              <h4 className="text-xs font-extrabold tracking-widest text-slate-700 uppercase">
                COLEGIO CARMELA ROMERO DE ESPINOSA
              </h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">MADRES DOMINICAS DE CONCEPCIÓN</p>
              <p className="text-[9px] text-amber-700 font-bold uppercase">DIRECCIÓN DE CONVIVENCIA ESCOLAR</p>
              <div className="w-24 h-0.5 bg-amber-500 mx-auto mt-2" />
            </div>

            <h3 className="text-xs font-extrabold text-center uppercase tracking-tight text-slate-900 bg-slate-50 py-2 border rounded">
              {docType === 'derivacion'
                ? 'DERIVACIÓN EQUIPO DE CONVIVENCIA ESCOLAR — AÑO 2026'
                : 'CARTA DE AMONESTACIÓN AÑO 2026'}
            </h3>

            {docType === 'amonestacion' && (
              <AmonestacionPreview
                currentName={currentName}
                currentCourse={currentCourse}
                coordinatorName={coordinatorName}
                currentTeacher={currentTeacher}
                apoderadoName={apoderadoName}
                negativeCount={negativeCount}
                customCommitments={customCommitments}
              />
            )}

            {docType === 'derivacion' && (
              <DerivacionPreview
                currentName={currentName}
                currentCourse={currentCourse}
                currentRut={currentRut}
                currentTeacher={currentTeacher}
              />
            )}

            <AnnotationsList selectedAnnsObjects={selectedAnnsObjects} />

            <ObservationsBox observations={docObservations} />

            {docType === 'amonestacion' ? (
              <AmonestacionSignatures
                coordinatorName={coordinatorName}
                currentTeacher={currentTeacher}
                apoderadoName={apoderadoName}
                currentName={currentName}
                currentRut={currentRut}
              />
            ) : (
              <DerivacionSignatures
                currentRut={currentRut}
                apoderadoName={apoderadoName}
                currentTeacher={currentTeacher}
                coordinatorName={coordinatorName}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
