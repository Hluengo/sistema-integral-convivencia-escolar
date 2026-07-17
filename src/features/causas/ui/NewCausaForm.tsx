/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Scale, AlertCircle, FileText, Loader2, Users } from 'lucide-react';
import type { Course, Student } from '../../../services/courses.service';
import type { Causa } from '../../../types';
import RiceConductSelect from '../NewCausaForm/RiceConductSelect';
import ImproveTextarea from '../../../components/ImproveTextarea';

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
  setNewEstNombre: _setNewEstNombre,
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
  const basicCourses = courses.filter((c) => c.level === 'BASICA');
  const mediaCourses = courses.filter((c) => c.level === 'MEDIA');

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-neutral-100 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-brand-50 p-2">
            <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h4 className="font-bold font-sans text-neutral-900 text-sm">Nuevo Expediente</h4>
            <p className="font-medium text-neutral-400 text-xs">Registro de causa de convivencia</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl bg-neutral-50 px-3 py-1.5 font-medium text-neutral-500 text-xs transition-all hover:bg-neutral-100 hover:text-neutral-700"
        >
          ✕ Cerrar
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-left text-neutral-800 text-sm">
        {/* Course selector */}
        <div>
          <label
            htmlFor="create-course"
            className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
          >
            Curso del estudiante
          </label>
          <select
            id="create-course"
            value={selectedCourseId}
            onChange={(e) => onCourseChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium text-neutral-700 transition-all duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            required
          >
            <option value="">-- Seleccionar curso --</option>
            {isLoadingCourses ? (
              <option value="" disabled>
                Cargando cursos...
              </option>
            ) : (
              <>
                {basicCourses.length > 0 && (
                  <optgroup
                    label="Enseñanza Básica"
                    className="bg-white font-semibold text-blue-700"
                  >
                    {basicCourses.map((c) => (
                      <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {mediaCourses.length > 0 && (
                  <optgroup
                    label="Enseñanza Media"
                    className="bg-white font-semibold text-purple-700"
                  >
                    {mediaCourses.map((c) => (
                      <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {courses.length === 0 && (
                  <option value="" disabled>
                    No hay cursos disponibles
                  </option>
                )}
              </>
            )}
          </select>
        </div>

        {/* Student selector */}
        <div>
          {selectedCourseId ? (
            <>
              <label
                htmlFor="create-student"
                className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
              >
                Estudiante
              </label>
              {isLoadingStudents ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />
                  <span className="text-neutral-500 text-xs">Cargando estudiantes...</span>
                </div>
              ) : students.length > 0 ? (
                <select
                  id="create-student"
                  value={students.find((s) => s.full_name === newEstNombre)?.id || ''}
                  onChange={(e) => onStudentSelect(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium text-neutral-700 transition-all duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">-- Seleccionar estudiante --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span className="text-amber-800 text-xs">No hay estudiantes en este curso</span>
                </div>
              )}
            </>
          ) : (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
              <Users className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
              <span className="text-neutral-500 text-xs">Seleccione un curso primero</span>
            </div>
          )}
        </div>

        {/* RUT */}
        <div>
          <label
            htmlFor="create-rut"
            className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
          >
            RUN / RUT:
          </label>
          <input
            id="create-rut"
            type="text"
            required
            spellCheck={false}
            value={newEstRut}
            onChange={(e) => setNewEstRut(e.target.value)}
            readOnly={!!selectedCourseId && students.length > 0}
            placeholder={
              selectedCourseId && students.length === 0
                ? 'Ingrese RUN manualmente (sin estudiantes en el curso)'
                : 'Se auto-completa al seleccionar estudiante'
            }
            className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 p-3 font-medium text-neutral-600 text-xs transition-all duration-200 focus:outline-none"
          />
        </div>

        <RiceConductSelect
          setNewInfTipo={setNewInfTipo}
          setNewAulaSegura={setNewAulaSegura}
          setNewObs={setNewObs}
          currentObs={newObs}
        />

        <div className="grid grid-cols-2 gap-3 border-neutral-100 border-b pb-2">
          <div>
            <label
              htmlFor="create-gravedad"
              className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
            >
              Gravedad:
            </label>
            <select
              id="create-gravedad"
              value={newInfTipo}
              onChange={(e) => setNewInfTipo(e.target.value as Causa['tipoInfraccion'])}
              className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium text-neutral-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="Leve">Falta Leve</option>
              <option value="Grave">Falta Grave</option>
              <option value="Muy Grave">Falta Muy Grave</option>
              <option value="Gravísima">Falta Gravísima</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 font-medium text-neutral-700 transition hover:bg-neutral-100/60">
              <input
                id="create-aula-segura"
                name="create-aula-segura"
                type="checkbox"
                checked={newAulaSegura}
                onChange={(e) => setNewAulaSegura(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
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
          className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-sans text-xs leading-relaxed transition-all duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />

        <div>
          <label
            htmlFor="create-responsable"
            className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
          >
            Fiscalizador a cargo:
          </label>
          <input
            id="create-responsable"
            type="text"
            required
            spellCheck={false}
            value={newResponsable}
            onChange={(e) => setNewResponsable(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-100 p-3 font-bold text-neutral-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {newInfTipo === 'Gravísima' && newAulaSegura && (
          <div className="rounded-lg border border-gravisima-200 bg-gravisima-50 p-3 font-medium font-sans text-gravisima-800 text-xs leading-normal">
            ⚠️ <strong>Ley Aula Segura activa:</strong> Recuerde citar formalmente a la
            Superintendencia en un lapso de 24 horas y resolver en no más de 10 días hábiles de
            suspensión preventiva.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-neutral-100 border-t pt-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-3 py-1.5 font-medium text-neutral-500 transition-all hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-brand-600/20 shadow-sm transition-all hover:scale-[1.02] hover:bg-brand-700 active:scale-95"
          >
            <FileText className="h-4 w-4" aria-hidden="true" /> Registrar Expediente
          </button>
        </div>
      </form>
    </div>
  );
}
