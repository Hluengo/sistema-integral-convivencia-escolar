/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Scale, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { Causa, EstadoCausa, TipoInfraccion } from '../types';

const CURRENT_DATE_STR = '2026-05-27';
const INFRACCIONES: TipoInfraccion[] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];

interface EditCausaModalProps {
  causa: Causa;
  onClose: () => void;
  onSave: (updated: Causa) => void;
  onDelete: (id: string) => void;
}

function toInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .filter(w => w.length >= 2)
    .map(w => w[0].toUpperCase() + '.')
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

  const [confirmDelete, setConfirmDelete] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.values(EstadoCausa).includes(estadoActual)) return;
    const isGravisima = tipoInfraccion === 'Gravísima';
    onSave({
      ...causa,
      estudianteNombre,
      nnaProtectedName: toInitials(estudianteNombre) || causa.nnaProtectedName,
      estudianteCurso,
      runEstudiante,
      tipoInfraccion,
      comprometeAulaSegura: isGravisima ? true : causa.comprometeAulaSegura,
      responsable,
      estadoActual,
      observaciones,
      fechaUltimaActualizacion: CURRENT_DATE_STR
    });
  };

  const fieldClass = "w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all text-xs";
  const labelClass = "block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide";

  return (
    <dialog
      ref={dialogRef}
      aria-label="Editar expediente"
      aria-modal="true"
      className="p-0 m-auto border-none bg-transparent text-inherit no-backdrop z-50"
    >
      <div className="relative w-full max-w-[40rem] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-scale-in m-auto">
        <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-secondary-500" aria-hidden="true" />
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brand-50">
                <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-sm text-neutral-900">Editar Expediente</h4>
                <p className="text-[11px] text-neutral-400 font-medium">{causa.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-700 font-medium transition-all cursor-pointer"
            >
              ✕ Cerrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left text-sm text-neutral-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-nombre" className={labelClass}>Estudiante</label>
                <input
                  id="edit-nombre"
                  type="text"
                  required
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
              <textarea
                id="edit-obs"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className={`${fieldClass} resize-none leading-relaxed font-sans`}
              />
            </div>

            {tipoInfraccion === 'Gravísima' && (
              <div className="bg-gravisima-50 p-3 rounded-lg border border-gravisima-200 text-[11px] text-gravisima-800 leading-normal font-sans font-medium">
                ⚠️ <strong>Ley Aula Segura activa:</strong> Recuerde citar formalmente a la Superintendencia en un lapso de 24 horas y resolver en no más de 10 días hábiles.
              </div>
            )}

            {/* Actions */}
            {confirmDelete ? (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 bg-red-50/60 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                <div className="flex items-center gap-1.5 text-[11px] text-red-700 font-medium">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  ¿Eliminar este expediente de forma permanente?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(causa.id)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar expediente
                </button>
                <div className="flex items-center gap-2">
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
