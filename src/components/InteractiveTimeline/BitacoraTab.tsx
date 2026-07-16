/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import type { Causa, BitacoraEntry, UserRole } from '../../types';
import { FileText, Plus, Send, Calendar, File, Download } from 'lucide-react';
import ImproveInput from '../ImproveInput';
import ImproveTextarea from '../ImproveTextarea';

interface BitacoraTabProps {
  causa: Causa;
  currentRole: UserRole;
  showLogForm: boolean;
  setShowLogForm: React.Dispatch<React.SetStateAction<boolean>>;
  logType: BitacoraEntry['tipo'];
  setLogType: React.Dispatch<React.SetStateAction<BitacoraEntry['tipo']>>;
  logParticipantes: string;
  setLogParticipantes: React.Dispatch<React.SetStateAction<string>>;
  logTitle: string;
  setLogTitle: React.Dispatch<React.SetStateAction<string>>;
  logDesc: string;
  setLogDesc: React.Dispatch<React.SetStateAction<string>>;
  handleAddNewLog: (e: React.FormEvent) => void;
}

export default function BitacoraTab({
  causa,
  currentRole,
  showLogForm,
  setShowLogForm,
  logType,
  setLogType,
  logParticipantes,
  setLogParticipantes,
  logTitle,
  setLogTitle,
  logDesc,
  setLogDesc,
  handleAddNewLog
}: BitacoraTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-700 text-xs uppercase tracking-wider">
          <FileText className="h-4 w-4 text-brand-500" aria-hidden="true" />
          Bitácora del expediente
        </h3>
        {currentRole !== 'docente' && (
          <button
            type="button"
            onClick={() => setShowLogForm(!showLogForm)}
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-[11px] text-white transition-all hover:bg-brand-700"
            aria-expanded={showLogForm}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo registro</span>
          </button>
        )}
      </div>

      {/* New Log Form */}
      {showLogForm && (
        <form onSubmit={handleAddNewLog} aria-label="Nuevo registro en bitácora" className="animate-slide-up space-y-3 rounded-lg border border-brand-200 bg-white p-4 text-left">
          <div className="flex items-center justify-between border-neutral-100 border-b pb-2">
            <h4 className="font-semibold text-[11px] text-neutral-800">Nuevo registro en bitácora</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="log-type" className="mb-1 block font-semibold text-[9px] text-neutral-400 uppercase">Tipo</label>
              <select
                id="log-type"
                value={logType}
                onChange={(e) => setLogType(e.target.value as BitacoraEntry['tipo'])}
                className="w-full rounded-lg border border-neutral-300 bg-white p-2 font-medium text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="Entrevista">Entrevista</option>
                <option value="Evidencia">Evidencia</option>
                <option value="Notificación">Notificación</option>
                <option value="Mediación">Mediación</option>
                <option value="Resolución">Resolución</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="log-participantes" className="mb-1 block font-semibold text-[9px] text-neutral-400 uppercase">Participantes</label>
<input
  id="log-participantes"
  type="text"
  spellCheck={false}
  value={logParticipantes}
  onChange={(e) => setLogParticipantes(e.target.value)}
  placeholder="Separados por comas"
  className="w-full rounded-lg border border-neutral-300 bg-white p-2 font-medium text-neutral-700 text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
/>
            </div>
          </div>
          <div>
            <ImproveInput
            id="log-title"
            label="Título"
            placeholder="Describa el evento brevemente"
            value={logTitle}
            onChange={setLogTitle}
            required
            className="w-full rounded-lg border border-neutral-300 bg-white p-2 font-medium text-neutral-700 text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          </div>
          <div>
            <ImproveTextarea
            id="log-desc"
            label="Descripción"
            placeholder="Relato detallado del hecho procesal..."
            value={logDesc}
            onChange={setLogDesc}
            required
            rows={2}
            className="w-full rounded-lg border border-neutral-300 bg-white p-2 font-medium text-neutral-700 text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="rounded-lg px-3 py-1.5 font-medium text-[11px] text-neutral-500 transition-all hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-1.5 font-medium text-[11px] text-white transition-all hover:bg-brand-700"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" /> Agregar
            </button>
          </div>
        </form>
      )}

      {/* Log entries */}
      <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
        {causa.bitacora.length > 0 ? (
          causa.bitacora.map((entry, _idx) => {
            const tipoColors: Record<string, string> = {
              'Entrevista': 'bg-info-100 text-info-700',
              'Evidencia': 'bg-amber-100 text-amber-700',
              'Notificación': 'bg-purple-100 text-purple-700',
              'Mediación': 'bg-success-100 text-success-700',
              'Resolución': 'bg-brand-100 text-brand-700',
              'Otro': 'bg-neutral-100 text-neutral-700',
            };
            return (
              <div key={entry.id} className="rounded-lg border border-neutral-200/80 bg-white p-4 text-left transition-all hover:border-neutral-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-neutral-900 text-xs">{entry.titulo}</h4>
                      <span className={`rounded px-1.5 py-0.5 font-semibold text-[8px] ${tipoColors[entry.tipo] || tipoColors.Otro}`}>
                        {entry.tipo}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-500 leading-relaxed">{entry.descripcion}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(entry.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span>{entry.participantes.join(', ')}</span>
                    </div>
                    {entry.documentoAdjunto && (
                      <div className="mt-2 flex items-center gap-1.5 rounded border border-info-200 bg-info-50 px-2 py-1 text-[10px]">
                        <File className="h-3 w-3 shrink-0 text-info-500" aria-hidden="true" />
                        <span className="truncate font-medium text-info-700">Documento adjunto</span>
                        <a
                          href={entry.documentoAdjunto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex shrink-0 items-center gap-0.5 font-semibold text-info-600 hover:underline"
                          aria-label="Ver documento adjunto"
                        >
                          <Download className="h-3 w-3" aria-hidden="true" /> Ver
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-neutral-400">
            <FileText className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
            <p className="font-medium text-xs">No hay registros en la bitácora</p>
          </div>
        )}
      </div>
    </div>
  );
}
