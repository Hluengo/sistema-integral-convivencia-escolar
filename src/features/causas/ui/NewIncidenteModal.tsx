/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, type FormEvent } from "react";
import { AlertTriangle, Users } from "lucide-react";
import type { TipoInfraccion } from "../../../shared/lib/types";
import RiceConductSelect from "../NewCausaForm/RiceConductSelect";
import type {
  Course,
  Student,
} from "../../../shared/api/services/courses.service";
import type { CreateIncidenteInput } from "../../../shared/api/services/incidentes.service";
import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../shared/ui/Dialog";

interface NewIncidenteModalProps {
  courses: Course[];
  students: Student[];
  selectedCourseId: string;
  isLoadingStudents: boolean;
  onCourseChange: (courseId: string) => void;
  onClose: () => void;
  onSubmit: (
    input: CreateIncidenteInput & {
      studentIds: string[];
      conductaRiceId: string;
      tipoInfraccion: TipoInfraccion;
      comprometeAulaSegura: boolean;
    },
  ) => Promise<void>;
}

export default function NewIncidenteModal({
  courses,
  students,
  selectedCourseId,
  isLoadingStudents,
  onCourseChange,
  onClose,
  onSubmit,
}: NewIncidenteModalProps) {
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [fechaHora, setFechaHora] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [responsable, setResponsable] = useState(
    "Equipo de Convivencia Escolar",
  );
  const [conductaRiceId, setConductaRiceId] = useState("");
  const [tipoInfraccion, setTipoInfraccion] = useState<TipoInfraccion>("Grave");
  const [aulaSegura, setAulaSegura] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (studentIds.length < 2) {
      setError(
        "Seleccione al menos dos estudiantes para crear un incidente grupal.",
      );
      return;
    }
    if (descripcion.trim().length < 10) {
      setError("Describa los hechos con al menos 10 caracteres.");
      return;
    }
    if (!responsable.trim()) {
      setError("Ingrese el responsable del incidente.");
      return;
    }
    if (!conductaRiceId) {
      setError(
        "Seleccione la falta del reglamento (RICE) para determinar la gravedad de cada expediente.",
      );
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({
        fechaHora: new Date(fechaHora).toISOString(),
        lugar,
        descripcion,
        responsable,
        studentIds,
        conductaRiceId,
        tipoInfraccion,
        comprometeAulaSegura: aulaSegura,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible crear el incidente.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-1rem)] max-w-[48rem] overflow-y-auto p-6 sm:p-8 sm:max-h-[90vh]">
        <div className="space-y-5">
          <div className="border-neutral-100 border-b pb-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Users className="size-5 text-brand-600" aria-hidden="true" />{" "}
                Nuevo incidente grupal
              </DialogTitle>
              <DialogDescription className="mt-1">
                Crea un hecho común y un expediente independiente por cada
                estudiante.
              </DialogDescription>
            </div>
          </div>

          <form
            id="group-incident-form"
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="group-course"
                className="block font-semibold text-neutral-600 text-xs uppercase"
              >
                Curso
              </label>
              <Select
                id="group-course"
                value={selectedCourseId}
                onChange={(event) => {
                  setStudentIds([]);
                  onCourseChange(event.target.value);
                }}
                className="mt-1.5"
              >
                <option value="">-- Seleccionar curso --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="group-students"
                className="block font-semibold text-neutral-600 text-xs uppercase"
              >
                Estudiantes involucrados
              </label>
              <select
                id="group-students"
                multiple
                size={Math.min(Math.max(students.length, 3), 8)}
                value={studentIds}
                disabled={!selectedCourseId || isLoadingStudents}
                onChange={(event) =>
                  setStudentIds(
                    Array.from(
                      event.target.selectedOptions,
                      (option) => option.value,
                    ),
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm text-neutral-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-neutral-100"
                aria-describedby="group-students-help"
              >
                {isLoadingStudents ? (
                  <option disabled>Cargando estudiantes...</option>
                ) : (
                  students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} · {student.rut}
                    </option>
                  ))
                )}
              </select>
              <p
                id="group-students-help"
                className="mt-1 text-10px text-neutral-500"
              >
                Mantenga Ctrl o Cmd para seleccionar varios estudiantes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="group-date" className="space-y-1.5">
                <span className="block font-semibold text-neutral-600 text-xs uppercase">
                  Fecha y hora
                </span>
                <Input
                  id="group-date"
                  type="datetime-local"
                  value={fechaHora}
                  onChange={(event) => setFechaHora(event.target.value)}
                />
              </label>
              <label htmlFor="group-place" className="space-y-1.5">
                <span className="block font-semibold text-neutral-600 text-xs uppercase">
                  Lugar
                </span>
                <Input
                  id="group-place"
                  value={lugar}
                  onChange={(event) => setLugar(event.target.value)}
                  placeholder="Ej. Patio"
                />
              </label>
              <label htmlFor="group-owner" className="space-y-1.5">
                <span className="block font-semibold text-neutral-600 text-xs uppercase">
                  Responsable
                </span>
                <Input
                  id="group-owner"
                  value={responsable}
                  onChange={(event) => setResponsable(event.target.value)}
                />
              </label>
            </div>

            <RiceConductSelect
              setNewInfTipo={setTipoInfraccion}
              setConductaRiceId={setConductaRiceId}
              setNewAulaSegura={setAulaSegura}
              setNewObs={setDescripcion}
              currentObs={descripcion}
              value={conductaRiceId}
            />

            <div>
              <label
                htmlFor="group-description"
                className="block font-semibold text-neutral-600 text-xs uppercase"
              >
                Hechos comunes
              </label>
              <textarea
                id="group-description"
                aria-label="Hechos comunes"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                rows={4}
                placeholder="Describa el hecho común sin mezclar los descargos individuales."
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-950">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-brand-700"
                aria-hidden="true"
              />
              <p>
                Los documentos compartidos serán visibles en todos los
                expedientes vinculados. Los descargos y antecedentes personales
                se registran por separado. Cada expediente se crea con la falta,
                gravedad y Aula Segura seleccionadas del reglamento.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-gravisima-200 bg-gravisima-50 p-2.5 text-gravisima-700 text-xs"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-neutral-100 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creando..." : "Crear incidente y expedientes"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
