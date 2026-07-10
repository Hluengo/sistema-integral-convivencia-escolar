/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, BitacoraEntry, UserRole } from '../../types';
import { FileText, Plus, Send, Calendar } from 'lucide-react';
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
        <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-500" aria-hidden="true" />
          Bitácora del expediente
        </h3>
        {currentRole !== 'docente' && (
          <button
            type="button"
            onClick={() => setShowLogForm(!showLogForm)}
            className="text-[11px] bg-brand-600 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-all flex items-center gap-1 cursor-pointer"
            aria-expanded={showLogForm}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo registro</span>
          </button>
        )}
      </div>

      {/* New Log Form */}
      {showLogForm && (
        <form onSubmit={handleAddNewLog} aria-label="Nuevo registro en bitácora" className="bg-white border border-brand-200 rounded-lg p-4 space-y-3 text-left animate-slide-up">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="text-[11px] font-semibold text-neutral-800">Nuevo registro en bitácora</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="log-type" className="block text-[9px] font-semibold text-neutral-400 uppercase mb-1">Tipo</label>
              <select
                id="log-type"
                value={logType}
                onChange={(e) => setLogType(e.target.value as BitacoraEntry['tipo'])}
                className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
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
              <label htmlFor="log-participantes" className="block text-[9px] font-semibold text-neutral-400 uppercase mb-1">Participantes</label>
<input
  id="log-participantes"
  type="text"
  spellCheck={false}
  value={logParticipantes}
  onChange={(e) => setLogParticipantes(e.target.value)}
  placeholder="Separados por comas"
  className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
            className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
            className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="text-[11px] text-neutral-500 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-[11px] bg-brand-600 text-white font-medium px-4 py-1.5 rounded-lg hover:bg-brand-700 transition-all flex items-center gap-1"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" /> Agregar
            </button>
          </div>
        </form>
      )}

      {/* Log entries */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {causa.bitacora.length > 0 ? (
          causa.bitacora.map((entry, idx) => {
            const tipoColors: Record<string, string> = {
              'Entrevista': 'bg-info-100 text-info-700',
              'Evidencia': 'bg-amber-100 text-amber-700',
              'Notificación': 'bg-purple-100 text-purple-700',
              'Mediación': 'bg-success-100 text-success-700',
              'Resolución': 'bg-brand-100 text-brand-700',
              'Otro': 'bg-neutral-100 text-neutral-700',
            };
            return (
              <div key={entry.id} className="p-4 bg-white border border-neutral-200/80 rounded-lg text-left hover:border-neutral-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-neutral-900">{entry.titulo}</h4>
                      <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${tipoColors[entry.tipo] || tipoColors['Otro']}`}>
                        {entry.tipo}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{entry.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(entry.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span>{entry.participantes.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-neutral-400">
            <FileText className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs font-medium">No hay registros en la bitácora</p>
          </div>
        )}
      </div>
    </div>
  );
}
