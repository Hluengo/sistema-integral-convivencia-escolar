/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { FieldErrors, Resolver, ResolverResult } from "react-hook-form";
import { Scale, AlertCircle, FileText, Shield, Trash2 } from "lucide-react";
import {
  type Causa,
  EstadoCausa,
  type TipoInfraccion,
} from "@/shared/lib/types";
import { nowDateOnly } from "@/shared/lib/dateUtils";
import {
  editCausaFormSchema,
  isValidStateTransition,
  type EditCausaFormValues,
} from "@/shared/lib/schemas/editCausaForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogTitle,
} from "@/shared/ui/AlertDialog";
import Button from "@/shared/ui/Button";
import FormField from "@/shared/ui/FormField";
import Input from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import RiceConductSelect from "../NewCausaForm/RiceConductSelect";

const INFRACCIONES: TipoInfraccion[] = [
  "Leve",
  "Grave",
  "Muy Grave",
  "Gravísima",
];
const EDIT_CAUSA_FIELDS = [
  "estudianteNombre",
  "estudianteCurso",
  "runEstudiante",
  "tipoInfraccion",
  "conductaRiceId",
  "responsable",
  "estadoActual",
  "observaciones",
  "comprometeAulaSegura",
  "esDenunciaConfidencial",
  "identidadReservada",
  "fechaInicioInvestigacion",
  "fechaInicioSuspension",
  "duracionSuspensionDias",
  "monitoreoPedagogico",
  "requiereNotificacionSuperintendencia",
  "fechaNotificacionSuperintendencia",
  "estudianteTieneNEE",
  "tipoNEE",
] as const satisfies Array<keyof EditCausaFormValues>;

function toInitials(name: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .filter((word) => word.length >= 2)
    .map((word) => `${word[0].toUpperCase()}.`)
    .join(" ");
}

function isEditCausaField(field: unknown): field is keyof EditCausaFormValues {
  return (
    typeof field === "string" &&
    EDIT_CAUSA_FIELDS.includes(field as keyof EditCausaFormValues)
  );
}

