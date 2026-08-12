/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { Scale, AlertCircle, FileText, Shield, Trash2 } from 'lucide-react';
import { type Causa, EstadoCausa, type TipoInfraccion } from '@/shared/lib/types';
import { nowDateOnly } from '@/shared/lib/dateUtils';
import ImproveTextarea from '@/shared/ImproveTextarea';
import { editCausaFormSchema, type EditCausaFormValues } from '@/shared/lib/schemas/editCausaForm';
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
} from '@/shared/ui/AlertDialog';
import Button from '@/shared/ui/Button';

const INFRACCIONES: TipoInfraccion[] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];
const EDIT_CAUSA_FIELDS = [
  'estudianteNombre',
  'estudianteCurso',
  'runEstudiante',
  'tipoInfraccion',
  'responsable',
  'estadoActual',
  'observaciones',
  'comprometeAulaSegura',
  'esDenunciaConfidencial',
  'identidadReservada',
  'fechaInicioInvestigacion',
  'fechaInicioSuspension',
  'duracionSuspensionDias',
  'monitoreoPedagogico',
  'requiereNotificacionSuperintendencia',
  'fechaNotificacionSuperintendencia',
  'estudianteTieneNEE',
  'tipoNEE',
] as const satisfies Array<keyof EditCausaFormValues>;

const fieldClass =
  'w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-colors text-xs';
const fieldErrorClass =
  'w-full mt-1.5 border border-grave-300 rounded-lg p-2.5 bg-grave-50 font-medium text-grave-900 focus:outline-none focus:ring-2 focus:ring-grave-500/30 focus:border-grave-500 focus:bg-white transition-colors text-xs';
const labelClass = 'block text-9px font-semibold text-neutral-400 uppercase tracking-wide';
const selectClass =
  'w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-colors text-xs appearance-none';
const selectErrorClass =
  'w-full mt-1.5 border border-grave-300 rounded-lg p-2.5 bg-grave-50 font-medium text-grave-900 focus:outline-none focus:ring-2 focus:ring-grave-500/30 focus:border-grave-500 focus:bg-white transition-colors text-xs appearance-none';

function toInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .filter((word) => word.length >= 2)
    .map((word) => `${word[0].toUpperCase()}.`)
    .join(' ');
}

function isEditCausaField(field: unknown): field is keyof EditCausaFormValues {
  return (
    typeof field === 'string' && EDIT_CAUSA_FIELDS.includes(field as keyof EditCausaFormValues)
  );
}

