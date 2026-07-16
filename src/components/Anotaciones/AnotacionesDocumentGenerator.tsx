/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Printer, FileDown, FileText, AlertTriangle } from 'lucide-react';
import type { Annotation } from '../../types';
import { getCurrentDateStr, getSemaphoricStyle } from '../../lib/anotacionesUtils';
import { supabase } from '../../lib/supabase';
import DocTypeSelector from './docgen/DocTypeSelector';
import DocumentForm from './docgen/DocumentForm';
import DocumentPreview from './docgen/DocumentPreview';
import DocumentWarnings from './docgen/DocumentWarnings';

interface AnotacionesDocumentGeneratorProps {
  student: {
    id: string;
    full_name: string;
    course_id: string;
    rut?: string;
    teacher_id?: string;
  };
  annotations: Annotation[];
  privacyMode: boolean;
  teachers: Record<string, string>;
}

interface EmittedEntry {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  docType: string;
  emissionDate: string;
  status: string;
  apoderadoName: string;
  student_name?: string;
  emission_date?: string;
}

export default function AnotacionesDocumentGenerator({
  student,
  annotations,
  privacyMode: _privacyMode,
  teachers,
}: AnotacionesDocumentGeneratorProps) {
  // ── Derived data ─────────────────────────────────────────────
  const negativeAnnotations = annotations.filter((a) => a.type === 'Negativa');
  const negativeCount = negativeAnnotations.length;
  const semaphoric = getSemaphoricStyle(negativeCount);

  // ── Document type ────────────────────────────────────────────
  const [docType, setDocType] = useState<'amonestacion' | 'compromiso_conductual' | 'derivacion'>(
    negativeCount >= 10 ? 'compromiso_conductual' : 'amonestacion'
  );

  // ── Form fields ──────────────────────────────────────────────
  const [apoderadoName, setApoderadoName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [emittedBy, setEmittedBy] = useState('');
  const [docObservations, setDocObservations] = useState('');
  const [selectedAnnotationsForDoc, setSelectedAnnotationsForDoc] = useState<string[]>([]);
  const [compromisoStatus, setCompromisoStatus] = useState('Vigente');

  // ── Custom commitments ───────────────────────────────────────
  const [customCommitments, setCustomCommitments] = useState<string[]>([]);
  const newCustomCommitmentRef = useRef('');

  // ── Authorization flags ──────────────────────────────────────
  const [authorizedBypass, setAuthorizedBypass] = useState(false);
  const [authorizedDuplicate, setAuthorizedDuplicate] = useState(false);
  const [bypassProgressLock, setBypassProgressLock] = useState(false);

  // ── Registry state ───────────────────────────────────────────
  const [emittedList, setEmittedList] = useState<EmittedEntry[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  // ── Effects ──────────────────────────────────────────────────
  // Select all negative annotations by default
  useEffect(() => {
    setSelectedAnnotationsForDoc(negativeAnnotations.map((a) => a.id));
  }, [negativeAnnotations]);

  // Sync doc type when annotations count crosses threshold
  useEffect(() => {
    if (negativeCount >= 10 && docType !== 'compromiso_conductual') {
      setDocType('compromiso_conductual');
    } else if (negativeCount < 10 && docType === 'compromiso_conductual') {
      setDocType('amonestacion');
    }
  }, [negativeCount, docType]);

  // Load emitted list from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('convivencia_anotaciones_emitted:v1');
      if (stored) {
        setEmittedList(JSON.parse(stored));
      }
    } catch {
      // Silently ignore corrupt localStorage data
    }
  }, []);

  // ── Helpers ──────────────────────────────────────────────────
  const dateStr = getCurrentDateStr();

  const handleToggleAnnotation = (id: string) => {
    setSelectedAnnotationsForDoc((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddCustomCommitment = () => {
    const trimmed = newCustomCommitmentRef.current.trim();
    if (!trimmed) {
      return;
    }
    setCustomCommitments((prev) => [...prev, trimmed]);
    newCustomCommitmentRef.current = '';
  };

  const handleRemoveCustomCommitment = (index: number) => {
    setCustomCommitments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Register commitment in DB ────────────────────────────────
  const handleRegisterCommitment = async () => {
    setIsRegistering(true);
    try {
      const { error } = await supabase.from('cartas_disciplinarias').insert({
        student_id: student.id,
        letter_type:
          docType === 'amonestacion'
            ? 'Amonestaci\u00f3n Escrita'
            : 'Carta de Compromiso Conductual',
        emission_date: new Date().toISOString().split('T')[0],
        status: compromisoStatus,
        emitted_by: emittedBy || 'Inspector\u00eda',
        supervisor_name: coordinatorName || null,
        apoderado_name: apoderadoName,
        annotations_count: negativeCount,
        student_name: student.full_name,
        course: student.course_id,
        regulation_basis:
          'RICE 2026 - Fundaci\u00f3n Educacional Colegio Carmela Romero de Espinosa',
        observations: docObservations || null,
      });

      if (!error) {
        const newEntry: EmittedEntry = {
          id: crypto.randomUUID(),
          studentId: student.id,
          studentName: student.full_name,
          course: student.course_id,
          docType,
          emissionDate: new Date().toISOString().split('T')[0],
          status: compromisoStatus,
          apoderadoName,
        };
        const updated = [newEntry, ...emittedList];
        setEmittedList(updated);
        localStorage.setItem('convivencia_anotaciones_emitted:v1', JSON.stringify(updated));
        alert('\u2705 Documento registrado exitosamente en cartas_disciplinarias.');
      } else {
        console.error('Error al registrar carta:', error);
        alert(`\u26a0\ufe0f Error al registrar el documento: ${error.message}`);
      }
    } catch (err) {
      console.error('Error en handleRegisterCommitment:', err);
      alert('\u26a0\ufe0f Ocurri\u00f3 un error inesperado. Intente nuevamente.');
    } finally {
      setIsRegistering(false);
    }
  };

  // ── Document export handlers ─────────────────────────────────
  const handleExportWord = async () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta_de_Amonestacion',
      compromiso_conductual: 'Carta_de_Compromiso_Conductual',
      derivacion: 'Ficha_de_Derivacion',
    };

    try {
      const { buildDocx } = await import('../../lib/docx');
      const blob = await buildDocx({
        docType: docType as 'amonestacion' | 'compromiso_conductual' | 'derivacion',
        studentName: student.full_name,
        course: student.course_id,
        studentRut: student.rut || 'N/A',
        teacher: teachers[student.course_id] || student.teacher_id || 'Sin Profesor',
        coordinatorName,
        apoderadoName,
        negativeCount,
        observations: docObservations || '',
        customCommitments,
        dateStr: new Date().toLocaleDateString('es-CL'),
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
      console.error('Error al exportar Word:', err);
      alert('Error al generar el documento Word.');
    }
  };

  const handleExportPDF = async () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta_de_Amonestacion',
      compromiso_conductual: 'Carta_de_Compromiso_Conductual',
      derivacion: 'Ficha_de_Derivacion',
    };

    try {
      const { buildPdf } = await import('../../lib/pdfBuilder');
      const pdfBytes = await buildPdf({
        docType: docType as 'amonestacion' | 'compromiso_conductual' | 'derivacion',
        studentName: student.full_name,
        course: student.course_id,
        studentRut: student.rut || 'N/A',
        teacher: teachers[student.course_id] || student.teacher_id || 'Sin Profesor',
        coordinatorName,
        apoderadoName,
        negativeCount,
        observations: docObservations || '',
        customCommitments,
        dateStr: new Date().toLocaleDateString('es-CL'),
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
      console.error('Error al exportar PDF:', err);
      alert('Error al generar el documento PDF.');
    }
  };

  const handlePrintDoc = () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta de Amonestaci\u00f3n',
      compromiso_conductual: 'Carta de Compromiso Conductual',
      derivacion: 'Ficha de Derivaci\u00f3n',
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes en su navegador para imprimir.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${titleMap[docType]} - ${student.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; color: #1e293b; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div style="max-width: 210mm; margin: 0 auto;">
            <h2 style="text-align: center;">${titleMap[docType]}</h2>
            <p><strong>Estudiante:</strong> ${student.full_name}</p>
            <p><strong>Curso:</strong> ${student.course_id}</p>
            <p><strong>Fecha:</strong> ${dateStr}</p>
            <p><strong>Apoderado:</strong> ${apoderadoName || '________________'}</p>
            <hr />
            <p><strong>Anotaciones consideradas:</strong> ${negativeCount}</p>
            <hr />
            <p>${docObservations || 'Sin observaciones adicionales.'}</p>
          </div>
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ── Selected annotations for preview ─────────────────────────
  const selectedIdsSet = useMemo(
    () => new Set(selectedAnnotationsForDoc),
    [selectedAnnotationsForDoc]
  );
  const selectedAnnsObjects = annotations.filter((a) => selectedIdsSet.has(a.id));

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <FileText className="h-5 w-5 text-indigo-600" />
            Generaci\u00f3n de Documentos Disciplinarios
          </h3>
          <p className="mt-1 text-neutral-500 text-xs">
            Emisi\u00f3n de cartas de amonestaci\u00f3n, compromiso conductual y derivaci\u00f3n.
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 font-semibold text-xs ${semaphoric.badge}`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {negativeCount >= 10
              ? `Reiteraci\u00f3n de faltas (${negativeCount} negativas)`
              : `Estado: ${negativeCount} anotaciones negativas`}
          </span>
        </div>
      </div>

      {/* Main grid: Left form / Right preview */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-5">
          {/* Document type selector */}
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <DocTypeSelector
              docType={docType}
              onDocTypeChange={(type: string) =>
                setDocType(type as 'amonestacion' | 'compromiso_conductual' | 'derivacion')
              }
              hasTenOrMore={negativeCount >= 10}
              negativeCount={negativeCount}
            />

            <DocumentWarnings
              docType={docType}
              negativeCount={negativeCount}
              hasTenOrMore={negativeCount >= 10}
              authorizedBypass={authorizedBypass}
              onAuthorizedBypass={() => setAuthorizedBypass((v) => !v)}
              authorizedDuplicate={authorizedDuplicate}
              onAuthorizedDuplicate={() => setAuthorizedDuplicate((v) => !v)}
              isDocLockedByProgress={false}
              existingLetter={null}
              bypassProgressLock={bypassProgressLock}
              onBypassProgressLock={() => setBypassProgressLock((v) => !v)}
            />
          </div>

          {/* Document form */}
          <DocumentForm
            docType={docType}
            apoderadoName={apoderadoName}
            onApoderadoNameChange={setApoderadoName}
            coordinatorName={coordinatorName}
            onCoordinatorNameChange={setCoordinatorName}
            emittedBy={emittedBy}
            onEmittedByChange={setEmittedBy}
            docObservations={docObservations}
            onObservationsChange={setDocObservations}
            selectedAnnotationsForDoc={selectedAnnotationsForDoc}
            onToggleAnnotation={handleToggleAnnotation}
            compromisoStatus={compromisoStatus}
            onCompromisoStatusChange={setCompromisoStatus}
            customCommitments={customCommitments}
            onAddCommitment={handleAddCustomCommitment}
            onRemoveCommitment={handleRemoveCustomCommitment}
            negativeCount={negativeCount}
            annotations={annotations}
            onRegisterCommitment={handleRegisterCommitment}
            isRegistering={isRegistering}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-7">
          {/* Document preview */}
          <DocumentPreview
            docType={docType}
            currentName={student.full_name}
            currentCourse={student.course_id}
            currentRut={student.rut || ''}
            currentTeacher={teachers[student.course_id] || student.teacher_id || 'Sin Profesor'}
            coordinatorName={coordinatorName}
            apoderadoName={apoderadoName}
            dateStr={dateStr}
            negativeCount={negativeCount}
            docObservations={docObservations}
            customCommitments={customCommitments}
            selectedAnnsObjects={selectedAnnsObjects}
            hasTenOrMore={negativeCount >= 10}
            onPrint={handlePrintDoc}
            onExportPDF={handleExportPDF}
            onExportWord={handleExportWord}
          />

          {/* Action buttons */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
            <p className="mb-3 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
              Acciones del Documento
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrintDoc}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-neutral-800"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-red-700"
              >
                <FileDown className="h-4 w-4" />
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-blue-700"
              >
                <FileDown className="h-4 w-4" />
                Descargar Word
              </button>
            </div>
          </div>

          {/* Recently emitted */}
          {emittedList.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
              <h4 className="mb-3 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
                \u00daltimos documentos emitidos
              </h4>
              <ul className="space-y-2">
                {emittedList.slice(0, 5).map((entry, i) => (
                  <li
                    key={entry.id || i}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700 text-xs"
                  >
                    <span className="truncate font-medium">
                      {entry.studentName || entry.student_name}
                    </span>
                    <span className="ml-2 shrink-0 text-neutral-400">
                      {entry.emissionDate || entry.emission_date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
