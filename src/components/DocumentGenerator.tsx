import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Student, Annotation, CartaDisciplinaria } from '../types';
import { maskName, maskRut, getCurrentDateStr } from '../lib/utils';
import { getSavedConfig, saveCarta } from '../lib/supabase';
import { TEACHERS_BY_COURSE } from './StudentTable';
import { buildDocx, DocType } from '../lib/docxBuilder';
import { buildPdf } from '../lib/pdfBuilder';
import { LOGO_BASE64 } from '../lib/logoBase64';
import DocTypeSelector from './docgen/DocTypeSelector';
import DocumentWarnings from './docgen/DocumentWarnings';
import DocumentForm from './docgen/DocumentForm';
import DocumentPreview from './docgen/DocumentPreview';

interface DocumentGeneratorProps {
  student: Student;
  annotations: Annotation[];
  privacyMode: boolean;
  currentStep?: number;
}

interface CompromisoConductual {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  rut: string;
  emittedAt: string;
  emittedBy: string;
  coordinatorName: string;
  negativeCount: number;
  additionalCommitments: string[];
  status: string;
  observations: string;
}

const getRequiredStep = (type: string) => {
  if (type === 'amonestacion') return 2;
  if (type === 'compromiso_conductual') return 3;
  if (type === 'derivacion') return 4;
  return 1;
};

