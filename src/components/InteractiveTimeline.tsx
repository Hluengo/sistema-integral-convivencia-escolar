/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useMemo } from 'react';
import { Causa, EstadoCausa, UserRole } from '../types';
import { getFaseForEstado } from '../data';
import { AlertTriangle, Clock, Shield, FileText } from 'lucide-react';
import { 
  verificarPlazoInvestigacion, 
  verificarPlazoSuspension, 
  verificarPlazoNotificacionSuperintendencia,
  verificarConformidadLegal,
  generarResumenConformidad,
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS
} from '../lib/legalCompliance';
import TimelineHeader from './InteractiveTimeline/TimelineHeader';
import TimelineTabs from './InteractiveTimeline/TimelineTabs';
import TimelineTabPanels from './InteractiveTimeline/TimelineTabPanels';
import { useTimelineController } from '../hooks/useTimelineController';
import { TimelineProvider } from '../context/TimelineContext';
import { useAppContext } from '../context/AppContext';
import { BoldText } from '../lib/markdownUtils';
import ConfirmDialog from './ConfirmDialog';

const EditCausaModal = lazy(() => import('./EditCausaModal'));

interface InteractiveTimelineProps {
  causa: Causa;
  onUpdateCausa?: (updated: Causa) => void;
  onDeleteCausa?: (id: string) => void;
  currentRole?: UserRole;
  privacyMode?: boolean;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  isTimelineCollapsed?: boolean;
  setIsTimelineCollapsed?: (collapsed: boolean) => void;
}

function CustomMarkdownRenderer({ text }: { text: string }) {
  if (!text) return <p className="text-neutral-400 italic text-xs">No se ha generado contenido aún.</p>;

  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-xs text-neutral-700 leading-relaxed font-sans">
      {lines.map((line) => {
        const trimmed = line.trim();
        const lineKey = `line-${trimmed.length}-${trimmed.charCodeAt(0) || 0}`;

        if (trimmed.startsWith('### ')) {
          return <h4 key={lineKey} className="text-sm font-bold text-neutral-900 mt-4 mb-2 border-b border-neutral-100 pb-1">{trimmed.replace('### ', '')}</h4>;
        }
        if (trimmed.trim().startsWith('## ')) {
          return <h3 key={lineKey} className="text-base font-bold text-neutral-900 mt-5 mb-2 flex items-center gap-2 text-emerald-700">{trimmed.replace('## ', '')}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={lineKey} className="text-lg font-bold text-neutral-950 mt-6 mb-3 border-l-4 border-neutral-900 pl-2">{trimmed.replace('# ', '')}</h2>;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="flex items-start gap-2 ml-4 my-1">
              <span className="text-brand-600 mt-1 select-none">•</span>
              <span><BoldText text={trimmed.substring(2)} /></span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineKey} className="flex items-start gap-2 ml-4 my-1">
              <span className="font-mono text-brand-700 font-bold">{numMatch[1]}.</span>
              <span><BoldText text={numMatch[2]} /></span>
            </div>
          );
        }

        if (trimmed.startsWith('> ')) {
          return (
            <div key={lineKey} className="bg-amber-50 border-l-4 border-amber-500 p-2.5 my-2 rounded-r-md text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="italic"><BoldText text={trimmed.substring(2)} /></p>
            </div>
          );
        }

        if (trimmed === '') {
          return <div key={lineKey} className="h-2" />;
        }

        return <p key={lineKey}><BoldText text={trimmed} /></p>;
      })}
    </div>
  );
}