function createEditCausaResolver(
  estadoActual: EstadoCausa,
): Resolver<EditCausaFormValues> {
  return async (values): Promise<ResolverResult<EditCausaFormValues>> => {
    const result = editCausaFormSchema.safeParse(values);
    if (result.success) {
      if (!isValidStateTransition(estadoActual, result.data.estadoActual)) {
        return {
          values: {},
          errors: {
            estadoActual: {
              type: "custom",
              message:
                "La transición salta una fase del debido proceso (p. ej. de Recepción a Resolución sin Investigación). Avance por las fases en orden.",
            },
          },
        };
      }
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors<EditCausaFormValues> = {};
    for (const issue of result.error.issues) {
      const [field] = issue.path;
      if (isEditCausaField(field) && !errors[field]) {
        errors[field] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors };
  };
}

function buildDefaultValues(causa: Causa): EditCausaFormValues {
  return {
    estudianteNombre: causa.estudianteNombre,
    estudianteCurso: causa.estudianteCurso,
    runEstudiante: causa.runEstudiante,
    tipoInfraccion: causa.tipoInfraccion,
    conductaRiceId: causa.conductaRiceId || "",
    responsable: causa.responsable,
    estadoActual: causa.estadoActual,
    observaciones: causa.observaciones,
    comprometeAulaSegura: causa.comprometeAulaSegura,
    esDenunciaConfidencial: causa.esDenunciaConfidencial || false,
    identidadReservada: causa.identidadReservada || false,
    fechaInicioInvestigacion: causa.fechaInicioInvestigacion || "",
    fechaInicioSuspension: causa.fechaInicioSuspension || "",
    duracionSuspensionDias: causa.duracionSuspensionDias || 0,
    monitoreoPedagogico: causa.monitoreoPedagogico || false,
    requiereNotificacionSuperintendencia:
      causa.requiereNotificacionSuperintendencia || false,
    fechaNotificacionSuperintendencia:
      causa.fechaNotificacionSuperintendencia || "",
    estudianteTieneNEE: causa.estudianteTieneNEE || false,
    tipoNEE: causa.tipoNEE || "",
  };
}

interface EditCausaModalFormProps {
  causa: Causa;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function EditCausaModalForm({
  causa,
  onSave,
  onDelete,
  onClose,
}: EditCausaModalFormProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    control,
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCausaFormValues>({
    defaultValues: buildDefaultValues(causa),
    mode: "onChange",
    resolver: createEditCausaResolver(causa.estadoActual),
  });
  const estudianteTieneNEE = watch("estudianteTieneNEE");

  const submitUpdatedCausa = handleSubmit((values) => {
    onSave({
      ...causa,
      estudianteNombre: values.estudianteNombre,
      nnaProtectedName:
        toInitials(values.estudianteNombre) || causa.nnaProtectedName,
      estudianteCurso: values.estudianteCurso,
      runEstudiante: values.runEstudiante,
      tipoInfraccion: values.tipoInfraccion,
      conductaRiceId: values.conductaRiceId || undefined,
      comprometeAulaSegura: values.comprometeAulaSegura,
      responsable: values.responsable,
      estadoActual: values.estadoActual,
      observaciones: values.observaciones,
      fechaUltimaActualizacion: nowDateOnly(),
      esDenunciaConfidencial: values.esDenunciaConfidencial,
      identidadReservada: values.identidadReservada,
      fechaInicioInvestigacion: values.fechaInicioInvestigacion || undefined,
      fechaInicioSuspension: values.fechaInicioSuspension || undefined,
      duracionSuspensionDias: values.duracionSuspensionDias || undefined,
      monitoreoPedagogico: values.monitoreoPedagogico,
      requiereNotificacionSuperintendencia:
        values.requiereNotificacionSuperintendencia,
      fechaNotificacionSuperintendencia:
        values.fechaNotificacionSuperintendencia || undefined,
      estudianteTieneNEE: values.estudianteTieneNEE,
      tipoNEE: values.tipoNEE || undefined,
    });
  });

  return (
    <>
      <form
        onSubmit={submitUpdatedCausa}
        noValidate
        className="space-y-6 p-4 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <Scale className="h-5 w-5 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-neutral-900">
              Editar Expediente
            </h2>
            <p className="text-neutral-500 text-xs">Expediente: {causa.id}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Estudiante"
            htmlFor="edit-estudiante"
            error={errors.estudianteNombre?.message}
          >
            <Input
              id="edit-estudiante"
              aria-label="Estudiante"
              aria-describedby={
                errors.estudianteNombre ? "edit-estudiante-error" : undefined
              }
              invalid={!!errors.estudianteNombre}
              placeholder="Nombre completo"
              {...register("estudianteNombre")}
            />
          </FormField>
          <FormField label="Curso" htmlFor="edit-curso">
            <Input
              id="edit-curso"
              aria-label="Curso"
              placeholder="Ej: 7 Basico A"
              {...register("estudianteCurso")}
            />
          </FormField>
          <FormField
            label="RUN"
            htmlFor="edit-run"
            error={errors.runEstudiante?.message}
          >
            <Input
              id="edit-run"
              aria-label="RUN"
              aria-describedby={
                errors.runEstudiante ? "edit-run-error" : undefined
              }
              invalid={!!errors.runEstudiante}
              placeholder="12.345.678-9"
              {...register("runEstudiante")}
            />
          </FormField>
          <FormField label="Tipo Infracción" htmlFor="edit-tipo-infraccion">
            <Select
              id="edit-tipo-infraccion"
              aria-label="Tipo de infracción"
              {...register("tipoInfraccion")}
            >
              {INFRACCIONES.map((infraccion) => (
                <option key={infraccion} value={infraccion}>
                  {infraccion}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Encargado / Responsable"
            htmlFor="edit-responsable"
            error={errors.responsable?.message}
          >
            <Input
              id="edit-responsable"
              aria-label="Encargado o responsable"
              aria-describedby={
                errors.responsable ? "edit-responsable-error" : undefined
              }
              invalid={!!errors.responsable}
              placeholder="Nombre del inspector/a"
              {...register("responsable")}
            />
          </FormField>
          <FormField
            label="Estado Actual"
            htmlFor="edit-estado"
            error={errors.estadoActual?.message}
          >
            <Select
              id="edit-estado"
              aria-label="Estado actual"
              aria-describedby={
                errors.estadoActual ? "edit-estado-error" : undefined
              }
              invalid={!!errors.estadoActual}
              {...register("estadoActual")}
            >
              {Object.values(EstadoCausa).map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div>
          <RiceConductSelect
            value={watch("conductaRiceId") || ""}
            preserveObservations
            setConductaRiceId={(value) =>
              setValue("conductaRiceId", value, { shouldDirty: true })
            }
            setNewInfTipo={(value) =>
              setValue("tipoInfraccion", value, { shouldDirty: true })
            }
            setNewAulaSegura={(value) =>
              setValue("comprometeAulaSegura", value, { shouldDirty: true })
            }
            setNewObs={(value) =>
              setValue("observaciones", value, { shouldDirty: true })
            }
          />
          <p className="mt-1 text-xs text-neutral-500">
            Seleccionar una conducta actualiza la gravedad y Aula Segura. El
            relato de los hechos se conserva.
          </p>
        </div>

        <Controller
          control={control}
          name="observaciones"
          render={({ field }) => (
            <FormField label="Observaciones" htmlFor="edit-obs">
              <textarea
                id="edit-obs"
                aria-label="Observaciones"
                value={field.value}
                onChange={field.onChange}
                className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 font-medium text-neutral-700 text-xs outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30"
                rows={3}
                placeholder="Descripción de los hechos, contexto, etc."
              />
            </FormField>
          )}
        />

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-brand-700 text-sm">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Aula Segura / Ley 21.128
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Compromete Aula Segura"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register("comprometeAulaSegura")}
              />
              <span className="text-neutral-700 text-sm">
                Compromete Aula Segura
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Denuncia confidencial"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register("esDenunciaConfidencial")}
              />
              <span className="text-neutral-700 text-sm">
                Denuncia Confidencial
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Identidad reservada"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register("identidadReservada")}
              />
              <span className="text-neutral-700 text-sm">
                Identidad Reservada
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-brand-700 text-sm">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Plazos y Suspensión
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="Inicio Investigación"
              htmlFor="edit-inicio-investigacion"
            >
              <Input
                id="edit-inicio-investigacion"
                aria-label="Inicio investigación"
                type="date"
                {...register("fechaInicioInvestigacion")}
              />
            </FormField>
            <FormField
              label="Inicio Suspensión"
              htmlFor="edit-inicio-suspension"
            >
              <Input
                id="edit-inicio-suspension"
                aria-label="Inicio suspensión"
                type="date"
                {...register("fechaInicioSuspension")}
              />
            </FormField>
            <FormField
              label="Días Suspensión"
              htmlFor="edit-dias-suspension"
              error={errors.duracionSuspensionDias?.message}
            >
              <Input
                id="edit-dias-suspension"
                aria-label="Días de suspensión"
                type="number"
                min="0"
                max="15"
                aria-describedby={
                  errors.duracionSuspensionDias
                    ? "edit-dias-suspension-error"
                    : undefined
                }
                invalid={!!errors.duracionSuspensionDias}
                {...register("duracionSuspensionDias", { valueAsNumber: true })}
              />
            </FormField>
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                aria-label="Monitoreo pedagógico obligatorio"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register("monitoreoPedagogico")}
              />
              <span className="text-neutral-700 text-sm">
                Monitoreo Pedagógico Obligatorio
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-brand-700 text-sm">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Notificación Superintendencia
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Requiere notificación a Superintendencia"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register("requiereNotificacionSuperintendencia")}
              />
              <span className="text-neutral-700 text-sm">
                Requiere Notificación a Superintendencia
              </span>
            </label>
            <FormField
              label="Fecha Notificación"
              htmlFor="edit-fecha-notificacion"
            >
              <Input
                id="edit-fecha-notificacion"
                aria-label="Fecha de notificación"
                type="date"
                {...register("fechaNotificacionSuperintendencia")}
              />
            </FormField>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-brand-700 text-sm">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            NEE / Discapacidad
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Estudiante con NEE"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register("estudianteTieneNEE")}
              />
              <span className="text-neutral-700 text-sm">
                Estudiante con NEE
              </span>
            </label>
            <FormField label="Tipo NEE" htmlFor="edit-tipo-nee">
              <Input
                id="edit-tipo-nee"
                aria-label="Tipo NEE"
                placeholder="TEA, TDAH, Disc. Intelectual, etc."
                disabled={!estudianteTieneNEE}
                {...register("tipoNEE")}
              />
            </FormField>
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button
            variant="custom"
            onClick={() => setShowDeleteConfirm(true)}
            className="border border-gravisima-200 bg-white text-gravisima-700 shadow-none hover:bg-gravisima-50 hover:text-gravisima-800"
            aria-label={`Eliminar expediente ${causa.id}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar expediente
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogIcon />
            <AlertDialogTitle>¿Eliminar expediente?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Esta acción eliminará el expediente {causa.id} de forma permanente.
            No se puede deshacer.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(causa.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