const editCausaResolver: Resolver<EditCausaFormValues> = async (values) => {
  const result = editCausaFormSchema.safeParse(values);
  if (result.success) {
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

function buildDefaultValues(causa: Causa): EditCausaFormValues {
  return {
    estudianteNombre: causa.estudianteNombre,
    estudianteCurso: causa.estudianteCurso,
    runEstudiante: causa.runEstudiante,
    tipoInfraccion: causa.tipoInfraccion,
    responsable: causa.responsable,
    estadoActual: causa.estadoActual,
    observaciones: causa.observaciones,
    comprometeAulaSegura: causa.comprometeAulaSegura,
    esDenunciaConfidencial: causa.esDenunciaConfidencial || false,
    identidadReservada: causa.identidadReservada || false,
    fechaInicioInvestigacion: causa.fechaInicioInvestigacion || '',
    fechaInicioSuspension: causa.fechaInicioSuspension || '',
    duracionSuspensionDias: causa.duracionSuspensionDias || 0,
    monitoreoPedagogico: causa.monitoreoPedagogico || false,
    requiereNotificacionSuperintendencia: causa.requiereNotificacionSuperintendencia || false,
    fechaNotificacionSuperintendencia: causa.fechaNotificacionSuperintendencia || '',
    estudianteTieneNEE: causa.estudianteTieneNEE || false,
    tipoNEE: causa.tipoNEE || '',
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1 text-grave-700 text-xs">
      {message}
    </p>
  );
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
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCausaFormValues>({
    defaultValues: buildDefaultValues(causa),
    mode: 'onChange',
    resolver: editCausaResolver,
  });
  const estudianteTieneNEE = watch('estudianteTieneNEE');

  const submitUpdatedCausa = handleSubmit((values) => {
    onSave({
      ...causa,
      estudianteNombre: values.estudianteNombre,
      nnaProtectedName: toInitials(values.estudianteNombre) || causa.nnaProtectedName,
      estudianteCurso: values.estudianteCurso,
      runEstudiante: values.runEstudiante,
      tipoInfraccion: values.tipoInfraccion,
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
      requiereNotificacionSuperintendencia: values.requiereNotificacionSuperintendencia,
      fechaNotificacionSuperintendencia: values.fechaNotificacionSuperintendencia || undefined,
      estudianteTieneNEE: values.estudianteTieneNEE,
      tipoNEE: values.tipoNEE || undefined,
    });
  });

  return (
    <>
      <form onSubmit={submitUpdatedCausa} noValidate className="space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
            <Scale className="h-5 w-5 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-neutral-900">Editar Expediente</h2>
            <p className="text-neutral-500 text-xs">Expediente: {causa.id}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="edit-estudiante" className={labelClass}>
              Estudiante
            </label>
            <input
              id="edit-estudiante"
              aria-label="Estudiante"
              aria-invalid={!!errors.estudianteNombre}
              aria-describedby={errors.estudianteNombre ? 'edit-estudiante-error' : undefined}
              className={errors.estudianteNombre ? fieldErrorClass : fieldClass}
              placeholder="Nombre completo"
              {...register('estudianteNombre')}
            />
            <FieldError id="edit-estudiante-error" message={errors.estudianteNombre?.message} />
          </div>
          <div>
            <label htmlFor="edit-curso" className={labelClass}>
              Curso
            </label>
            <input
              id="edit-curso"
              aria-label="Curso"
              className={fieldClass}
              placeholder="Ej: 7 Basico A"
              {...register('estudianteCurso')}
            />
          </div>
          <div>
            <label htmlFor="edit-run" className={labelClass}>
              RUN
            </label>
            <input
              id="edit-run"
              aria-label="RUN"
              aria-invalid={!!errors.runEstudiante}
              aria-describedby={errors.runEstudiante ? 'edit-run-error' : undefined}
              className={errors.runEstudiante ? fieldErrorClass : fieldClass}
              placeholder="12.345.678-9"
              {...register('runEstudiante')}
            />
            <FieldError id="edit-run-error" message={errors.runEstudiante?.message} />
          </div>
          <div>
            <label htmlFor="edit-tipo-infraccion" className={labelClass}>
              Tipo Infracción
            </label>
            <select
              id="edit-tipo-infraccion"
              aria-label="Tipo de infracción"
              className={selectClass}
              {...register('tipoInfraccion')}
            >
              {INFRACCIONES.map((infraccion) => (
                <option key={infraccion} value={infraccion}>
                  {infraccion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-responsable" className={labelClass}>
              Encargado / Responsable
            </label>
            <input
              id="edit-responsable"
              aria-label="Encargado o responsable"
              aria-invalid={!!errors.responsable}
              aria-describedby={errors.responsable ? 'edit-responsable-error' : undefined}
              className={errors.responsable ? fieldErrorClass : fieldClass}
              placeholder="Nombre del inspector/a"
              {...register('responsable')}
            />
            <FieldError id="edit-responsable-error" message={errors.responsable?.message} />
          </div>
          <div>
            <label htmlFor="edit-estado" className={labelClass}>
              Estado Actual
            </label>
            <select
              id="edit-estado"
              aria-label="Estado actual"
              aria-invalid={!!errors.estadoActual}
              aria-describedby={errors.estadoActual ? 'edit-estado-error' : undefined}
              className={errors.estadoActual ? selectErrorClass : selectClass}
              {...register('estadoActual')}
            >
              {Object.values(EstadoCausa).map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
            <FieldError id="edit-estado-error" message={errors.estadoActual?.message} />
          </div>
        </div>

        <div>
          <Controller
            control={control}
            name="observaciones"
            render={({ field }) => (
              <ImproveTextarea
                id="edit-obs"
                label="Observaciones"
                value={field.value}
                onChange={field.onChange}
                improvementContext="observaciones_causa"
                className={fieldClass}
                rows={3}
                placeholder="Descripción de los hechos, contexto, etc."
              />
            )}
          />
        </div>

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
                {...register('comprometeAulaSegura')}
              />
              <span className="text-neutral-700 text-sm">Compromete Aula Segura</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Denuncia confidencial"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register('esDenunciaConfidencial')}
              />
              <span className="text-neutral-700 text-sm">Denuncia Confidencial</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Identidad reservada"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register('identidadReservada')}
              />
              <span className="text-neutral-700 text-sm">Identidad Reservada</span>
            </label>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-brand-700 text-sm">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Plazos y Suspensión
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="edit-inicio-investigacion" className={labelClass}>
                Inicio Investigación
              </label>
              <input
                id="edit-inicio-investigacion"
                aria-label="Inicio investigación"
                type="date"
                className={fieldClass}
                {...register('fechaInicioInvestigacion')}
              />
            </div>
            <div>
              <label htmlFor="edit-inicio-suspension" className={labelClass}>
                Inicio Suspensión
              </label>
              <input
                id="edit-inicio-suspension"
                aria-label="Inicio suspensión"
                type="date"
                className={fieldClass}
                {...register('fechaInicioSuspension')}
              />
            </div>
            <div>
              <label htmlFor="edit-dias-suspension" className={labelClass}>
                Días Suspensión
              </label>
              <input
                id="edit-dias-suspension"
                aria-label="Días de suspensión"
                type="number"
                min="0"
                max="15"
                aria-invalid={!!errors.duracionSuspensionDias}
                aria-describedby={
                  errors.duracionSuspensionDias ? 'edit-dias-suspension-error' : undefined
                }
                className={errors.duracionSuspensionDias ? fieldErrorClass : fieldClass}
                {...register('duracionSuspensionDias', { valueAsNumber: true })}
              />
              <FieldError
                id="edit-dias-suspension-error"
                message={errors.duracionSuspensionDias?.message}
              />
            </div>
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                aria-label="Monitoreo pedagógico obligatorio"
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                {...register('monitoreoPedagogico')}
              />
              <span className="text-neutral-700 text-sm">Monitoreo Pedagógico Obligatorio</span>
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
                {...register('requiereNotificacionSuperintendencia')}
              />
              <span className="text-neutral-700 text-sm">
                Requiere Notificación a Superintendencia
              </span>
            </label>
            <div>
              <label htmlFor="edit-fecha-notificacion" className={labelClass}>
                Fecha Notificación
              </label>
              <input
                id="edit-fecha-notificacion"
                aria-label="Fecha de notificación"
                type="date"
                className={fieldClass}
                {...register('fechaNotificacionSuperintendencia')}
              />
            </div>
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
                {...register('estudianteTieneNEE')}
              />
              <span className="text-neutral-700 text-sm">Estudiante con NEE</span>
            </label>
            <div>
              <label htmlFor="edit-tipo-nee" className={labelClass}>
                Tipo NEE
              </label>
              <input
                id="edit-tipo-nee"
                aria-label="Tipo NEE"
                className={fieldClass}
                placeholder="TEA, TDAH, Disc. Intelectual, etc."
                disabled={!estudianteTieneNEE}
                {...register('tipoNEE')}
              />
            </div>
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
            Esta acción eliminará el expediente {causa.id} de forma permanente. No se puede
            deshacer.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(causa.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
