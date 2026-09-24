/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { Controller, useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Scale, AlertCircle, FileText, Loader2, Users } from "lucide-react";
import { getMaxPlazoInvestigacionDias } from "../../../shared/lib/legalCompliance/constants";
import type {
  Course,
  Student,
} from "../../../shared/api/services/courses.service";
import type { NewCausaFormValues } from "../../../shared/lib/schemas/newCausaForm";
import type { Causa } from "../../../shared/lib/types";
import RiceConductSelect from "../NewCausaForm/RiceConductSelect";
import Button from "../../../shared/ui/Button";
import FormField from "../../../shared/ui/FormField";
import Input from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { getStudentState } from "./newCausaFormState";

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
  const selectedCourseId =
    useWatch({ control, name: "selectedCourseId" }) ?? "";
  const selectedStudentId =
    useWatch({ control, name: "selectedStudentId" }) ?? "";
  const newInfTipo = useWatch({ control, name: "newInfTipo" });
  const newAulaSegura = useWatch({ control, name: "newAulaSegura" });
  const newObs = useWatch({ control, name: "newObs" }) ?? "";
  const studentState = getStudentState(
    selectedCourseId,
    isLoadingStudents,
    students.length,
  );
  const manualStudentEntry = studentState === "no-students";
  // Editable solo en ingreso manual (conserva la lógica anterior).
  const isRutEditable = manualStudentEntry;
  const basicCourses = courses.filter((course) => course.level === "BASICA");
  const mediaCourses = courses.filter((course) => course.level === "MEDIA");

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-neutral-100 border-b pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-lg bg-brand-50 p-2">
            <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold font-sans text-neutral-900 text-sm">
              Nuevo Expediente
            </h4>
            <p className="font-medium text-neutral-600 text-xs">
              Registro de causa de convivencia
            </p>
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

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-4 text-left text-neutral-800 text-sm"
      >
        <FormField
          label="Curso del estudiante"
          htmlFor="create-course"
          error={errors.selectedCourseId?.message}
        >
          <Select
            id="create-course"
            aria-label="Curso del estudiante"
            invalid={!!errors.selectedCourseId}
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
                    className="bg-white font-semibold text-neutral-700"
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
                    className="bg-white font-semibold text-brand-700"
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
        </FormField>

        <FormField
          label="Estudiante"
          htmlFor={
            studentState === "has-students" ? "create-student" : undefined
          }
          error={errors.newEstNombre?.message}
        >
          {studentState === "loading" && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-brand-600"
                aria-hidden="true"
              />
              <span className="text-neutral-500 text-xs">
                Cargando estudiantes...
              </span>
            </div>
          )}
          {studentState === "has-students" && (
            <Select
              id="create-student"
              aria-label="Estudiante"
              value={selectedStudentId}
              onChange={(event) => onStudentSelect(event.target.value)}
              className="mt-1.5 bg-neutral-50 p-3 font-medium"
              invalid={!!errors.newEstNombre}
            >
              <option value="">-- Seleccionar estudiante --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          )}
          {studentState === "no-students" && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-grave-200 bg-grave-50 p-2.5">
              <AlertCircle
                className="h-3.5 w-3.5 shrink-0 text-grave-600"
                aria-hidden="true"
              />
              <span className="text-grave-700 text-xs">
                No hay estudiantes en este curso. Ingrese los datos manualmente.
              </span>
            </div>
          )}
          {studentState === "no-course" && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
              <Users
                className="h-3.5 w-3.5 shrink-0 text-neutral-500"
                aria-hidden="true"
              />
              <span className="text-neutral-600 text-xs">
                Seleccione un curso primero
              </span>
            </div>
          )}
        </FormField>

        {manualStudentEntry && (
          <FormField
            label="Nombre del estudiante"
            htmlFor="create-student-name"
            error={errors.newEstNombre?.message}
          >
            <Input
              id="create-student-name"
              aria-label="Nombre del estudiante"
              invalid={!!errors.newEstNombre}
              type="text"
              spellCheck
              {...register("newEstNombre")}
              className="mt-1.5 bg-neutral-50 p-3 font-medium"
            />
          </FormField>
        )}

        <FormField
          label="RUN / RUT"
          htmlFor="create-rut"
          error={errors.newEstRut?.message}
        >
          <Input
            id="create-rut"
            aria-label="RUN o RUT"
            invalid={!!errors.newEstRut}
            type="text"
            spellCheck={false}
            readOnly={!isRutEditable}
            aria-disabled={!selectedCourseId}
            placeholder={
              manualStudentEntry
                ? "Ingrese RUN manualmente"
                : "Se auto-completa al seleccionar estudiante"
            }
            {...register("newEstRut")}
            className={
              selectedCourseId && students.length === 0
                ? "mt-1.5 bg-neutral-50 p-3 font-medium"
                : "mt-1.5 bg-neutral-100 p-3 font-medium text-neutral-600 text-xs"
            }
          />
        </FormField>

        <RiceConductSelect
          setConductaRiceId={(value) =>
            setValue("conductaRiceId", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          setNewInfTipo={(value) =>
            setValue("newInfTipo", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          setNewAulaSegura={(value) =>
            setValue("newAulaSegura", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          setNewObs={(value) =>
            setValue("newObs", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          currentObs={newObs}
        />

        <div className="border-b border-neutral-100 pb-2">
          <p className="text-xs text-neutral-500 leading-relaxed">
            La gravedad, la conducta RICE y el Aula Segura se derivan
            automáticamente al seleccionar una falta del reglamento en el
            control superior.
          </p>
        </div>

        <Controller
          control={control}
          name="newObs"
          render={({ field }) => (
            <FormField
              label="Relato de los hechos"
              htmlFor="create-obs"
              error={errors.newObs?.message}
            >
              <textarea
                id="create-obs"
                aria-label="Relato de los hechos"
                placeholder="Relate minuciosamente los hechos ocurridos..."
                value={field.value}
                onChange={field.onChange}
                required
                aria-invalid={!!errors.newObs}
                rows={3}
                className={
                  errors.newObs
                    ? "mt-1.5 w-full rounded-xl border border-grave-300 bg-grave-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-grave-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-grave-500/30"
                    : "mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                }
              />
            </FormField>
          )}
        />

        <FormField
          label="Fiscalizador a cargo"
          htmlFor="create-responsable"
          error={errors.newResponsable?.message}
        >
          <Input
            id="create-responsable"
            aria-label="Fiscalizador a cargo"
            type="text"
            spellCheck={false}
            invalid={!!errors.newResponsable}
            {...register("newResponsable")}
            className="mt-1.5 bg-neutral-50 p-3 font-medium"
          />
        </FormField>

        <div className="rounded-lg border border-gravisima-200 bg-gravisima-50 p-3 font-medium font-sans text-gravisima-700 text-xs leading-normal">
          <strong>Plazo de indagación:</strong> según Ley 21809, el plazo máximo
          es de{" "}
          {getMaxPlazoInvestigacionDias(
            newInfTipo as Causa["tipoInfraccion"],
            newAulaSegura,
          )}{" "}
          días hábiles. Se reduce a 10 días hábiles en casos de alta complejidad
          (Aula Segura o faltas Muy Grave/Gravísima).
        </div>

        <div className="sticky bottom-0 -mx-4 border-neutral-100 border-t bg-white/95 px-4 pt-2 pb-1 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-end gap-2 pt-1">
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
        </div>
      </form>
    </div>
  );
}
