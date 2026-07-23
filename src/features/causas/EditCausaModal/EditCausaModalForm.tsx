/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { Scale, AlertCircle, FileText, Shield } from 'lucide-react';
import { type Causa, EstadoCausa, type TipoInfraccion } from '@/src/types';
import { nowDateOnly } from '@/src/lib/dateUtils';
import ImproveTextarea from '@/src/components/ImproveTextarea';
import { Dialog, DialogContent } from '@/src/components/ui/Dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogIcon, AlertDialogTitle } from '@/src/components/ui/AlertDialog';

const INFRACCIONES: TipoInfraccion[] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];

function toInitials(name: string): string {
  if (!name) { return ''; }
  return name
    .split(' ')
    .filter(w => w.length >= 2)
    .map(w => `${w[0].toUpperCase()}.`)
    .join(' ');
}

interface EditCausaModalFormProps {
  causa: Causa;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function EditCausaModalForm({ causa, onSave, onDelete, onClose }: EditCausaModalFormProps) {
  const [estudianteNombre, setEstudianteNombre] = useState(causa.estudianteNombre);
  const [estudianteCurso, setEstudianteCurso] = useState(causa.estudianteCurso);
  const [runEstudiante, setRunEstudiante] = useState(causa.runEstudiante);
  const [tipoInfraccion, setTipoInfraccion] = useState<TipoInfraccion>(causa.tipoInfraccion);
  const [responsable, setResponsable] = useState(causa.responsable);
  const [estadoActual, setEstadoActual] = useState<EstadoCausa>(causa.estadoActual);
  const [observaciones, setObservaciones] = useState(causa.observaciones);
  const [aulaSegura, setAulaSegura] = useState(causa.comprometeAulaSegura);

  const [esDenunciaConfidencial, setEsDenunciaConfidencial] = useState(causa.esDenunciaConfidencial || false);
  const [identidadReservada, setIdentidadReservada] = useState(causa.identidadReservada || false);
  const [fechaInicioInvestigacion, setFechaInicioInvestigacion] = useState(causa.fechaInicioInvestigacion || '');
  const [fechaInicioSuspension, setFechaInicioSuspension] = useState(causa.fechaInicioSuspension || '');
  const [duracionSuspensionDias, setDuracionSuspensionDias] = useState(causa.duracionSuspensionDias || 0);
  const [monitoreoPedagogico, setMonitoreoPedagogico] = useState(causa.monitoreoPedagogico || false);
  const [requiereNotificacionSuperintendencia, setRequiereNotificacionSuperintendencia] = useState(causa.requiereNotificacionSuperintendencia || false);
  const [fechaNotificacionSuperintendencia, setFechaNotificacionSuperintendencia] = useState(causa.fechaNotificacionSuperintendencia || '');
  const [estudianteTieneNEE, setEstudianteTieneNEE] = useState(causa.estudianteTieneNEE || false);
  const [tipoNEE, setTipoNEE] = useState(causa.tipoNEE || '');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!Object.values(EstadoCausa).includes(estadoActual)) { return; }
    onSave({
      ...causa,
      estudianteNombre,
      nnaProtectedName: toInitials(estudianteNombre) || causa.nnaProtectedName,
      estudianteCurso,
      runEstudiante,
      tipoInfraccion,
      comprometeAulaSegura: aulaSegura,
      responsable,
      estadoActual,
      observaciones,
      fechaUltimaActualizacion: nowDateOnly(),
      esDenunciaConfidencial,
      identidadReservada,
      fechaInicioInvestigacion: fechaInicioInvestigacion || undefined,
      fechaInicioSuspension: fechaInicioSuspension || undefined,
      duracionSuspensionDias: duracionSuspensionDias || undefined,
      monitoreoPedagogico,
      requiereNotificacionSuperintendencia,
      fechaNotificacionSuperintendencia: fechaNotificacionSuperintendencia || undefined,
      estudianteTieneNEE,
      tipoNEE: tipoNEE || undefined
    });
  };

  const fieldClass = "w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-colors text-xs";
  const labelClass = "block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide";
  const selectClass = "w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-colors text-xs appearance-none";

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent hideClose className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <Scale className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h2 className="font-bold text-neutral-900 text-lg">Editar Expediente</h2>
                <p className="text-neutral-500 text-xs">Expediente: {causa.id}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="edit-estudiante" className={labelClass}>Estudiante</label>
                <input id="edit-estudiante" aria-label="Estudiante" value={estudianteNombre} onChange={(e) => setEstudianteNombre(e.target.value)} className={fieldClass} placeholder="Nombre completo" required />
              </div>
              <div>
                <label htmlFor="edit-curso" className={labelClass}>Curso</label>
                <input id="edit-curso" aria-label="Curso" value={estudianteCurso} onChange={(e) => setEstudianteCurso(e.target.value)} className={fieldClass} placeholder="Ej: 7° Básico A" />
              </div>
              <div>
                <label htmlFor="edit-run" className={labelClass}>RUN</label>
                <input id="edit-run" aria-label="RUN" value={runEstudiante} onChange={(e) => setRunEstudiante(e.target.value)} className={fieldClass} placeholder="12.345.678-9" />
              </div>
              <div>
                <label htmlFor="edit-tipo-infraccion" className={labelClass}>Tipo Infracción</label>
                <select id="edit-tipo-infraccion" aria-label="Tipo de infracción" value={tipoInfraccion} onChange={(e) => setTipoInfraccion(e.target.value as TipoInfraccion)} className={selectClass} required>
                  {INFRACCIONES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="edit-responsable" className={labelClass}>Encargado / Responsable</label>
                <input id="edit-responsable" aria-label="Encargado o responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} className={fieldClass} placeholder="Nombre del inspector/a" required />
              </div>
              <div>
                <label htmlFor="edit-estado" className={labelClass}>Estado Actual</label>
                <select id="edit-estado" aria-label="Estado actual" value={estadoActual} onChange={(e) => setEstadoActual(e.target.value as EstadoCausa)} className={selectClass} required>
                  {Object.values(EstadoCausa).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="edit-obs" className={labelClass}>Observaciones</label>
              <ImproveTextarea id="edit-obs" value={observaciones} onChange={setObservaciones} className={fieldClass} rows={3} placeholder="Descripción de los hechos, contexto, etc." />
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <AlertCircle className="h-4 w-4" />
                Aula Segura / Ley 21.128
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Compromete Aula Segura" checked={aulaSegura} onChange={(e) => setAulaSegura(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-neutral-700">Compromete Aula Segura</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Denuncia confidencial" checked={esDenunciaConfidencial} onChange={(e) => setEsDenunciaConfidencial(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-neutral-700">Denuncia Confidencial</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Identidad reservada" checked={identidadReservada} onChange={(e) => setIdentidadReservada(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-neutral-700">Identidad Reservada</span>
                </label>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <FileText className="h-4 w-4" />
                Plazos y Suspensión
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="edit-inicio-investigacion" className={labelClass}>Inicio Investigación</label>
                  <input id="edit-inicio-investigacion" aria-label="Inicio investigación" type="date" value={fechaInicioInvestigacion} onChange={(e) => setFechaInicioInvestigacion(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="edit-inicio-suspension" className={labelClass}>Inicio Suspensión</label>
                  <input id="edit-inicio-suspension" aria-label="Inicio suspensión" type="date" value={fechaInicioSuspension} onChange={(e) => setFechaInicioSuspension(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="edit-dias-suspension" className={labelClass}>Días Suspensión</label>
                  <input id="edit-dias-suspension" aria-label="Días de suspensión" type="number" min="0" max="15" value={duracionSuspensionDias} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setDuracionSuspensionDias(v); }} className={fieldClass} />
                </div>
                <label className="flex items-center gap-2 md:col-span-2">
                  <input type="checkbox" aria-label="Monitoreo pedagógico obligatorio" checked={monitoreoPedagogico} onChange={(e) => setMonitoreoPedagogico(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-neutral-700">Monitoreo Pedagógico Obligatorio</span>
                </label>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <Shield className="h-4 w-4" />
                Notificación Superintendencia
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Requiere notificación a Superintendencia" checked={requiereNotificacionSuperintendencia} onChange={(e) => setRequiereNotificacionSuperintendencia(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-neutral-700">Requiere Notificación a Superintendencia</span>
                </label>
                <div>
                  <label htmlFor="edit-fecha-notificacion" className={labelClass}>Fecha Notificación</label>
                  <input id="edit-fecha-notificacion" aria-label="Fecha de notificación" type="date" value={fechaNotificacionSuperintendencia} onChange={(e) => setFechaNotificacionSuperintendencia(e.target.value)} className={fieldClass} />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <AlertCircle className="h-4 w-4" />
                NEE / Discapacidad
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Estudiante con NEE" checked={estudianteTieneNEE} onChange={(e) => setEstudianteTieneNEE(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-neutral-700">Estudiante con NEE</span>
                </label>
                <div>
                  <label htmlFor="edit-tipo-nee" className={labelClass}>Tipo NEE</label>
                  <input id="edit-tipo-nee" aria-label="Tipo NEE" value={tipoNEE} onChange={(e) => setTipoNEE(e.target.value)} className={fieldClass} placeholder="TEA, TDAH, Disc. Intelectual, etc." disabled={!estudianteTieneNEE} />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                Eliminar Expediente
              </button>
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
                Guardar Cambios
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogIcon />
            <AlertDialogTitle>¿Eliminar expediente?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Esta acción eliminará el expediente {causa.id} de forma permanente. No se puede deshacer.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(causa.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
