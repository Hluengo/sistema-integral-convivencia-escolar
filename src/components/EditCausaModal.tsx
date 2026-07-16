/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useRef, useEffect, useState } from 'react';
import { Scale, AlertCircle, FileText, Trash2, Shield, } from 'lucide-react';
import { type Causa, EstadoCausa, type TipoInfraccion } from '../types';
import { nowDateOnly } from '../lib/dateUtils';
import ImproveTextarea from './ImproveTextarea';
const INFRACCIONES: TipoInfraccion[] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];

interface EditCausaModalProps {
  causa: Causa;
  onClose: () => void;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => void;
}

function toInitials(name: string): string {
  if (!name) { return ''; }
  return name
    .split(' ')
    .filter(w => w.length >= 2)
    .map(w => `${w[0].toUpperCase()}.`)
    .join(' ');
}

export default function EditCausaModal({ causa, onClose, onSave, onDelete }: EditCausaModalProps) {
  const [estudianteNombre, setEstudianteNombre] = useState(causa.estudianteNombre);
  const [estudianteCurso, setEstudianteCurso] = useState(causa.estudianteCurso);
  const [runEstudiante, setRunEstudiante] = useState(causa.runEstudiante);
  const [tipoInfraccion, setTipoInfraccion] = useState<TipoInfraccion>(causa.tipoInfraccion);
  const [responsable, setResponsable] = useState(causa.responsable);
  const [estadoActual, setEstadoActual] = useState<EstadoCausa>(causa.estadoActual);
  const [observaciones, setObservaciones] = useState(causa.observaciones);
  const [aulaSegura, _setAulaSegura] = useState(causa.comprometeAulaSegura);
  
  // Legal compliance fields
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

  const [confirmDelete, setConfirmDelete] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) { return; }
    dialog.showModal();

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.close();
    };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.values(EstadoCausa).includes(estadoActual)) { return; }
    const _isGravisima = tipoInfraccion === 'Gravísima';
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
      // Legal compliance fields
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

  const fieldClass = "w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all text-xs";
  const labelClass = "block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide";

  return (
    <dialog
      ref={dialogRef}
      aria-label="Editar expediente"
      aria-modal="true"
      className="no-backdrop z-50 m-auto border-none bg-transparent p-0 text-inherit"
    >
      <div className="relative m-auto max-h-[90vh] w-full max-w-[40rem] animate-scale-in overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="absolute top-0 right-4 left-4 h-[3px] rounded-full bg-secondary-500" aria-hidden="true" />
        <div className="space-y-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between border-neutral-100 border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-brand-50 p-2">
                <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold font-sans text-neutral-900 text-sm">Editar Expediente</h4>
                <p className="font-medium text-[11px] text-neutral-400">{causa.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-neutral-50 px-3 py-1.5 font-medium text-[11px] text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700"
            >
              ✕ Cerrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left text-neutral-800 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-nombre" className={labelClass}>Estudiante</label>
                <input
                  id="edit-nombre"
                  type="text"
                  required
                  spellCheck={false}
                  value={estudianteNombre}
                  onChange={(e) => setEstudianteNombre(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="edit-curso" className={labelClass}>Curso</label>
                <input
                  id="edit-curso"
                  type="text"
                  spellCheck={false}
                  value={estudianteCurso}
                  onChange={(e) => setEstudianteCurso(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="edit-rut" className={labelClass}>RUN / RUT</label>
                <input
                  id="edit-rut"
                  type="text"
                  spellCheck={false}
                  value={runEstudiante}
                  onChange={(e) => setRunEstudiante(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="edit-gravedad" className={labelClass}>Gravedad</label>
                <select
                  id="edit-gravedad"
                  value={tipoInfraccion}
                  onChange={(e) => setTipoInfraccion(e.target.value as TipoInfraccion)}
                  className={fieldClass}
                >
                  {INFRACCIONES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

               <div>
                <label htmlFor="edit-responsable" className={labelClass}>Fiscalizador a cargo</label>
                <input
                  id="edit-responsable"
                  type="text"
                  required
                  spellCheck={false}
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="edit-estado" className={labelClass}>Estado del expediente</label>
                <select
                  id="edit-estado"
                  value={estadoActual}
                  onChange={(e) => setEstadoActual(e.target.value as EstadoCausa)}
                  className={fieldClass}
                >
                  {Object.values(EstadoCausa).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

            <div>
              <label htmlFor="edit-obs" className={labelClass}>Relato de los Hechos / Observaciones</label>
<ImproveTextarea
              id="edit-obs"
              label="Observaciones / Relato:"
              placeholder="Detalle del caso..."
              value={observaciones}
              onChange={setObservaciones}
              rows={3}
              className={`${fieldClass} resize-none font-sans leading-relaxed`}
            />
            </div>

            {/* === SECCIÓN: CUMPLIMIENTO LEGAL (Ley 21809) === */}
            <div className="space-y-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-blue-800 text-xs uppercase tracking-wide">
                  Cumplimiento Legal Obligatorio (Ley 21809)
                </span>
              </div>

              {/* Canal Confidencial */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-confidencial"
                    checked={esDenunciaConfidencial}
                    onChange={(e) => setEsDenunciaConfidencial(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-confidencial" className="font-medium text-blue-700 text-xs">
                    Canal Confidencial (Art. 16E.e)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-reserva"
                    checked={identidadReservada}
                    onChange={(e) => setIdentidadReservada(e.target.checked)}
                    disabled={!esDenunciaConfidencial}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <label htmlFor="edit-reserva" className="font-medium text-blue-700 text-xs">
                    Identidad Reservada
                  </label>
                </div>
              </div>

              {/* Fechas de Investigación */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-fecha-investigacion" className={labelClass}>
                    Inicio Investigación (máx. 60 días)
                  </label>
                  <input
                    id="edit-fecha-investigacion"
                    type="date"
                    value={fechaInicioInvestigacion}
                    onChange={(e) => setFechaInicioInvestigacion(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="edit-fecha-suspension" className={labelClass}>
                    Inicio Suspensión (máx. 15 días)
                  </label>
                  <input
                    id="edit-fecha-suspension"
                    type="date"
                    value={fechaInicioSuspension}
                    onChange={(e) => setFechaInicioSuspension(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Suspensión y Monitoreo */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-dias-suspension" className={labelClass}>
                    Días de Suspensión
                  </label>
                  <input
                    id="edit-dias-suspension"
                    type="number"
                    min="0"
                    max="15"
                    value={duracionSuspensionDias}
                    onChange={(e) => setDuracionSuspensionDias(Number.parseInt(e.target.value, 10) || 0)}
                    className={fieldClass}
                  />
                  {duracionSuspensionDias > 15 && (
                    <p className="mt-1 font-medium text-[10px] text-red-600">
                      ⚠️ Excede máximo legal (15 días)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="edit-monitoreo"
                    checked={monitoreoPedagogico}
                    onChange={(e) => setMonitoreoPedagogico(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-monitoreo" className="font-medium text-blue-700 text-xs">
                    Monitoreo Pedagógico (Art. 16E.j)
                  </label>
                </div>
              </div>

              {/* Superintendencia */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-superintendencia"
                    checked={requiereNotificacionSuperintendencia}
                    onChange={(e) => setRequiereNotificacionSuperintendencia(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-superintendencia" className="font-medium text-blue-700 text-xs">
                    Notificar Superintendencia (5 días)
                  </label>
                </div>
                {requiereNotificacionSuperintendencia && (
                  <div>
                    <label htmlFor="edit-fecha-notificacion" className={labelClass}>
                      Fecha Notificación
                    </label>
                    <input
                      id="edit-fecha-notificacion"
                      type="date"
                      value={fechaNotificacionSuperintendencia}
                      onChange={(e) => setFechaNotificacionSuperintendencia(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              {/* NEE/Discapacidad */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-nee"
                    checked={estudianteTieneNEE}
                    onChange={(e) => setEstudianteTieneNEE(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-nee" className="font-medium text-blue-700 text-xs">
                    Estudiante con NEE/DisCAPACIDAD
                  </label>
                </div>
                {estudianteTieneNEE && (
                  <div>
                    <label htmlFor="edit-tipo-nee" className={labelClass}>
                      Tipo NEE
                    </label>
                    <input
                      id="edit-tipo-nee"
                      type="text"
                      value={tipoNEE}
                      onChange={(e) => setTipoNEE(e.target.value)}
                      placeholder="Ej: Autismo, TDAH, etc."
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>

              {/* Advertencia NEE */}
              {estudianteTieneNEE && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 font-medium text-[10px] text-amber-800">
                  ⚠️ <strong>Prohibición Legal:</strong> No se pueden aplicar sanciones que se funden en la discapacidad o NEE (Ley 21809, Art. 16E).
                </div>
              )}
            </div>

            {tipoInfraccion === 'Gravísima' && (
              <div className="rounded-lg border border-gravisima-200 bg-gravisima-50 p-3 font-medium font-sans text-[11px] text-gravisima-800 leading-normal">
                ⚠️ <strong>Ley Aula Segura activa:</strong> Recuerde citar formalmente a la Superintendencia en un lapso de 24 horas y resolver en no más de 10 días hábiles.
              </div>
            )}

            {/* Actions */}
            {confirmDelete ? (
              <div className="-mx-6 -mb-6 flex items-center justify-between gap-2 rounded-b-2xl border-neutral-100 border-t bg-red-50/60 px-6 py-4 pt-2">
                <div className="flex items-center gap-1.5 font-medium text-[11px] text-red-700">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  ¿Eliminar este expediente de forma permanente?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-medium text-[11px] text-neutral-600 hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(causa.id)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-[11px] text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 border-neutral-100 border-t pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-[11px] text-red-600 transition-all hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar expediente
                </button>
                <div className="flex items-center gap-2">
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
                    <FileText className="h-4 w-4" aria-hidden="true" /> Guardar cambios
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </dialog>
  );
}