export default function DocumentGenerator({ student, annotations, privacyMode, currentStep }: DocumentGeneratorProps) {
  const negativeAnns = annotations.filter(a => a.type === 'Negativa');
  const hasTenOrMore = negativeAnns.length >= 10;

  const [docType, setDocType] = useState<'amonestacion' | 'derivacion' | 'compromiso_conductual'>(() => {
    if (currentStep === 2) return 'amonestacion';
    if (currentStep === 3) return 'compromiso_conductual';
    if (currentStep === 4) return 'derivacion';
    return hasTenOrMore ? 'compromiso_conductual' : 'amonestacion';
  });

  const isDocLockedByProgress = currentStep !== undefined && currentStep < getRequiredStep(docType);

  // Form states
  const [apoderadoName, setApoderadoName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('Sor María Inés');
  const [emittedBy, setEmittedBy] = useState('Coordinador de Convivencia Escolar');
  const [docObservations, setDocObservations] = useState('');
  const [selectedAnnotationsForDoc, setSelectedAnnotationsForDoc] = useState<string[]>([]);
  const [compromisoStatus, setCompromisoStatus] = useState<string>('Emitida');

  // Custom commitments
  const [customCommitments, setCustomCommitments] = useState<string[]>([]);
  const [newCustomCommitment, setNewCustomCommitment] = useState('');

  // Explicit authorizations
  const [authorizedBypass, setAuthorizedBypass] = useState(false);
  const [authorizedDuplicate, setAuthorizedDuplicate] = useState(false);
  const [bypassProgressLock, setBypassProgressLock] = useState(false);

  // List of all emitted commitments across sessions
  const [emittedList, setEmittedList] = useState<CompromisoConductual[]>([]);

  // Load emitted letters from localStorage
  useEffect(() => {
    const local = localStorage.getItem('convivencia_local_compromisos');
    if (local) {
      try {
        setEmittedList(JSON.parse(local));
      } catch (e) {
        console.warn('Error loading emitted letters:', e);
      }
    }
  }, []);

  // Update selection of negative annotations initially
  useEffect(() => {
    setSelectedAnnotationsForDoc(negativeAnns.map(a => a.id));
  }, [annotations]);

  // Sync default docType if annotations count changes
  useEffect(() => {
    if (negativeAnns.length >= 10) {
      setDocType('compromiso_conductual');
    }
  }, [negativeAnns.length]);

  // Use shared helpers
  const handleMaskName = (name: string) => maskName(name, privacyMode);
  const handleMaskRut = (rut?: string) => maskRut(rut, privacyMode);

  const currentName = handleMaskName(student.full_name);
  const currentRut = handleMaskRut(student.rut);
  const currentCourse = student.course_id;
  const currentTeacher = student.teacher_id || TEACHERS_BY_COURSE[student.course_id] || 'Sin Profesor Asignado';
  const dateStr = getCurrentDateStr();

  const existingLetter = emittedList.find(c => c.studentId === student.id);

  const handleToggleAnnotation = (id: string) => {
    setSelectedAnnotationsForDoc(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddCustomCommitment = () => {
    if (newCustomCommitment.trim()) {
      setCustomCommitments([...customCommitments, newCustomCommitment.trim()]);
      setNewCustomCommitment('');
    }
  };

  const handleRemoveCustomCommitment = (index: number) => {
    setCustomCommitments(customCommitments.filter((_, i) => i !== index));
  };

  // Build document HTML (for print fallback)
  const getDocHTML = () => {
    const selectedAnnsObjects = annotations.filter(a => selectedAnnotationsForDoc.includes(a.id));

    const listHtml =
      selectedAnnsObjects.length > 0
        ? `<div style="margin: 20px 0; background-color: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; color: #334155;">Anotaciones registradas en el periodo:</p>
            <table style="width: 100%; font-size: 11px; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #cbd5e1; color: #475569;">
                  <th style="padding: 6px 4px;">Fecha</th>
                  <th style="padding: 6px 4px;">Gravedad</th>
                  <th style="padding: 6px 4px;">Detalle / Falta</th>
                </tr>
              </thead>
              <tbody style="color: #1e293b;">
                ${selectedAnnsObjects
                  .map(
                    ann => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 4px; font-family: monospace; white-space: nowrap;">${ann.date}</td>
                    <td style="padding: 6px 4px; font-weight: bold; color: #dc2626;">${ann.severity}</td>
                    <td style="padding: 6px 4px;">${ann.text}</td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
           </div>`
        : `<p style="font-style: italic; font-size: 11px; color: #64748b; margin: 20px 0; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center;">No se han seleccionado anotaciones para este documento.</p>`;

    const obsHtml = docObservations
      ? `<div style="margin: 15px 0;">
          <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #334155; margin-bottom: 4px;">Observaciones y medidas pedagógicas adoptadas:</p>
          <p style="font-size: 11px; line-height: 1.5; color: #1e293b; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 0;">${docObservations}</p>
         </div>`
      : '';

    const customCommHTML =
      customCommitments.length > 0
        ? `<div style="margin-top: 10px; padding: 8px; border-left: 3px solid #6366f1; background: #fafafa;">
          <p style="font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #4f46e5;">Compromisos Adicionales Personalizados:</p>
          <ol style="margin: 0; padding-left: 18px; font-size: 11px; line-height: 1.4;">
            ${customCommitments.map(c => `<li>${c}</li>`).join('')}
          </ol>
         </div>`
        : '';

    if (docType === 'compromiso_conductual') {
      return `
        <div style="text-align: center; margin-bottom: 15px;">
          <img src="${LOGO_BASE64}" style="width: 50px; height: auto; margin: 0 auto 8px auto; display: block;" alt="Escudo Colegio" />
          <h2 style="font-family: 'Georgia', serif; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #1e3a8a; margin: 0 0 2px 0; text-transform: uppercase;">COLEGIO CARMELA ROMERO DE ESPINOSA</h2>
          <p style="font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; color: #475569; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 1px;">MADRES DOMINICAS DE CONCEPCIÓN</p>
          <p style="font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; color: #b45309; margin: 0; text-transform: uppercase;">DIRECCIÓN DE CONVIVENCIA ESCOLAR</p>
          <div style="width: 120px; height: 2px; background-color: #b45309; margin: 8px auto 0 auto;"></div>
        </div>

        <h1 style="font-family: 'Arial', sans-serif; font-size: 12px; font-weight: 800; text-align: center; text-transform: uppercase; color: #0f172a; margin: 20px 0; padding: 6px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; letter-spacing: 0.5px;">
          CARTA DE COMPROMISO CONDUCTUAL 2026
        </h1>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">I. IDENTIFICACIÓN</h3>
          <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 5px; color: #1e293b;">
            <tr><td style="width: 150px; padding: 3px 0; font-weight: bold;">Estudiante:</td><td style="padding: 3px 0;">${currentName}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">RUT Estudiante:</td><td style="padding: 3px 0; font-family: monospace;">${currentRut}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Curso:</td><td style="padding: 3px 0;">${currentCourse}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Fecha de Emisión:</td><td style="padding: 3px 0;">${dateStr}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Autoridad que Notifica:</td><td style="padding: 3px 0;">Coordinación de Ciclo</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Coordinador de Ciclo Resp.:</td><td style="padding: 3px 0;">${coordinatorName}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Apoderado:</td><td style="padding: 3px 0;">${apoderadoName || '__________________________________'}</td></tr>
          </table>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">II. ANTECEDENTES Y FUNDAMENTACIÓN</h3>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            Se informa al apoderado que el estudiante ha incurrido en una Falta Grave de acuerdo con lo estipulado en el Artículo 24 BIS del Reglamento Interno de Convivencia Escolar (RICE) 2026, al alcanzar una acumulación de más de ${negativeAnns.length} anotaciones negativas a la fecha.
          </p>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">III. MEDIDA DISCIPLINARIA APLICADA</h3>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            En coherencia con el carácter formativo de nuestra disciplina y habiendo agotado las instancias pedagógicas previas (Llamado de atención y Amonestación Escrita), se aplica la Medida N° 4: Carta de Compromiso Conductual.
          </p>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            Esta medida busca promover la autorregulación, la reflexión profunda sobre el impacto de las acciones propias y evitar que la conducta escale a faltas muy graves que comprometan la permanencia en el establecimiento.
          </p>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">IV. COMPROMISOS ESPECÍFICOS DEL ESTUDIANTE</h3>
          <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-top: 6px;">
            <p style="margin: 0 0 5px 0;"><strong>1. Respeto Normativo Estricto:</strong><br/>Evitar incurrir en cualquier conducta que amerite una nueva anotación negativa o medida disciplinaria durante la vigencia de este compromiso.</p>
            <p style="margin: 0 0 5px 0;"><strong>2. Relaciones Prosociales y Buen Trato:</strong><br/>Mantener un trato digno, empático y respetuoso con todos los integrantes de la comunidad educativa, eliminando el uso de lenguaje ofensivo o gestos despectivos.</p>
            <p style="margin: 0 0 5px 0;"><strong>3. Responsabilidad Personal:</strong><br/>Asumir un rol activo en la mejora del clima del curso, colaborando en actividades de orientación y consejo de curso.</p>
          </div>
          ${customCommHTML}
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">V. SEGUIMIENTO, MONITOREO Y VIGENCIA</h3>
          <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 5px; color: #334155;">
            <tr><td style="width: 120px; font-weight: bold; padding: 2px 0; vertical-align: top;">• Vigencia:</td><td style="padding: 2px 0; text-align: justify;">Este compromiso se mantendrá durante el transcurso del año escolar vigente.</td></tr>
            <tr><td style="font-weight: bold; padding: 2px 0; vertical-align: top;">• Seguimiento:</td><td style="padding: 2px 0; text-align: justify;">El estudiante mantendrá reuniones periódicas con el Coordinador de Ciclo y su Profesor Jefe para evaluar el avance de sus objetivos.</td></tr>
            <tr><td style="font-weight: bold; padding: 2px 0; vertical-align: top;">• Apoyo Psicosocial:</td><td style="padding: 2px 0; text-align: justify;">Se deriva al estudiante a entrevista con la Psicóloga de Ciclo para identificar factores emocionales subyacentes y fortalecer habilidades socioemocionales cuando corresponda.</td></tr>
            <tr><td style="font-weight: bold; padding: 2px 0; vertical-align: top;">• Incumplimiento:</td><td style="padding: 2px 0; text-align: justify;">El incumplimiento de estos compromisos facultará al establecimiento para escalar las medidas disciplinarias según el Reglamento de Convivencia Escolar vigente.</td></tr>
          </table>
        </div>

        <div style="margin-top: 50px;">
          <p style="font-size: 11px; text-align: center; font-weight: bold; margin-bottom: 40px; color: #1e293b;">SECCIÓN DE FIRMAS</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px; color: #475569;">
            <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 140px; margin: 0 auto;"><strong>Coordinador de Ciclo</strong><br/><span>${coordinatorName}</span></div>
            <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 140px; margin: 0 auto;"><strong>Apoderado</strong><br/><span>Firma / RUT</span></div>
            <div style="border-top: 1px solid #94a3b8; padding-top: 6px; width: 140px; margin: 0 auto;"><strong>Estudiante</strong><br/><span>Firma / RUT</span></div>
          </div>
        </div>
      `;
    }

    if (docType === 'amonestacion') {
      return `
        <div style="text-align: center; margin-bottom: 15px;">
          <img src="${LOGO_BASE64}" style="width: 50px; height: auto; margin: 0 auto 8px auto; display: block;" alt="Escudo Colegio" />
          <h2 style="font-family: 'Georgia', serif; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #1e3a8a; margin: 0 0 2px 0; text-transform: uppercase;">COLEGIO CARMELA ROMERO DE ESPINOSA</h2>
          <p style="font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; color: #475569; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 1px;">MADRES DOMINICAS DE CONCEPCIÓN</p>
          <p style="font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; color: #b45309; margin: 0; text-transform: uppercase;">DIRECCIÓN DE CONVIVENCIA ESCOLAR</p>
          <div style="width: 120px; height: 2px; background-color: #b45309; margin: 8px auto 0 auto;"></div>
        </div>

        <h1 style="font-family: 'Arial', sans-serif; font-size: 12px; font-weight: 800; text-align: center; text-transform: uppercase; color: #0f172a; margin: 20px 0; padding: 6px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; letter-spacing: 0.5px;">
          CARTA DE AMONESTACIÓN AÑO 2026
        </h1>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">I. IDENTIFICACIÓN</h3>
          <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 5px; color: #1e293b;">
            <tr><td style="width: 180px; padding: 3px 0; font-weight: bold;">Estudiante:</td><td style="padding: 3px 0;">${currentName}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Curso:</td><td style="padding: 3px 0;">${currentCourse}</td></tr>
            <tr><td style="font-weight: bold; padding: 3px 0;">Autoridad que Notifica:</td><td style="padding: 3px 0;">${coordinatorName}</td></tr>
          </table>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">II. ANTECEDENTES Y FUNDAMENTACIÓN</h3>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            Se informa al apoderado que el estudiante registra a la fecha una acumulación de <strong>${negativeAnns.length} anotaciones</strong> en su hoja de vida por conductas y/o responsabilidad.
          </p>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            De acuerdo con lo estipulado en el Artículo 24 BIS del Reglamento Interno de Convivencia Escolar (RICE) 2026, al haber alcanzado y superado el umbral de la <em>Primera acumulación (5 anotaciones leves acumuladas)</em>, corresponde aplicar la medida regulada para este tramo.
          </p>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">III. MEDIDA DISCIPLINARIA APLICADA</h3>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            En coherencia con el carácter formativo de nuestra disciplina (Art. 5 y Art. 15), se procede a aplicar la Medida N° 3: Amonestación Escrita Formal (según el Art. 18 y el Art. 24 BIS del RICE 2026).
          </p>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            El propósito es promover la autorregulación inmediata y la reflexión formativa en el estudiante para evitar que su conducta continúe escalando en el registro de observaciones.
          </p>
        </div>

        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">IV. COMPROMISOS ESPECÍFICOS DEL ESTUDIANTE Y APODERADO</h3>
          <p style="font-size: 11px; line-height: 1.5; color: #334155; margin: 6px 0 0 0; text-align: justify;">
            El estudiante, en conjunto con su familia, se compromete formalmente a cumplir con los siguientes objetivos de mejora, los cuales serán monitoreados periódicamente:
          </p>
          <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-top: 8px;">
            <p style="margin: 0 0 6px 0;"><strong>Desarrollo de Actitudes Positivas:</strong> Estimular el esfuerzo personal del alumno para desarrollar conductas constructivas y fortalecer habilidades sociales en beneficio de una sana convivencia escolar.</p>
            <p style="margin: 0 0 6px 0;"><strong>Respeto y Resguardo del Clima Escolar:</strong> Velar activamente por la sana convivencia de la comunidad, evitando de forma estricta participar en juegos, bromas, disturbios o desórdenes que puedan generar daño físico o emocional a terceros.</p>
            <p style="margin: 0 0 6px 0;"><strong>Supervisión Familiar Directa:</strong> El apoderado se compromete a supervisar de forma regular el comportamiento de su pupilo, entregándole directrices claras alineadas con la línea educativa y los valores de nuestro Colegio.</p>
            <p style="margin: 0 0 6px 0;"><strong>Comunicación Activa Casa-Colegio:</strong> El apoderado mantendrá un contacto fluido con la institución, a través de la Profesora Jefe, para informarse oportunamente sobre el desempeño, avances y logros del alumno.</p>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">V. SEGUIMIENTO, MONITOREO Y VIGENCIA</h3>
          <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 5px; color: #334155;">
            <tr><td style="width: 120px; font-weight: bold; padding: 2px 0; vertical-align: top;">• Vigencia:</td><td style="padding: 2px 0; text-align: justify;">Este proceso de acompañamiento y la presente amonestación se mantendrán vigentes durante el transcurso del año escolar 2026.</td></tr>
            <tr><td style="font-weight: bold; padding: 2px 0; vertical-align: top;">• Seguimiento:</td><td style="padding: 2px 0; text-align: justify;">El estudiante será acompañado en su proceso formativo-educativo a través de un seguimiento constante y comunicación directa entre el apoderado, la Profesora Jefe y la Inspectora de Ciclo.</td></tr>
            <tr><td style="font-weight: bold; padding: 2px 0; vertical-align: top;">• Advertencia:</td><td style="padding: 2px 0; text-align: justify;">Se advierte al apoderado que, de continuar acumulando observaciones negativas y alcanzar las diez (10) anotaciones, el Colegio se verá en la necesidad de aplicar la <em>Segunda acumulación</em> contemplada en el Art. 24 BIS, correspondiente a la Medida N° 4: Carta de Compromiso Conductual.</td></tr>
          </table>
        </div>

        <div style="margin-top: 50px;">
          <table style="width: 100%; font-size: 10px; border-collapse: collapse; text-align: center;">
            <thead><tr>
              <th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 33%; font-weight: bold; color: #334155;">FIRMA INSPECTOR/A</th>
              <th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 34%; font-weight: bold; color: #334155;">FIRMA PROFESOR/A JEFE</th>
              <th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 33%; font-weight: bold; color: #334155;">FIRMA APODERADO/A</th>
            </tr></thead>
            <tbody><tr>
              <td style="padding: 40px 6px 6px 6px;"></td>
              <td style="padding: 40px 6px 6px 6px;"></td>
              <td style="padding: 40px 6px 6px 6px;"></td>
            </tr></tbody>
          </table>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse; text-align: center; margin-top: 10px;">
            <thead><tr><th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 100%; font-weight: bold; color: #334155;">FIRMA ESTUDIANTE</th></tr></thead>
            <tbody><tr><td style="padding: 40px 6px 6px 6px;"></td></tr></tbody>
          </table>
        </div>
      `;
    }

    // derivacion
    return `
      <div style="text-align: center; margin-bottom: 15px;">
        <img src="${LOGO_BASE64}" style="width: 50px; height: auto; margin: 0 auto 8px auto; display: block;" alt="Escudo Colegio" />
        <h2 style="font-family: 'Georgia', serif; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #1e3a8a; margin: 0 0 2px 0; text-transform: uppercase;">COLEGIO CARMELA ROMERO DE ESPINOSA</h2>
        <p style="font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; color: #475569; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 1px;">MADRES DOMINICAS DE CONCEPCIÓN</p>
        <p style="font-family: 'Arial', sans-serif; font-size: 9px; font-weight: bold; color: #b45309; margin: 0; text-transform: uppercase;">DIRECCIÓN DE CONVIVENCIA ESCOLAR</p>
        <div style="width: 120px; height: 2px; background-color: #b45309; margin: 8px auto 0 auto;"></div>
      </div>

      <h1 style="font-family: 'Arial', sans-serif; font-size: 12px; font-weight: 800; text-align: center; text-transform: uppercase; color: #0f172a; margin: 20px 0; padding: 6px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; letter-spacing: 0.5px;">
        DERIVACIÓN EQUIPO DE CONVIVENCIA ESCOLAR — AÑO 2026
      </h1>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">I. IDENTIFICACIÓN</h3>
        <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 5px; color: #1e293b;">
          <tr><td style="width: 180px; padding: 3px 0; font-weight: bold;">Estudiante:</td><td style="padding: 3px 0;">${currentName}</td></tr>
          <tr><td style="font-weight: bold; padding: 3px 0;">Curso:</td><td style="padding: 3px 0;">${currentCourse}</td></tr>
          <tr><td style="font-weight: bold; padding: 3px 0;">Autoridad que Notifica:</td><td style="padding: 3px 0;">${coordinatorName}</td></tr>
        </table>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">II. ANTECEDENTES DEL PROCESO FORMATIVO PREVIO</h3>
        <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-top: 6px;">
          <p style="margin: 0 0 6px 0;"><strong>1. Fecha de Suscripción de la Carta de Compromiso:</strong> ____________________</p>
          <p style="margin: 0 0 6px 0;"><strong>2. Objeto del Compromiso Firmado:</strong> Adherencia estricta a las pautas normativas del aula, cese definitivo de conductas disruptivas, respeto a los profesionales de la educación y cumplimiento de la responsabilidad escolar.</p>
          <p style="margin: 0 0 6px 0;"><strong>3. Estado de Cumplimiento actual:</strong> INCUMPLIDO / NO RESPETADO. El o la estudiante no ha modificado su comportamiento a pesar de los compromisos firmados. Muestra una actitud de desinterés y rechazo frente a las normas de la sala de clases y no sigue las indicaciones de apoyo que el colegio le ha entregado para ayudarle a mejorar.</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">III. SUSTENTO NORMATIVO SEGÚN EL RICE 2026</h3>
        <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-top: 6px;">
          <p style="margin: 0 0 6px 0;"><strong>1. Configuración del Carácter de la Falta (Art. 24 BIS):</strong> De acuerdo al Artículo 24 BIS del RICE, acumular de forma constante anotaciones negativas daña la sana convivencia dentro del colegio. Esta situación hace que el comportamiento del estudiante pase a ser una <strong><em>Falta Grave por Acumulación y Desobediencia</em></strong>. Esto permite que la Coordinación de Ciclo y el Equipo de Convivencia Escolar intervenogan de inmediato con un plan de apoyo intensivo y evalúen medidas más estrictas (como la Condicionalidad de la Matrícula).</p>
          <p style="margin: 0 0 6px 0;"><strong>2. Evaluación Longitudinal de la Hoja de Vida (Art. 15.5):</strong> La determinación de las medidas correctivas exige ponderar la receptividad y la trayectoria conductual del menor a lo largo del año académico. En este caso, concurre la circunstancia <strong><em>Agravante de Reiteración Sistemática (Art. 17)</em></strong>, invalidando los compromisos previos debido a su comportamiento posterior en el aula.</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">IV. OBJETIVOS ESPECÍFICOS DE LA DERIVACIÓN ACTUAL</h3>
        <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-top: 6px;">
          <p style="margin: 0 0 6px 0;"><strong>1. Intervención y Soporte Psicosocial Intensivo:</strong> Ejecutar el programa de acompañamiento psicosocial diseñado para estudiantes que presentan resistencia severa al cambio conductual y normativo (Art. 12, Rol del Área de Apoyo).</p>
          <p style="margin: 0 0 6px 0;"><strong>2. Diagnóstico Formativo Interno:</strong> Evaluar si las constantes transgresiones a las reglas de comportamiento responden a dificultades emocionales latentes o a dinámicas de interrelación específicas dentro del grupo curso.</p>
          <p style="margin: 0 0 6px 0;"><strong>3. Preparación de Antecedentes Directivos:</strong> Levantar un informe técnico que sirva de insumo formativo prioritario ante el Consejo de Profesores y la Dirección del establecimiento en caso de requerirse una resolución disciplinaria formal de condicionalidad o no renovación de matrícula.</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a8a;">V. DOCUMENTACIÓN OBLIGATORIA ADJUNTA AL EXPEDIENTE</h3>
        <div style="font-size: 11px; line-height: 1.5; color: #334155; margin-top: 6px;">
          <p style="margin: 0 0 6px 0;">☐  Copia digitalizada de la Carta de Compromiso Institucional firmada por el apoderado, el alumno y la coordinación.</p>
          <p style="margin: 0 0 6px 0;">☐  Reporte digital completo y firmado de la Hoja de Vida del Estudiante (Libro de clases).</p>
          <p style="margin: 0 0 6px 0;">☐  Bitácora de entrevistas previas sostenidas por el Profesor Jefe con el apoderado.</p>
        </div>
      </div>

      ${listHtml}
      ${obsHtml}

      <div style="margin-top: 50px;">
        <table style="width: 100%; font-size: 10px; border-collapse: collapse; text-align: center;">
          <thead><tr>
            <th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 33%; font-weight: bold; color: #334155;">FIRMA COORDINADOR/A</th>
            <th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 34%; font-weight: bold; color: #334155;"></th>
            <th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 33%; font-weight: bold; color: #334155;">FIRMA APODERADO/A</th>
          </tr></thead>
          <tbody><tr>
            <td style="padding: 40px 6px 6px 6px;"></td>
            <td style="padding: 40px 6px 6px 6px;"></td>
            <td style="padding: 40px 6px 6px 6px;"></td>
          </tr></tbody>
        </table>
        <table style="width: 100%; font-size: 10px; border-collapse: collapse; text-align: center; margin-top: 10px;">
          <thead><tr><th style="padding: 6px; border-bottom: 1px solid #94a3b8; width: 100%; font-weight: bold; color: #334155;">FIRMA ESTUDIANTE</th></tr></thead>
          <tbody><tr><td style="padding: 40px 6px 6px 6px;"></td></tr></tbody>
        </table>
      </div>
    `;
  };

  // Export to Word Document (.docx)
  const handleExportToWord = async () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta_de_Amonestacion',
      derivacion: 'Ficha_de_Derivacion',
      compromiso_conductual: 'Carta_de_Compromiso_Conductual_2026',
    };

    try {
      const blob = await buildDocx({
        docType: docType as DocType,
        studentName: currentName,
        course: currentCourse,
        rut: currentRut,
        teacherName: currentTeacher,
        coordinatorName,
        apoderadoName,
        negativeCount: negativeAnns.length,
        observations: docObservations || undefined,
        customCommitments,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titleMap[docType]}_${student.full_name.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating Word document:', err);
      alert('Error al generar el documento Word. Por favor intente nuevamente.');
    }
  };

  // Export to PDF Document
  const handleExportToPDF = async () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta_de_Amonestacion',
      derivacion: 'Ficha_de_Derivacion',
      compromiso_conductual: 'Carta_de_Compromiso_Conductual_2026',
    };

    try {
      const pdfBytes = await buildPdf({
        docType: docType as DocType,
        studentName: currentName,
        course: currentCourse,
        rut: currentRut,
        teacherName: currentTeacher,
        coordinatorName,
        apoderadoName,
        negativeCount: negativeAnns.length,
        observations: docObservations || undefined,
        customCommitments,
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titleMap[docType]}_${student.full_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el documento PDF. Por favor intente nuevamente.');
    }
  };

  // Print via browser (fallback)
  const handlePrintDoc = () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta_de_Amonestacion',
      derivacion: 'Ficha_de_Derivacion',
      compromiso_conductual: 'Carta_de_Compromiso_Conductual_2026',
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes en su navegador para imprimir.');
      return;
    }

    const docContent = getDocHTML();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${titleMap[docType]}_${currentName.replace(/\s+/g, '_')}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              padding: 2rem;
              color: #1e293b;
              background: #ffffff;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-slate-100 py-8">
          <div class="max-w-3xl mx-auto border border-slate-300 p-12 rounded shadow-sm bg-white min-h-[297mm] flex flex-col justify-between">
            <div>${docContent}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Save/Register the commitment in the system log
  const handleRegisterCommitment = async () => {
    if (existingLetter && !authorizedDuplicate) {
      alert(
        `⚠️ ERROR DE DUPLICIDAD: Ya existe una Carta de Compromiso para este estudiante. Marque la casilla "Autorizar Duplicación Excepcional" para volver a emitir.`
      );
      return;
    }

    const config = getSavedConfig();
    const carta: CartaDisciplinaria = {
      id: crypto.randomUUID(),
      student_id: student.id,
      letter_type: docType === 'amonestacion' ? 'Amonestación Escrita' : 'Carta de Compromiso Conductual',
      emission_date: new Date().toISOString().split('T')[0],
      status: compromisoStatus as CartaDisciplinaria['status'],
      emitted_by: emittedBy,
      supervisor_name: docType === 'amonestacion' ? currentTeacher : coordinatorName,
      apoderado_name: apoderadoName,
      annotations_count: negativeAnns.length,
      student_name: student.full_name,
      course: student.course_id,
      regulation_basis: 'Art. 24 BIS, Art. 18, Art. 5, Art. 15 del RICE 2026',
      observations: docObservations,
      created_at: new Date().toISOString(),
    };

    await saveCarta(config, carta);

    const newDoc: CompromisoConductual = {
      id: carta.id,
      studentId: student.id,
      studentName: student.full_name,
      course: student.course_id,
      rut: student.rut || '',
      emittedAt: carta.emission_date,
      emittedBy: emittedBy,
      coordinatorName: coordinatorName,
      negativeCount: negativeAnns.length,
      additionalCommitments: [...customCommitments],
      status: compromisoStatus,
      observations: docObservations,
    };

    const updated = [newDoc, ...emittedList];
    setEmittedList(updated);
    localStorage.setItem('convivencia_local_compromisos', JSON.stringify(updated));
    alert('✅ ÉXITO: El documento ha sido registrado de manera digital y archivado exitosamente.');
  };

  const selectedAnnsObjects = annotations.filter(a => selectedAnnotationsForDoc.includes(a.id));

  return (
    <div className="space-y-6">
      {/* Tab Header & Quick Status Indicators */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Gestión Documental Convivencia Escolar
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Plataforma homologada bajo el Reglamento Interno de Convivencia Escolar (RICE) 2026 del Colegio Carmela Romero
            de Espinosa.
          </p>
        </div>
        <div
          className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-semibold shrink-0 ${
            hasTenOrMore
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {hasTenOrMore
              ? `Reiteración de Faltas (${negativeAnns.length} negativas) • Requiere Compromiso`
              : `Estado Estable (${negativeAnns.length} negativas)`}
          </span>
        </div>
      </div>

      {/* Main Grid: Options vs Realtime Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column Left: Form parameters */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <DocTypeSelector
              docType={docType}
              onDocTypeChange={setDocType}
              currentStep={currentStep}
              hasTenOrMore={hasTenOrMore}
              negativeCount={negativeAnns.length}
            />
            <DocumentWarnings
              docType={docType}
              currentStep={currentStep}
              hasTenOrMore={hasTenOrMore}
              negativeCount={negativeAnns.length}
              isDocLockedByProgress={isDocLockedByProgress}
              bypassProgressLock={bypassProgressLock}
              onBypassProgressLock={setBypassProgressLock}
              authorizedBypass={authorizedBypass}
              onAuthorizedBypass={setAuthorizedBypass}
              existingLetter={existingLetter ? { emittedAt: existingLetter.emittedAt, status: existingLetter.status } : null}
              authorizedDuplicate={authorizedDuplicate}
              onAuthorizedDuplicate={setAuthorizedDuplicate}
            />
          </div>

          <DocumentForm
            docType={docType}
            apoderadoName={apoderadoName}
            onApoderadoNameChange={setApoderadoName}
            coordinatorName={coordinatorName}
            onCoordinatorNameChange={setCoordinatorName}
            emittedBy={emittedBy}
            onEmittedByChange={setEmittedBy}
            compromisoStatus={compromisoStatus}
            onCompromisoStatusChange={setCompromisoStatus}
            docObservations={docObservations}
            onDocObservationsChange={setDocObservations}
            customCommitments={customCommitments}
            newCustomCommitment={newCustomCommitment}
            onNewCustomCommitmentChange={setNewCustomCommitment}
            onAddCustomCommitment={handleAddCustomCommitment}
            onRemoveCustomCommitment={handleRemoveCustomCommitment}
            negativeAnns={negativeAnns}
            selectedAnnotationsForDoc={selectedAnnotationsForDoc}
            onToggleAnnotation={handleToggleAnnotation}
            hasTenOrMore={hasTenOrMore}
            authorizedBypass={authorizedBypass}
            isDocLockedByProgress={isDocLockedByProgress}
            bypassProgressLock={bypassProgressLock}
            onRegisterCommitment={handleRegisterCommitment}
          />
        </div>

        {/* Column Right: Live Paper A4 Preview */}
        <DocumentPreview
          docType={docType}
          currentName={currentName}
          currentRut={currentRut}
          currentCourse={currentCourse}
          currentTeacher={currentTeacher}
          coordinatorName={coordinatorName}
          apoderadoName={apoderadoName}
          dateStr={dateStr}
          negativeCount={negativeAnns.length}
          docObservations={docObservations}
          customCommitments={customCommitments}
          selectedAnnsObjects={selectedAnnsObjects}
          hasTenOrMore={hasTenOrMore}
          onPrint={handlePrintDoc}
          onExportPDF={handleExportToPDF}
          onExportWord={handleExportToWord}
        />
      </div>
    </div>
  );
}