export default function InteractiveTimeline({ 
  causa, 
  onUpdateCausa: propOnUpdate, 
  onDeleteCausa: propOnDelete,
  currentRole: propRole, 
  privacyMode: propPrivacy,
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  isTimelineCollapsed = false,
  setIsTimelineCollapsed
}: InteractiveTimelineProps) {
  const ctx = useAppContext();
  const onUpdateCausa = propOnUpdate ?? ctx.handleUpdateCausa;
  const onDeleteCausa = propOnDelete ?? ctx.handleDeleteCausa;
  const currentRole = propRole ?? ctx.currentRole;
  const privacyMode = propPrivacy ?? ctx.privacyMode;
  const [activeTab, setActiveTab] = useState<'proceso' | 'bitacora' | 'asistente_ia'>('proceso');
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const timelineValue = useTimelineController({ causa, onUpdateCausa, currentRole, privacyMode });

  const currentFase = getFaseForEstado(causa.estadoActual);

  const breaches = useMemo(() => {
    const result = [];
    const hasResguardo = causa.checklistDebidoProceso.find(c => c.id === 'chk_inv_2')?.completado;
    const hasAcompanamiento = causa.checklistDebidoProceso.find(c => c.id === 'chk_seg_1')?.completado;

    const casePhase = getFaseForEstado(causa.estadoActual);
    const isInInvestigacionOrBeyond = casePhase === 'Investigación' || casePhase === 'Resolución' || casePhase === 'Apelación' || casePhase === 'Seguimiento';
    if ((causa.tipoInfraccion === 'Grave' || causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') && !hasResguardo && isInInvestigacionOrBeyond) {
      result.push(`Alerta de Resguardo: El expediente se clasifica como Falta ${causa.tipoInfraccion} pero no se ha decretado el 'Decreto de Apoyos y Medidas de Resguardo' (chk_inv_2) para proteger la integridad del menor según la Circular 482.`);
    }

    if ((causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') && !hasAcompanamiento && causa.estadoActual === EstadoCausa.PROCESO_SEGUIMIENTO) {
      result.push("Alerta Socioemocional: En estado de Seguimiento para faltas de alta complejidad, se requiere establecer el 'Plan de Acompañamiento' (chk_seg_1) y compromisos formatorios.");
    }

    if (causa.comprometeAulaSegura && causa.estadoActual === EstadoCausa.MEDIACION_EN_DESARROLLO) {
      result.push("Contradicción Procedimental: El caso compromete Aula Segura (Ley 21.128), lo cual es legalmente incompatible con derivaciones o procesos de mediación activa.");
    }

    // === VERIFICACIONES LEGALES OBLIGATORIAS (Ley 21809) ===
    
    // Verificar plazo de investigación
    const plazoInvestigacion = verificarPlazoInvestigacion(causa);
    if (plazoInvestigacion.estado === 'vencido') {
      result.push(`INCUMPLIMIENTO LEGAL: ${plazoInvestigacion.mensaje}. Máximo permitido: ${MAX_PLAZO_INVESTIGACION_DIAS} días hábiles (Ley 21809, Art. 16E, letra g).`);
    } else if (plazoInvestigacion.estado === 'alerta') {
      result.push(`ALERTA LEGAL: ${plazoInvestigacion.mensaje}`);
    }

    // Verificar plazo de suspensión
    const plazoSuspension = verificarPlazoSuspension(causa);
    if (plazoSuspension.estado === 'vencido') {
      result.push(`INCUMPLIMIENTO LEGAL: ${plazoSuspension.mensaje}. Máximo permitido: ${MAX_PLAZO_SUSPENSION_DIAS} días hábiles (Ley 21809, Art. 16E, letra j).`);
    } else if (plazoSuspension.estado === 'alerta') {
      result.push(`ALERTA LEGAL: ${plazoSuspension.mensaje}`);
    }

    // Verificar notificación a Superintendencia
    const plazoNotificacion = verificarPlazoNotificacionSuperintendencia(causa);
    if (plazoNotificacion.estado === 'vencido') {
      result.push(`INCUMPLIMIENTO LEGAL: ${plazoNotificacion.mensaje}. Plazo: ${MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS} días hábiles (Ley 21809, Art. 16E).`);
    } else if (plazoNotificacion.estado === 'alerta') {
      result.push(`ALERTA LEGAL: ${plazoNotificacion.mensaje}`);
    }

    // Verificar canal confidencial incompleto
    if (causa.esDenunciaConfidencial && !causa.identidadReservada) {
      result.push("ALERTA LEGAL: La denuncia está marcada como confidencial pero no se ha reservado la identidad del denunciante (Ley 21809, Art. 16E, letra e).");
    }

    // Verificar monitoreo pedagógico en suspensión
    if (causa.fechaInicioSuspension && !causa.monitoreoPedagogico) {
      result.push("ALERTA LEGAL: La suspensión requiere monitoreo pedagógico obligatorio (Ley 21809, Art. 16E, letra j).");
    }

    return result;
  }, [causa]);

  return (
    <TimelineProvider value={timelineValue}>
      <div className="card overflow-hidden flex flex-col h-full animate-flash shadow-md">
          <TimelineHeader
            causa={causa}
            currentRole={currentRole}
            privacyMode={privacyMode}
            onEditClick={() => setShowEdit(true)}
            onDeleteClick={() => setShowConfirmDelete(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isTimelineCollapsed={isTimelineCollapsed}
            setIsTimelineCollapsed={setIsTimelineCollapsed}
            breaches={breaches}
          />

          <ConfirmDialog
            open={showConfirmDelete}
            title="Eliminar expediente"
            description={`¿Eliminar el expediente ${causa.id} de forma permanente? Esta acción no se puede deshacer.`}
            onConfirm={() => {
              onDeleteCausa(causa.id);
              setShowConfirmDelete(false);
            }}
            onCancel={() => setShowConfirmDelete(false)}
          />

          {showEdit && (
            <Suspense fallback={null}>
              <EditCausaModal
                causa={causa}
                onClose={() => setShowEdit(false)}
                onSave={(updated) => {
                  onUpdateCausa(updated);
                  setShowEdit(false);
                }}
                onDelete={(id) => {
                  onDeleteCausa(id);
                  setShowEdit(false);
                }}
              />
            </Suspense>
          )}

        <TimelineTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          bitacoraCount={causa.bitacora.length}
        />

        <TimelineTabPanels
          activeTab={activeTab}
          causa={causa}
          currentFase={currentFase}
          CustomMarkdownRenderer={CustomMarkdownRenderer}
          onUpdateCausa={onUpdateCausa}
        />
      </div>
    </TimelineProvider>
  );
}
