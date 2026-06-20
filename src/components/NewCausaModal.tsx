/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scale, BookOpen, AlertCircle, FileText, Loader2, Users } from 'lucide-react';
import type { Course, Student } from '../lib/supabase';
import type { Causa } from '../types';
import { REGLAMENTO_CONDUCTAS } from '../reglamentoData';

interface NewCausaModalProps {
  // Form field values
  newEstNombre: string;
  setNewEstNombre: (v: string) => void;
  newEstRut: string;
  setNewEstRut: (v: string) => void;
  newEstCurso: string;
  newInfTipo: Causa['tipoInfraccion'];
  setNewInfTipo: (v: Causa['tipoInfraccion']) => void;
  newAulaSegura: boolean;
  setNewAulaSegura: (v: boolean) => void;
  newObs: string;
  setNewObs: (v: string) => void;
  newResponsable: string;
  setNewResponsable: (v: string) => void;
  selectedCourseId: string;

  // Data
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;

  // Callbacks
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function NewCausaModal({
  newEstNombre,
  setNewEstNombre,
  newEstRut,
  setNewEstRut,
  newEstCurso: _newEstCurso,
  newInfTipo,
  setNewInfTipo,
  newAulaSegura,
  setNewAulaSegura,
  newObs,
  setNewObs,
  newResponsable,
  setNewResponsable,
  selectedCourseId,
  courses,
  students,
  isLoadingCourses,
  isLoadingStudents,
  onClose,
  onSubmit,
  onCourseChange,
  onStudentSelect,
}: NewCausaModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-scale-in">
        <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-secondary-500" aria-hidden="true" />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brand-50">
                <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
              </div>
              <div>
                <h4 id="modal-title" className="font-sans font-bold text-sm text-neutral-900">Nuevo Expediente</h4>
                <p className="text-[11px] text-neutral-400 font-medium">Registro de causa de convivencia</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-700 font-medium transition-all cursor-pointer"
            >
              ✕ Cerrar
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-left text-sm text-neutral-800">
            {/* Course selector */}
            <div>
              <label htmlFor="create-course" className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.06em]">
                Curso del estudiante
              </label>
              <select
                id="create-course"
                value={selectedCourseId}
                onChange={(e) => onCourseChange(e.target.value)}
                className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all"
                required
              >
                <option value="">-- Seleccionar curso --</option>
                {isLoadingCourses ? (
                  <option value="" disabled>Cargando cursos...</option>
                ) : (
                  <>
                    {courses.filter(c => c.level === 'BASICA').length > 0 && (
                      <optgroup label="Enseñanza Básica" className="text-blue-700 font-semibold bg-white">
                        {courses.filter(c => c.level === 'BASICA').map(c => (
                          <option key={c.id} value={c.id} className="font-normal text-neutral-800">{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {courses.filter(c => c.level === 'MEDIA').length > 0 && (
                      <optgroup label="Enseñanza Media" className="text-purple-700 font-semibold bg-white">
                        {courses.filter(c => c.level === 'MEDIA').map(c => (
                          <option key={c.id} value={c.id} className="font-normal text-neutral-800">{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {courses.length === 0 && (
                      <option value="" disabled>No hay cursos disponibles</option>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* Student selector */}
            <div>
              <label htmlFor="create-student" className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.06em]">
                Estudiante
              </label>
              {selectedCourseId ? (
                <>
                  {isLoadingStudents ? (
                    <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />
                      <span className="text-[11px] text-neutral-500">Cargando estudiantes...</span>
                    </div>
                  ) : students.length > 0 ? (
                    <select
                      id="create-student"
                      value={students.find(s => s.full_name === newEstNombre)?.id || ''}
                      onChange={(e) => onStudentSelect(e.target.value)}
                      className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all"
                    >
                      <option value="">-- Seleccionar estudiante --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                      <span className="text-[11px] text-amber-800">No hay estudiantes en este curso</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <Users className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
                  <span className="text-[11px] text-neutral-500">Seleccione un curso primero</span>
                </div>
              )}
            </div>

            {/* RUT */}
            <div>
              <label htmlFor="create-rut" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">RUN / RUT:</label>
              <input
                id="create-rut"
                type="text"
                required
                value={newEstRut}
                readOnly={!!selectedCourseId}
                placeholder="Se auto-completa al seleccionar estudiante"
                className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-100 font-medium text-neutral-600 focus:outline-none text-xs transition-all cursor-not-allowed"
              />
            </div>

            {/* RICE Autocomplete */}
            <div>
              <label htmlFor="create-rice" className="block text-[9px] font-semibold text-brand-700 uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen className="h-3 w-3 text-brand-600" aria-hidden="true" />
                Autocompletar desde Reglamento (RICE):
              </label>
              <select
                id="create-rice"
                onChange={(e) => {
                  const conductId = e.target.value;
                  const matched = REGLAMENTO_CONDUCTAS.find(c => c.id === conductId);
                  if (matched) {
                    setNewInfTipo(matched.gravedad);
                    setNewAulaSegura(matched.gravedad === 'Gravísima');
                    setNewObs(`Falta ${matched.gravedad} según el Reglamento del Colegio Carmela Romero. Artículo/Sección: ${matched.articulo} N° ${matched.numero}. Conducta: ${matched.conducta}\n\n[Medidas Formativas del RICE]:\n${matched.medidasFormativas.map(m => ` - ${m}`).join('\n')}\n\n[Medidas Disciplinarias del RICE]:\n${matched.medidasDisciplinarias.map(m => ` - ${m}`).join('\n')}`);
                  }
                }}
                className="w-full mt-1.5 border border-brand-200 rounded-lg p-2.5 bg-brand-50/20 text-[11px] font-medium text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                defaultValue=""
              >
                <option value="" className="text-neutral-500">-- Seleccionar conducta --</option>
                <optgroup label="Faltas Leves (Art. 24)" className="text-blue-900 bg-white font-semibold">
                  {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Leve').map(c => (
                    <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                      Leve N° {c.numero}: {c.conducta.slice(0, 65)}...
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Faltas Graves (Art. 25)" className="text-amber-800 bg-white font-semibold">
                  {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Grave').map(c => (
                    <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                      Grave N° {c.numero}: {c.conducta.slice(0, 65)}...
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Faltas Muy Graves (Art. 26)" className="text-purple-800 bg-white font-semibold">
                  {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Muy Grave').map(c => (
                    <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                      Muy Grave N° {c.numero}: {c.conducta.slice(0, 65)}...
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Faltas Gravísimas (Aula Segura - Art. 27)" className="text-red-800 bg-white font-semibold">
                  {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Gravísima').map(c => (
                    <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                      Gravísima N° {c.numero}: {c.conducta.slice(0, 65)}...
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-neutral-100">
              <div>
                <label htmlFor="create-gravedad" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">Gravedad:</label>
                <select
                  id="create-gravedad"
                  value={newInfTipo}
                  onChange={(e) => setNewInfTipo(e.target.value as Causa['tipoInfraccion'])}
                  className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="Leve">Falta Leve</option>
                  <option value="Grave">Falta Grave</option>
                  <option value="Muy Grave">Falta Muy Grave</option>
                  <option value="Gravísima">Falta Gravísima</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 cursor-pointer font-medium text-neutral-700 transition hover:bg-neutral-100/60">
                  <input
                    type="checkbox"
                    checked={newAulaSegura}
                    onChange={(e) => setNewAulaSegura(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4 border-neutral-300"
                  />
                  <span className="text-[10px]">Afecta Aula Segura</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="create-obs" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">Relato de los Hechos:</label>
              <textarea
                id="create-obs"
                rows={3}
                required
                placeholder="Relate minuciosamente los hechos ocurridos..."
                value={newObs}
                onChange={(e) => setNewObs(e.target.value)}
                className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 leading-relaxed font-sans text-xs transition-all"
              />
            </div>

            <div>
              <label htmlFor="create-responsable" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">Fiscalizador a cargo:</label>
              <input
                id="create-responsable"
                type="text"
                required
                value={newResponsable}
                onChange={(e) => setNewResponsable(e.target.value)}
                className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-100 font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            {newInfTipo === 'Gravísima' && newAulaSegura && (
              <div className="bg-gravisima-50 p-3 rounded-lg border border-gravisima-200 text-[11px] text-gravisima-800 leading-normal font-sans font-medium">
                ⚠️ <strong>Ley Aula Segura activa:</strong> Recuerde citar formalmente a la Superintendencia en un lapso de 24 horas y resolver en no más de 10 días hábiles de suspensión preventiva.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-500 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-700 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm shadow-brand-600/20"
              >
                <FileText className="h-4 w-4" aria-hidden="true" /> Registrar Expediente
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
