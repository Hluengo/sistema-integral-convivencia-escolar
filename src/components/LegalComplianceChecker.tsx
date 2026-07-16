/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Panel de Cumplimiento Legal - Circular 482 / Ley 21809
 */

import type React from 'react';
import { useMemo } from 'react';
import type { Causa } from '../types';
import { 
  verificarConformidadLegal, 
  generarResumenConformidad,
  verificarPlazoInvestigacion,
  verificarPlazoSuspension,
  verificarPlazoNotificacionSuperintendencia,
  type NivelConformidad
} from '../services/legalCompliance.service';
import { 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
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
    <div className={`rounded-lg border p-3 ${config.border} ${config.bg}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={`font-medium text-sm ${config.color}`}>{titulo}</span>
        </div>
        <span className="text-neutral-500 text-xs">{norma}</span>
      </div>
      <p className={`text-xs ${config.color} font-medium`}>{resultado.mensaje}</p>
      {resultado.diasRestantes !== null && resultado.diasRestantes > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-neutral-200">
            <div 
              className={`h-2 rounded-full ${
                resultado.diasRestantes <= 3 ? 'bg-red-500' : 
                resultado.diasRestantes <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (resultado.diasRestantes / 60) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-neutral-600 text-xs">
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
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${nivelConfigResumen.border} ${nivelConfigResumen.bg}`}>
        {nivelConfigResumen.icon}
        <span className={`font-medium text-xs ${nivelConfigResumen.color}`}>
          Cumplimiento: {resumen.porcentajeCumplimiento}%
        </span>
        {resumen.incumplimientos > 0 && (
          <span className="font-medium text-red-600 text-xs">
            • {resumen.incumplimientos} incumplimiento{resumen.incumplimientos > 1 ? 's' : ''}
          </span>
        )}
        {resumen.alertas > 0 && (
          <span className="font-medium text-amber-600 text-xs">
            • {resumen.alertas} alerta{resumen.alertas > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen General */}
      <div className={`rounded-xl border p-4 ${nivelConfigResumen.border} ${nivelConfigResumen.bg}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${nivelConfigResumen.color}`} />
            <h3 className={`font-bold text-sm ${nivelConfigResumen.color}`}>
              Estado de Cumplimiento Legal
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-2xl ${nivelConfigResumen.color}`}>
              {resumen.porcentajeCumplimiento}%
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-white/50 p-2">
            <div className="font-bold text-emerald-600 text-lg">{resumen.conformes}</div>
            <div className="text-emerald-700 text-xs">Conformes</div>
          </div>
          <div className="rounded-lg bg-white/50 p-2">
            <div className="font-bold text-amber-600 text-lg">{resumen.alertas}</div>
            <div className="text-amber-700 text-xs">Alertas</div>
          </div>
          <div className="rounded-lg bg-white/50 p-2">
            <div className="font-bold text-lg text-red-600">{resumen.incumplimientos}</div>
            <div className="text-red-700 text-xs">Incumplimientos</div>
          </div>
        </div>
      </div>

      {/* Plazos Críticos */}
      <div className="space-y-2">
        <h4 className="font-bold text-neutral-500 text-xs uppercase tracking-wide">Plazos Legales</h4>
        
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
          <h4 className="font-bold text-neutral-500 text-xs uppercase tracking-wide">
            Observaciones de Cumplimiento
          </h4>
          <div className="space-y-2">
            {items.map((item) => {
              const config = nivelConfig[item.nivel];
              return (
                <div 
                  key={item.id}
                  className={`rounded-lg border p-3 ${config.border} ${config.bg}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className={`font-bold text-xs ${config.color}`}>
                        {item.titulo}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {item.norma}
                    </span>
                  </div>
                  <p className={`text-xs ${config.color} mb-1`}>{item.descripcion}</p>
                  {item.accionRequerida && (
                    <p className="text-neutral-600 text-xs italic">
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
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-neutral-500" />
          <span className="font-medium text-neutral-700 text-xs">Referencia Legal</span>
        </div>
        <div className="space-y-1 text-neutral-600 text-xs">
          <p>• Circular N°482: Reglamentos Internos (2018)</p>
          <p>• Ley N°21809: Convivencia y Bienestar (2026)</p>
          <p>• Ley N°21128: Aula Segura</p>
        </div>
      </div>
    </div>
  );
}
