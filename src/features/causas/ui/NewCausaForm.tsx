/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Scale, AlertCircle, FileText, Loader2, Users } from 'lucide-react';
import type { Course, Student } from '../../../shared/api/services/courses.service';
import type { NewCausaFormValues } from '../../../shared/lib/schemas/newCausaForm';
import type { Causa } from '../../../shared/lib/types';
import RiceConductSelect from '../NewCausaForm/RiceConductSelect';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';

interface NewCausaFormProps {
  form: UseFormReturn<NewCausaFormValues>;
  courses: Course[];
  students: Student[];
  isLoadingCourses: boolean;
  isLoadingStudents: boolean;
  onClose: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCourseChange: (courseId: string) => void;
  onStudentSelect: (studentId: string) => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-1 text-grave-700 text-xs">
      {message}
    </p>
  );
}

export default function NewCausaForm({
  form,
  courses,
  students,
  isLoadingCourses,
  isLoadingStudents,
  onClose,
  onSubmit,
  onCourseChange,
  onStudentSelect,
}: NewCausaFormProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;
  const selectedCourseId = useWatch({ control, name: 'selectedCourseId' }) ?? '';
  const selectedStudentId = useWatch({ control, name: 'selectedStudentId' }) ?? '';
  const newEstRut = useWatch({ control, name: 'newEstRut' }) ?? '';
  const newInfTipo = useWatch({ control, name: 'newInfTipo' });
  const newAulaSegura = useWatch({ control, name: 'newAulaSegura' });
  const newObs = useWatch({ control, name: 'newObs' }) ?? '';
  const manualStudentEntry = !!selectedCourseId && !isLoadingStudents && students.length === 0;
  const basicCourses = courses.filter((course) => course.level === 'BASICA');
  const mediaCourses = courses.filter((course) => course.level === 'MEDIA');

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-neutral-100 border-b pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-lg bg-brand-50 p-2">
            <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold font-sans text-neutral-900 text-sm">Nuevo Expediente</h4>
            <p className="font-medium text-neutral-600 text-xs">Registro de causa de convivencia</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl bg-neutral-50 px-3 py-1.5 font-medium text-neutral-600 text-xs transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          Cerrar
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4 text-left text-neutral-800 text-sm">
        <div>
          <label
            htmlFor="create-course"
            className="block font-semibold text-neutral-500 text-xs uppercase"
          >
            Curso del estudiante
          </label>
          <Select
            id="create-course"
            aria-label="Curso del estudiante"
            invalid={!!errors.selectedCourseId}
            aria-describedby={errors.selectedCourseId ? 'create-course-error' : undefined}
            value={selectedCourseId}
            onChange={(event) => onCourseChange(event.target.value)}
            className="mt-1.5 bg-neutral-50 p-3 font-medium"
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
                    {basicCourses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                        className="font-normal text-neutral-800"
                      >
                        {course.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {mediaCourses.length > 0 && (
                  <optgroup
                    label="Enseñanza Media"
                    className="bg-white font-semibold text-purple-700"
                  >
                    {mediaCourses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                        className="font-normal text-neutral-800"
                      >
                        {course.name}
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
          </Select>
          <FieldError id="create-course-error" message={errors.selectedCourseId?.message} />
        </div>

        <div>
          {selectedCourseId ? (
            <>
              {isLoadingStudents ? (
                <>
                  <p className="block font-semibold text-neutral-500 text-xs uppercase">
                    Estudiante
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-brand-600"
                      aria-hidden="true"
                    />
                    <span className="text-neutral-500 text-xs">Cargando estudiantes...</span>
                  </div>
                </>
              ) : students.length > 0 ? (
                <>
                  <label
                    htmlFor="create-student"
                    className="block font-semibold text-neutral-500 text-xs uppercase"
                  >
                    Estudiante
                  </label>
                  <Select
                    id="create-student"
                    aria-label="Estudiante"
                    value={selectedStudentId}
                    onChange={(event) => onStudentSelect(event.target.value)}
                    className="mt-1.5 bg-neutral-50 p-3 font-medium"
                    invalid={!!errors.newEstNombre}
                    aria-describedby={errors.newEstNombre ? 'create-student-error' : undefined}
                  >
                    <option value="">-- Seleccionar estudiante --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </Select>
                </>
              ) : (
                <>
                  <p className="block font-semibold text-neutral-500 text-xs uppercase">
                    Estudiante
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-grave-200 bg-grave-50 p-2.5">
                    <AlertCircle
                      className="h-3.5 w-3.5 shrink-0 text-grave-600"
                      aria-hidden="true"
                    />
                    <span className="text-grave-700 text-xs">
                      No hay estudiantes en este curso. Ingrese los datos manualmente.
                    </span>
                  </div>
                </>
              )}
              <FieldError id="create-student-error" message={errors.newEstNombre?.message} />
            </>
          ) : (
            <>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                <Users className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
                <span className="text-neutral-600 text-xs">Seleccione un curso primero</span>
              </div>
              <FieldError id="create-student-error" message={errors.newEstNombre?.message} />
            </>
          )}
        </div>

        {manualStudentEntry && (
          <div>
            <label
              htmlFor="create-student-name"
              className="block font-semibold text-neutral-500 text-xs uppercase"
            >
              Nombre del estudiante
            </label>
            <Input
              id="create-student-name"
              aria-label="Nombre del estudiante"
              invalid={!!errors.newEstNombre}
              aria-describedby={errors.newEstNombre ? 'create-student-name-error' : undefined}
              type="text"
              spellCheck
              {...register('newEstNombre')}
              className="mt-1.5 bg-neutral-50 p-3 font-medium"
            />
            <FieldError id="create-student-name-error" message={errors.newEstNombre?.message} />
          </div>
        )}

        <div>
          <label
            htmlFor="create-rut"
            className="block font-semibold text-neutral-500 text-xs uppercase"
          >
            RUN / RUT
          </label>
          <Input
            id="create-rut"
            aria-label="RUN o RUT"
            invalid={!!errors.newEstRut}
            aria-describedby={errors.newEstRut ? 'create-rut-error' : undefined}
            type="text"
            spellCheck={false}
            readOnly={!selectedCourseId || (!!selectedCourseId && students.length > 0)}
            aria-disabled={!selectedCourseId}
            placeholder={
              manualStudentEntry
                ? 'Ingrese RUN manualmente'
                : 'Se auto-completa al seleccionar estudiante'
            }
            {...register('newEstRut')}
            className={
              selectedCourseId && students.length === 0
                ? 'mt-1.5 bg-neutral-50 p-3 font-medium'
                : 'mt-1.5 bg-neutral-100 p-3 font-medium text-neutral-600 text-xs'
            }
          />
          <FieldError id="create-rut-error" message={errors.newEstRut?.message} />
        </div>

        <RiceConductSelect
          setConductaRiceId={(value) =>
            setValue('conductaRiceId', value, { shouldDirty: true, shouldValidate: true })
          }
          setNewInfTipo={(value) =>
            setValue('newInfTipo', value, { shouldDirty: true, shouldValidate: true })
          }
          setNewAulaSegura={(value) =>
            setValue('newAulaSegura', value, { shouldDirty: true, shouldValidate: true })
          }
          setNewObs={(value) =>
            setValue('newObs', value, { shouldDirty: true, shouldValidate: true })
          }
          currentObs={newObs}
        />

        <div className="grid grid-cols-2 gap-3 border-neutral-100 border-b pb-2">
          <div>
            <label
              htmlFor="create-gravedad"
              className="block font-semibold text-neutral-500 text-xs uppercase"
            >
              Gravedad
            </label>
            <Select
              id="create-gravedad"
              aria-label="Gravedad"
              value={newInfTipo}
              onChange={(event) => {
                setValue('newInfTipo', event.target.value as Causa['tipoInfraccion'], {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue('conductaRiceId', '', { shouldDirty: true, shouldValidate: true });
              }}
              className="mt-1.5 bg-neutral-50 p-3 font-medium"
            >
              <option value="Leve">Falta Leve</option>
              <option value="Grave">Falta Grave</option>
              <option value="Muy Grave">Falta Muy Grave</option>
              <option value="Gravísima">Falta Gravísima</option>
            </Select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 font-medium text-neutral-700 transition hover:bg-neutral-100/60">
              <input
                id="create-aula-segura"
                aria-label="Afecta Aula Segura"
                name="create-aula-segura"
                type="checkbox"
                checked={newAulaSegura}
                onChange={(event) =>
                  setValue('newAulaSegura', event.target.checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs">Afecta Aula Segura</span>
            </label>
          </div>
        </div>

        <Controller
          control={control}
          name="newObs"
          render={({ field }) => (
            <div>
              <label htmlFor="create-obs" className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide">
                Relato de los hechos
              </label>
              <textarea
                id="create-obs"
                aria-label="Relato de los hechos"
                placeholder="Relate minuciosamente los hechos ocurridos..."
                value={field.value}
                onChange={field.onChange}
                required
                aria-describedby={errors.newObs ? 'create-obs-error' : undefined}
                aria-invalid={!!errors.newObs}
                rows={3}
                className={
                  errors.newObs
                    ? 'mt-1.5 w-full rounded-xl border border-grave-300 bg-grave-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-grave-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-grave-500/30'
                    : 'mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30'
                }
              />
              <FieldError id="create-obs-error" message={errors.newObs?.message} />
            </div>
          )}
        />

        <div>
          <label
            htmlFor="create-responsable"
            className="block font-semibold text-neutral-500 text-xs uppercase"
          >
            Fiscalizador a cargo
          </label>
          <Input
            id="create-responsable"
            aria-label="Fiscalizador a cargo"
            type="text"
            spellCheck={false}
            invalid={!!errors.newResponsable}
            aria-describedby={errors.newResponsable ? 'create-responsable-error' : undefined}
            {...register('newResponsable')}
            className="mt-1.5 bg-neutral-50 p-3 font-medium"
          />
          <FieldError id="create-responsable-error" message={errors.newResponsable?.message} />
        </div>

        {newInfTipo === 'Gravísima' && newAulaSegura && (
          <div className="rounded-lg border border-gravisima-200 bg-gravisima-50 p-3 font-medium font-sans text-gravisima-700 text-xs leading-normal">
            <strong>Ley Aula Segura activa:</strong> recuerde citar formalmente a la
            Superintendencia en un lapso de 24 horas y resolver en no más de 10 días hábiles de
            suspensión preventiva.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-neutral-100 border-t pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-5 py-2.5 hover:scale-[1.02] active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
            Registrar Expediente
          </Button>
        </div>
        <input type="hidden" value={newEstRut} readOnly aria-hidden="true" />
      </form>
    </div>
  );
}
