/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { FieldErrors, Resolver, ResolverResult } from "react-hook-form";
import {
  Scale,
  AlertCircle,
  FileText,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
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

function severityBadgeClass(tipo: TipoInfraccion): string {
  switch (tipo) {
    case "Gravísima":
      return "bg-gravisima-100 text-gravisima-700";
    case "Muy Grave":
      return "bg-purple-100 text-purple-800";
    case "Grave":
      return "bg-grave-100 text-grave-700";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function severityLabel(tipo: TipoInfraccion): string {
  switch (tipo) {
    case "Gravísima":
      return "Máxima Gravedad";
    case "Muy Grave":
      return "Alta Gravedad";
    case "Grave":
      return "Media Gravedad";
    default:
      return "Baja Gravedad";
  }
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof AlertCircle;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2">
      <div className="flex items-center gap-2 font-bold text-neutral-600 text-xs uppercase tracking-wider">
        <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span>{title}</span>
      </div>
      {hint ? (
        <span className="shrink-0 text-slate-500 text-xs">{hint}</span>
      ) : null}
    </div>
  );
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
  const tipoInfraccionValue = watch("tipoInfraccion");
  const estadoActualValue = watch("estadoActual");

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
        className="space-y-3 p-3 sm:p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <Scale className="size-5 text-brand-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-base text-neutral-900">
                  Editar Expediente
                </h2>
                <span className="rounded border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono font-semibold text-brand-700 text-xs">
                  {causa.id}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700 text-xs">
                  <span
                    className="size-1.5 rounded-full bg-amber-500"
                    aria-hidden="true"
                  />
                  {estadoActualValue}
                </span>
              </div>
              <p className="mt-0.5 truncate text-neutral-500 text-xs">
                Protocolo Ley 21.128 · Gestión de Convivencia Escolar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar editor"
            className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <section
          className="space-y-4"
          aria-label="Información del estudiante y proceso"
        >
          <SectionHeading
            icon={Users}
            title="Información del Estudiante y Proceso"
            hint="Datos registrados en matrícula"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <FormField
              label="Estudiante"
              htmlFor="edit-estudiante"
              error={errors.estudianteNombre?.message}
              className="md:col-span-2"
            >
              <Input
                compact
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
                compact
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
                compact
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
            <FormField
              label="Tipo Infracción"
              htmlFor="edit-tipo-infraccion"
              labelAction={
                <span
                  className={`shrink-0 rounded border px-1.5 py-px font-bold text-[10px] uppercase tracking-wider ${severityBadgeClass(tipoInfraccionValue)}`}
                >
                  {severityLabel(tipoInfraccionValue)}
                </span>
              }
            >
              <Select
                compact
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
              label="Estado Actual"
              htmlFor="edit-estado"
              error={errors.estadoActual?.message}
            >
              <Select
                compact
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
            <FormField
              label="Encargado / Responsable"
              htmlFor="edit-responsable"
              error={errors.responsable?.message}
              className="md:col-span-3"
            >
              <Input
                compact
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
          </div>
        </section>

        <section
          className="space-y-4"
          aria-label="Descripción de la falta y relato"
        >
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
              <FormField
                label="Observaciones"
                htmlFor="edit-obs"
                hint="Relato circunstanciado · declaración oficial"
              >
                <textarea
                  id="edit-obs"
                  aria-label="Observaciones"
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 p-2 font-medium text-neutral-700 text-[13px] outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30"
                  rows={3}
                  placeholder="Descripción de los hechos, contexto, etc."
                />
              </FormField>
            )}
          />
        </section>

        <section
          className="grid gap-3 md:grid-cols-2"
          aria-label="Controles legales y plazos"
        >
          <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
            <div className="flex items-center gap-2 border-b border-brand-100 pb-2 font-semibold text-brand-700 text-sm">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              Aula Segura / Ley 21.128
            </div>
            <div className="grid gap-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 transition-colors hover:border-neutral-300">
                <input
                  type="checkbox"
                  aria-label="Compromete Aula Segura"
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                  {...register("comprometeAulaSegura")}
                />
                <span className="font-medium text-neutral-700 text-xs">
                  Compromete Aula Segura
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 transition-colors hover:border-neutral-300">
                <input
                  type="checkbox"
                  aria-label="Denuncia confidencial"
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                  {...register("esDenunciaConfidencial")}
                />
                <span className="font-medium text-neutral-700 text-xs">
                  Denuncia Confidencial
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2 transition-colors hover:border-neutral-300">
                <input
                  type="checkbox"
                  aria-label="Identidad reservada"
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                  {...register("identidadReservada")}
                />
                <span className="font-medium text-neutral-700 text-xs">
                  Identidad Reservada
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 font-semibold text-brand-700 text-sm">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Plazos y Suspensión
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                label="Inicio Investigación"
                htmlFor="edit-inicio-investigacion"
              >
                <Input
                  compact
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
                  compact
                  id="edit-inicio-suspension"
                  aria-label="Inicio suspensión"
                  type="date"
                  {...register("fechaInicioSuspension")}
                />
              </FormField>
            </div>
            <div className="grid items-center gap-3 md:grid-cols-2">
              <FormField
                label="Días Suspensión"
                htmlFor="edit-dias-suspension"
                error={errors.duracionSuspensionDias?.message}
              >
                <Input
                  compact
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
                  {...register("duracionSuspensionDias", {
                    valueAsNumber: true,
                  })}
                />
              </FormField>
              <label className="flex min-h-11 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Monitoreo pedagógico obligatorio"
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                  {...register("monitoreoPedagogico")}
                />
                <span className="font-medium text-neutral-700 text-xs">
                  Monitoreo Pedagógico Obligatorio
                </span>
              </label>
            </div>
          </div>
        </section>

        <section
          className="grid gap-3 md:grid-cols-2"
          aria-label="Notificación y necesidades especiales"
        >
          <div className="space-y-3">
            <SectionHeading
              icon={Shield}
              title="Notificación Superintendencia"
            />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Requiere notificación a Superintendencia"
                  className="h-5 w-5 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
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
                  compact
                  id="edit-fecha-notificacion"
                  aria-label="Fecha de notificación"
                  type="date"
                  {...register("fechaNotificacionSuperintendencia")}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeading icon={AlertCircle} title="NEE / Discapacidad" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Estudiante con NEE"
                  className="h-5 w-5 rounded border-neutral-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/20"
                  {...register("estudianteTieneNEE")}
                />
                <span className="text-neutral-700 text-sm">
                  Estudiante con NEE
                </span>
              </label>
              <FormField label="Tipo NEE" htmlFor="edit-tipo-nee">
                <Input
                  compact
                  id="edit-tipo-nee"
                  aria-label="Tipo NEE"
                  placeholder="TEA, TDAH, Disc. Intelectual, etc."
                  disabled={!estudianteTieneNEE}
                  {...register("tipoNEE")}
                />
              </FormField>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 -mx-3 flex flex-col-reverse items-stretch gap-2 border-t border-neutral-100 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
          <Button
            variant="custom"
            onClick={() => setShowDeleteConfirm(true)}
            className="border border-gravisima-200 bg-white text-gravisima-700 shadow-none hover:bg-gravisima-50 hover:text-gravisima-800 sm:mr-auto"
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
