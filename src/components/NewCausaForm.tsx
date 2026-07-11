/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scale, AlertCircle, FileText, Loader2, Users } from 'lucide-react';
import type { Course, Student } from '../lib/supabase';
import type { Causa } from '../types';
import RiceConductSelect from './NewCausaForm/RiceConductSelect';
import ImproveTextarea from './ImproveTextarea';

interface NewCausaFormProps {
  newEstNombre: string;
  setNewEstNombre: (v: string) => void;
  newEstRut: string;
  setNewEstRut: (v: string) => void;
  newInfTipo: Causa['tipoInfraccion'];
  setNewInfTipo: (v: Causa['tipoInfraccion']) => void;
  newAulaSegura: boolean;
  setNewAulaSegura: (v: boolean) => void;
  newObs: string;
  setNewObs: (v: string) => void;
  newResponsable: string;
  setNewResponsable: (v: string) => void;
  selectedCourseId: string;
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

export default function NewCausaForm({
  newEstNombre,
  setNewEstNombre,
  newEstRut,
  setNewEstRut,
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
}: NewCausaFormProps) {
  const basicCourses = courses.filter(c => c.level === 'BASICA');
  const mediaCourses = courses.filter(c => c.level === 'MEDIA');

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-50">
            <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-neutral-900">Nuevo Expediente</h4>
            <p className="text-xs text-neutral-400 font-medium">Registro de causa de convivencia</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-700 font-medium transition-all cursor-pointer"
        >
          ✕ Cerrar
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-left text-sm text-neutral-800">
        {/* Course selector */}
        <div>
          <label htmlFor="create-course" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Curso del estudiante
          </label>
          <select
            id="create-course"
            value={selectedCourseId}
            onChange={(e) => onCourseChange(e.target.value)}
                  className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all duration-200"
            required
          >
            <option value="">-- Seleccionar curso --</option>
            {isLoadingCourses ? (
              <option value="" disabled>Cargando cursos...</option>
            ) : (
              <>
                {basicCourses.length > 0 && (
                  <optgroup label="Enseñanza Básica" className="text-blue-700 font-semibold bg-white">
                    {basicCourses.map(c => (
                      <option key={c.id} value={c.id} className="font-normal text-neutral-800">{c.name}</option>
                    ))}
                  </optgroup>
                )}
                {mediaCourses.length > 0 && (
                  <optgroup label="Enseñanza Media" className="text-purple-700 font-semibold bg-white">
                    {mediaCourses.map(c => (
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
          {selectedCourseId ? (
            <>
              <label htmlFor="create-student" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Estudiante
              </label>
              {isLoadingStudents ? (
                <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />
                  <span className="text-xs text-neutral-500">Cargando estudiantes...</span>
                </div>
              ) : students.length > 0 ? (
                <select
                  id="create-student"
                  value={students.find(s => s.full_name === newEstNombre)?.id || ''}
                  onChange={(e) => onStudentSelect(e.target.value)}
            className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all duration-200"
                >
                  <option value="">-- Seleccionar estudiante --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                  <span className="text-xs text-amber-800">No hay estudiantes en este curso</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
              <Users className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
              <span className="text-xs text-neutral-500">Seleccione un curso primero</span>
            </div>
          )}
        </div>

        {/* RUT */}
        <div>
          <label htmlFor="create-rut" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">RUN / RUT:</label>
          <input
            id="create-rut"
            type="text"
            required
            spellCheck={false}
            value={newEstRut}
            onChange={(e) => setNewEstRut(e.target.value)}
            readOnly={!!selectedCourseId && students.length > 0}
            placeholder={selectedCourseId && students.length === 0 ? "Ingrese RUN manualmente (sin estudiantes en el curso)" : "Se auto-completa al seleccionar estudiante"}
            className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-100 font-medium text-neutral-600 focus:outline-none text-xs transition-all duration-200 cursor-not-allowed"
          />
        </div>

        <RiceConductSelect
          setNewInfTipo={setNewInfTipo}
          setNewAulaSegura={setNewAulaSegura}
          setNewObs={setNewObs}
          currentObs={newObs}
        />

        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-neutral-100">
          <div>
            <label htmlFor="create-gravedad" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Gravedad:</label>
            <select
              id="create-gravedad"
              value={newInfTipo}
              onChange={(e) => setNewInfTipo(e.target.value as Causa['tipoInfraccion'])}
              className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all duration-200"
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
                id="create-aula-segura"
                name="create-aula-segura"
                type="checkbox"
                checked={newAulaSegura}
                onChange={(e) => setNewAulaSegura(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4 border-neutral-300"
              />
              <span className="text-xs">Afecta Aula Segura</span>
            </label>
          </div>
        </div>

<ImproveTextarea
          id="create-obs"
          label="Relato de los Hechos:"
          placeholder="Relate minuciosamente los hechos ocurridos..."
          value={newObs}
          onChange={setNewObs}
          required
          className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 leading-relaxed font-sans text-xs transition-all duration-200"
        />

        <div>
          <label htmlFor="create-responsable" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fiscalizador a cargo:</label>
          <input
            id="create-responsable"
            type="text"
            required
            spellCheck={false}
            value={newResponsable}
            onChange={(e) => setNewResponsable(e.target.value)}
            className="w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-100 font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all duration-200"
          />
        </div>

        {newInfTipo === 'Gravísima' && newAulaSegura && (
          <div className="bg-gravisima-50 p-3 rounded-lg border border-gravisima-200 text-xs text-gravisima-800 leading-normal font-sans font-medium">
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
  );
}
