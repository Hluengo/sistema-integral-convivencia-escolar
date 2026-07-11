/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Panel de Cumplimiento Legal - Circular 482 / Ley 21809
 */

import React, { useMemo } from 'react';
import { Causa } from '../types';
import { 
  verificarConformidadLegal, 
  generarResumenConformidad,
  verificarPlazoInvestigacion,
  verificarPlazoSuspension,
  verificarPlazoNotificacionSuperintendencia,
  NivelConformidad
} from '../lib/legalCompliance';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  FileText,
  AlertCircle,
  Info
} from 'lucide-react';

interface LegalComplianceCheckerProps {
  causa: Causa;
  compact?: boolean;
}

const nivelConfig: Record<NivelConformidad, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  conforme: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle className="h-4 w-4 text-emerald-600" />
  },
  alerta: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />
  },
  incumplimiento: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <AlertCircle className="h-4 w-4 text-red-600" />
  }
};

function PlazoCard({ 
  titulo, 
  resultado, 
  norma 
}: { 
  titulo: string; 
  resultado: ReturnType<typeof verificarPlazoInvestigacion>; 
  norma: string;
}) {
  const config = nivelConfig[resultado.estado === 'vencido' ? 'incumplimiento' : resultado.estado === 'alerta' ? 'alerta' : 'conforme'];

  return (
    <div className={`p-3 rounded-lg border ${config.border} ${config.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={`text-sm font-medium ${config.color}`}>{titulo}</span>
        </div>
        <span className="text-xs text-neutral-500">{norma}</span>
      </div>
      <p className={`text-xs ${config.color} font-medium`}>{resultado.mensaje}</p>
      {resultado.diasRestantes !== null && resultado.diasRestantes > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-neutral-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                resultado.diasRestantes <= 3 ? 'bg-red-500' : 
                resultado.diasRestantes <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (resultado.diasRestantes / 60) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-neutral-600 font-mono">
            {resultado.diasRestantes}d
          </span>
        </div>
      )}
    </div>
  );
}

export default function LegalComplianceChecker({ causa, compact = false }: LegalComplianceCheckerProps) {
  const items = useMemo(() => verificarConformidadLegal(causa), [causa]);
  const resumen = useMemo(() => generarResumenConformidad(causa), [causa]);
  
  const plazoInvestigacion = useMemo(() => verificarPlazoInvestigacion(causa), [causa]);
  const plazoSuspension = useMemo(() => verificarPlazoSuspension(causa), [causa]);
  const plazoNotificacion = useMemo(() => verificarPlazoNotificacionSuperintendencia(causa), [causa]);

  const nivelConfigResumen = nivelConfig[resumen.nivelGeneral];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${nivelConfigResumen.border} ${nivelConfigResumen.bg}`}>
        {nivelConfigResumen.icon}
        <span className={`text-xs font-medium ${nivelConfigResumen.color}`}>
          Cumplimiento: {resumen.porcentajeCumplimiento}%
        </span>
        {resumen.incumplimientos > 0 && (
          <span className="text-xs text-red-600 font-medium">
            • {resumen.incumplimientos} incumplimiento{resumen.incumplimientos > 1 ? 's' : ''}
          </span>
        )}
        {resumen.alertas > 0 && (
          <span className="text-xs text-amber-600 font-medium">
            • {resumen.alertas} alerta{resumen.alertas > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen General */}
      <div className={`p-4 rounded-xl border ${nivelConfigResumen.border} ${nivelConfigResumen.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${nivelConfigResumen.color}`} />
            <h3 className={`text-sm font-bold ${nivelConfigResumen.color}`}>
              Estado de Cumplimiento Legal
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${nivelConfigResumen.color}`}>
              {resumen.porcentajeCumplimiento}%
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/50 rounded-lg p-2">
            <div className="text-lg font-bold text-emerald-600">{resumen.conformes}</div>
            <div className="text-xs text-emerald-700">Conformes</div>
          </div>
          <div className="bg-white/50 rounded-lg p-2">
            <div className="text-lg font-bold text-amber-600">{resumen.alertas}</div>
            <div className="text-xs text-amber-700">Alertas</div>
          </div>
          <div className="bg-white/50 rounded-lg p-2">
            <div className="text-lg font-bold text-red-600">{resumen.incumplimientos}</div>
            <div className="text-xs text-red-700">Incumplimientos</div>
          </div>
        </div>
      </div>

      {/* Plazos Críticos */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Plazos Legales</h4>
        
        <PlazoCard 
          titulo="Investigación"
          resultado={plazoInvestigacion}
          norma="Ley 21809, Art. 16E.g"
        />
        
        {causa.fechaInicioSuspension && (
          <PlazoCard 
            titulo="Suspensión"
            resultado={plazoSuspension}
            norma="Ley 21809, Art. 16E.j"
          />
        )}
        
        {causa.requiereNotificacionSuperintendencia && (
          <PlazoCard 
            titulo="Notificación Superintendencia"
            resultado={plazoNotificacion}
            norma="Ley 21809, Art. 16E"
          />
        )}
      </div>

      {/* Items de Conformidad */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
            Observaciones de Cumplimiento
          </h4>
          <div className="space-y-2">
            {items.map((item) => {
              const config = nivelConfig[item.nivel];
              return (
                <div 
                  key={item.id}
                  className={`p-3 rounded-lg border ${config.border} ${config.bg}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className={`text-xs font-bold ${config.color}`}>
                        {item.titulo}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {item.norma}
                    </span>
                  </div>
                  <p className={`text-xs ${config.color} mb-1`}>{item.descripcion}</p>
                  {item.accionRequerida && (
                    <p className="text-xs text-neutral-600 italic">
                      Acción: {item.accionRequerida}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Información Legal */}
      <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-neutral-500" />
          <span className="text-xs font-medium text-neutral-700">Referencia Legal</span>
        </div>
        <div className="text-xs text-neutral-600 space-y-1">
          <p>• Circular N°482: Reglamentos Internos (2018)</p>
          <p>• Ley N°21809: Convivencia y Bienestar (2026)</p>
          <p>• Ley N°21128: Aula Segura</p>
        </div>
      </div>
    </div>
  );
}
