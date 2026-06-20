/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Causa, EstadoCausa, BitacoraEntry, ChecklistItem, UserRole } from '../types';
import { MAPPED_STATES, FASES_LIST, getFaseForEstado } from '../data';
import { REGLAMENTO_CONDUCTAS, ConductaReglamentada } from '../reglamentoData';
import { 
  FileText, CheckSquare, ListTodo, ClipboardList, Sparkles, 
  Plus, Calendar, Clock, AlertTriangle, Shield, ShieldCheck, Download, 
  Copy, FileSignature, CheckCircle2, RefreshCw, Send, HelpCircle, 
  ArrowRight, Search, BookOpen, Check, Info,
  ChevronDown, ChevronUp, File, Upload, Trash, BookMarked, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, Minimize2
} from 'lucide-react';

const CURRENT_DATE_STR = new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0];
const FULL_ISO_DATE = new Date('2026-05-27T14:50:29Z').toISOString().replace('.000Z', 'Z');

interface InteractiveTimelineProps {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
  currentRole: UserRole;
  privacyMode: boolean;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  isTimelineCollapsed?: boolean;
  setIsTimelineCollapsed?: (collapsed: boolean) => void;
}

function BoldText({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={`b-${part.slice(0, 24)}`} className="font-bold text-neutral-950">{part}</strong>
        ) : (
          <React.Fragment key={`t-${part.slice(0, 24)}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

// Simple custom Markdown-like formatter to render Gemini reports beautifully in Tailwind
function CustomMarkdownRenderer({ text }: { text: string }) {
  if (!text) return <p className="text-neutral-400 italic text-xs">No se ha generado contenido aún.</p>;

  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-xs text-neutral-700 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const lineKey = `${idx}-${trimmed.slice(0, 48)}`;
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={lineKey} className="text-sm font-bold text-neutral-900 mt-4 mb-2 border-b border-neutral-100 pb-1">{trimmed.replace('### ', '')}</h4>;
        }
        if (trimmed.trim().startsWith('## ')) {
          return <h3 key={lineKey} className="text-base font-bold text-neutral-900 mt-5 mb-2 flex items-center gap-2 text-emerald-700">{trimmed.replace('## ', '')}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={lineKey} className="text-lg font-bold text-neutral-950 mt-6 mb-3 border-l-4 border-neutral-900 pl-2">{trimmed.replace('# ', '')}</h2>;
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="flex items-start gap-2 ml-4 my-1">
              <span className="text-brand-600 mt-1 select-none">•</span>
              <span><BoldText text={trimmed.substring(2)} /></span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineKey} className="flex items-start gap-2 ml-4 my-1">
              <span className="font-mono text-brand-700 font-bold">{numMatch[1]}.</span>
              <span><BoldText text={numMatch[2]} /></span>
            </div>
          );
        }

        // Blockquotes / Alerts
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
  onUpdateCausa, 
  currentRole, 
  privacyMode,
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  isTimelineCollapsed = false,
  setIsTimelineCollapsed
}: InteractiveTimelineProps) {
  const [activeTab, setActiveTab] = useState<'proceso' | 'bitacora' | 'asistente_ia'>('proceso');
  
  // AI assistant states
  const [aiSubTab, setAiSubTab] = useState<'auditoria' | 'borradores'>('auditoria');
  const [auditReport, setAuditReport] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  
  // Document drafting states
  const [selectedDocType, setSelectedDocType] = useState<'notificacion_apertura' | 'citacion_entrevista' | 'informe_cierre_indagacion' | 'informe_concluyente'>('notificacion_apertura');
  const [fatherName, setFatherName] = useState<string>('');
  const [draftedDocument, setDraftedDocument] = useState<string>('');
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // New log form states
  const [showLogForm, setShowLogForm] = useState<boolean>(false);
  const [logType, setLogType] = useState<BitacoraEntry['tipo']>('Entrevista');
  const [logTitle, setLogTitle] = useState<string>('');
  const [logDesc, setLogDesc] = useState<string>('');
  const [logParticipantes, setLogParticipantes] = useState<string>('');

  // States for stage-by-stage due process registration
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    recepcion: true,
    investigacion: true,
    resolucion: false,
    impugnacion: false,
    seguimiento: false,
  });
  const [registeringItemId, setRegisteringItemId] = useState<string | null>(null);
  const [regName, setRegName] = useState<string>('');
  const [regObservations, setRegObservations] = useState<string>('');
  const [regFileName, setRegFileName] = useState<string>('');

  // Doctor React: Memorizar filtros pesados para evitar cálculos innecesarios en cada re-render
  const riceCategories = React.useMemo(() => ({
    leves: REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Leve'),
    graves: REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Grave'),
    muyGraves: REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Muy Grave'),
    gravisimas: REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Gravísima'),
  }), []);

  const currentFase = getFaseForEstado(causa.estadoActual);

  // Trigger state change
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value as EstadoCausa;
    onUpdateCausa({
      ...causa,
      estadoActual: newState,
      fechaUltimaActualizacion: CURRENT_DATE_STR
    });
  };

  // Start registering a checklist item
  const handleStartRegister = (item: ChecklistItem) => {
    setRegisteringItemId(item.id);
    setRegName(item.registradoPor || causa.responsable.split(' (')[0]);
    setRegObservations(item.observaciones || '');
    setRegFileName(item.documentoNombre || '');
  };

  // Simulate file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setRegFileName(e.target.files[0].name);
    }
  };

  // Save the custom registration details for a step
  const handleSaveRegistration = (itemId: string) => {
    if (currentRole === 'docente') return;
    
    // Auto-create an entry in the Bitacora when they register a step!
    const targetItem = causa.checklistDebidoProceso.find(it => it.id === itemId);
    const itemLabel = targetItem ? targetItem.label : 'Paso de Debido Proceso';

    const newLog: BitacoraEntry = {
      id: `b_step_${Date.now()}`,
      fecha: FULL_ISO_DATE,
      tipo: 'Notificación',
      titulo: `Registro de Hito: ${itemLabel}`,
      descripcion: `Se ha registrado formalmente la finalización de la etapa/acción "${itemLabel}". Responsable: ${regName || 'Esteban Valenzuela'}. Observaciones: ${regObservations}`,
      participantes: [regName || 'Esteban Valenzuela', privacyMode ? causa.nnaProtectedName : causa.estudianteNombre]
    };

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completado: true,
          fechaCompletado: item.fechaCompletado || CURRENT_DATE_STR,
          registradoPor: regName || 'Esteban Valenzuela',
          observaciones: regObservations,
          documentoNombre: regFileName || undefined,
          documentoUrl: regFileName ? '#' : undefined
        };
      }
      return item;
    });

    onUpdateCausa({
      ...causa,
      checklistDebidoProceso: updatedChecklist,
      bitacora: [newLog, ...causa.bitacora],
      fechaUltimaActualizacion: CURRENT_DATE_STR
    });

    // Reset states
    setRegisteringItemId(null);
    setRegName('');
    setRegObservations('');
    setRegFileName('');
  };

  // Anular/resetear un registro del debido proceso
  const handleResetRegistration = (itemId: string) => {
    if (currentRole === 'docente') return;

    const targetItem = causa.checklistDebidoProceso.find(it => it.id === itemId);
    const itemLabel = targetItem ? targetItem.label : 'Paso de Debido Proceso';

    // Log the invalidation in the Bitacora
    const newLog: BitacoraEntry = {
      id: `b_step_reset_${Date.now()}`,
      fecha: FULL_ISO_DATE,
      tipo: 'Otro',
      titulo: `Invalidador Hito: ${itemLabel}`,
      descripcion: `Se ha anulado e invalidado formalmente el registro del hito "${itemLabel}". Se requiere volver a registrar este hito para la validez legal y resguardo normativo.`,
      participantes: [causa.responsable.split(' (')[0]]
    };

    const updatedChecklist = causa.checklistDebidoProceso.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completado: false,
          fechaCompletado: undefined,
          registradoPor: undefined,
          observaciones: undefined,
          documentoNombre: undefined,
          documentoUrl: undefined
        };
      }
      return item;
    });

    onUpdateCausa({
      ...causa,
      checklistDebidoProceso: updatedChecklist,
      bitacora: [newLog, ...causa.bitacora],
      fechaUltimaActualizacion: CURRENT_DATE_STR
    });
  };

  // Submit a new Bitácora entry
  const handleAddNewLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle || !logDesc) return;

    const partsArray = logParticipantes
      ? logParticipantes.split(',').map(s => s.trim())
      : ['No especificados'];

    const newEntry: BitacoraEntry = {
      id: `b_custom_${Date.now()}`,
      fecha: new Date('2026-05-27T14:50:29Z').toISOString().replace('.000Z', 'Z'),
      tipo: logType,
      titulo: logTitle,
      descripcion: logDesc,
      participantes: partsArray
    };

    const nowStr = new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0];
    onUpdateCausa({
      ...causa,
      bitacora: [newEntry, ...causa.bitacora],
      fechaUltimaActualizacion: nowStr
    });

    // Reset form
    setLogTitle('');
    setLogDesc('');
    setLogParticipantes('');
    setShowLogForm(false);
  };

  // Call API for AI legal audit report
  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditReport('');
    try {
      const response = await fetch('/api/audit-due-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: causa.id,
          studentName: causa.estudianteNombre,
          course: causa.estudianteCurso,
          infractionType: causa.tipoInfraccion,
          isAulaSegura: causa.comprometeAulaSegura,
          checkedItems: causa.checklistDebidoProceso.map(c => ({ label: c.label, completado: c.completado })),
          observations: causa.observaciones
        })
      });
      const data = await response.json();
      if (data.success) {
        setAuditReport(data.report);
      } else {
        setAuditReport(`**Error de Auditoría:** ${data.error}`);
      }
    } catch (e: any) {
      setAuditReport(`**Error al comunicar con el servidor:** ${e.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Call API to draft legal documents - sends FULL case data
  const handleDraftDocument = async () => {
    setIsDrafting(true);
    setDraftedDocument('');
    try {
      const response = await fetch('/api/draft-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: selectedDocType,
          id: causa.id,
          studentName: causa.estudianteNombre,
          course: causa.estudianteCurso,
          fatherName: fatherName || 'Apoderado Legal / Tutor',
          managerName: causa.responsable,
          infractionType: causa.tipoInfraccion,
          observations: causa.observaciones,
          isAulaSegura: causa.comprometeAulaSegura,
          // === FULL CASE DATA FOR AI REVIEW ===
          bitacora: causa.bitacora,
          checklist: causa.checklistDebidoProceso,
          medidasEjecutadas: causa.medidasEjecutadas,
          conductaRiceId: causa.conductaRiceId,
          runEstudiante: causa.runEstudiante,
          nnaProtectedName: causa.nnaProtectedName,
          fechaApertura: causa.fechaApertura,
          estadoActual: causa.estadoActual,
          fechaUltimaActualizacion: causa.fechaUltimaActualizacion
        })
      });
      const data = await response.json();
      if (data.success) {
        setDraftedDocument(data.document);
      } else {
        setDraftedDocument(`**Error de Redacción:** ${data.error}`);
      }
    } catch (e: any) {
      setDraftedDocument(`**Error de conexión:** ${e.message}`);
    } finally {
      setIsDrafting(false);
    }
  };

  // Copy drafted document to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(draftedDocument);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Warnings / Compliance Alerts calculations
  const checkDueProcessBreaches = () => {
    const breaches = [];
    const hasResguardo = causa.checklistDebidoProceso.find(c => c.id === 'chk_inv_1')?.completado;
    const hasAcompanamiento = causa.checklistDebidoProceso.find(c => c.id === 'chk_seg_1')?.completado;

    // Warning: Severe infraction without physical safeguarding measures
    // Only show if the case is in Investigación phase or beyond (not in Recepción)
    const casePhase = getFaseForEstado(causa.estadoActual);
    const isInInvestigacionOrBeyond = casePhase === 'Investigación' || casePhase === 'Resolución' || casePhase === 'Impugnación' || casePhase === 'Seguimiento';
    if ((causa.tipoInfraccion === 'Grave' || causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') && !hasResguardo && isInInvestigacionOrBeyond) {
      breaches.push(`Alerta de Resguardo: El expediente se clasifica como Falta ${causa.tipoInfraccion} pero no se ha decretado el 'Decreto de Apoyos y Medidas de Resguardo' (chk_inv_1) para proteger la integridad del menor según la Circular 482.`);
    }

    // Warning: High severity and no accompaniment
    if ((causa.tipoInfraccion === 'Muy Grave' || causa.tipoInfraccion === 'Gravísima') && !hasAcompanamiento && causa.estadoActual === EstadoCausa.PROCESO_SEGUIMIENTO) {
      breaches.push("Alerta Socioemocional: En estado de Seguimiento para faltas de alta complejidad, se requiere establecer el 'Plan de Acompañamiento' (chk_seg_1) y compromisos formatorios.");
    }

    // Warning: Aula Segura and Mediador contradiction
    if (causa.comprometeAulaSegura && causa.estadoActual === EstadoCausa.MEDIACION_EN_DESARROLLO) {
      breaches.push("Contradicción Procedimental: El caso compromete Aula Segura (Ley 21.128), lo cual es legalmente incompatible con derivaciones o procesos de mediación activa.");
    }

    return breaches;
  };

  const breaches = checkDueProcessBreaches();

  return (
    <div className="card overflow-hidden flex flex-col h-full animate-slide-up shadow-md">
      {/* Title Header area */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono bg-white/20 backdrop-blur-sm text-white font-semibold px-2.5 py-0.5 rounded-lg shrink-0 ring-1 ring-white/20">
                {causa.id}
              </span>
              <span className="text-[10px] font-medium text-blue-100/80 bg-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1 ring-1 ring-white/10">
                <Calendar className="h-3 w-3" aria-hidden="true" /> Apertura: {causa.fechaApertura}
              </span>

              {/* Layout controls */}
              {setIsSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer select-none ${
                    isSidebarCollapsed
                      ? 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                  title={isSidebarCollapsed ? "Mostrar lista de causas" : "Ocultar lista de causas"}
                  aria-label={isSidebarCollapsed ? "Mostrar panel de lista de causas" : "Ocultar panel de lista de causas"}
                >
                  {isSidebarCollapsed ? (
                    <><ChevronRight className="h-3 w-3" aria-hidden="true" /><span className="hidden sm:inline">Lista</span></>
                  ) : (
                    <><ChevronLeft className="h-3 w-3" aria-hidden="true" /><span className="hidden sm:inline">Lista</span></>
                  )}
                </button>
              )}

              {setIsTimelineCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsTimelineCollapsed(true)}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg border bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 flex items-center gap-1 transition-all cursor-pointer select-none"
                  title="Cerrar detalle del expediente"
                  aria-label="Cerrar vista detallada"
                >
                  <Minimize2 className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
              {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre} 
              <span className="ml-2 text-xs font-medium text-blue-100/70 bg-white/10 px-2 py-0.5 rounded-lg align-middle ring-1 ring-white/10">
                {causa.estudianteCurso}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-100/80 font-medium">
              <span>Gravedad: <strong className={`font-semibold ${
                causa.tipoInfraccion === 'Gravísima' ? 'text-red-200' :
                causa.tipoInfraccion === 'Muy Grave' ? 'text-purple-200' :
                causa.tipoInfraccion === 'Grave' ? 'text-amber-200' :
                'text-blue-200'
              }`}>{causa.tipoInfraccion}</strong></span>
              <span className="text-white/30" aria-hidden="true">•</span>
              <span>Responsable: <strong className="text-white font-semibold">{causa.responsable.split(' (')[0]}</strong></span>
            </div>
          </div>

          {/* Quick status modifier for authorized roles */}
          <div className="flex flex-col text-left shrink-0">
            <label htmlFor="estado-select" className="text-[10px] font-semibold text-blue-200/70 mb-1.5 uppercase tracking-[0.06em]">
              Estado del expediente
            </label>
            <select
              id="estado-select"
              value={causa.estadoActual}
              onChange={handleStateChange}
              disabled={currentRole === 'docente'}
              className="text-xs bg-white/95 text-neutral-800 font-medium border border-white/20 rounded-xl py-2 pl-3 pr-8 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
              aria-label="Cambiar estado del expediente"
            >
              <optgroup label="1. Recepción y Apertura">
                <option value={EstadoCausa.DENUNCIA_RECEPCIONADA}>Denuncia Recepcionada</option>
                <option value={EstadoCausa.ANTECEDENTES_REVISION_INICIAL}>Antecedentes en Revisión Inicial</option>
                <option value={EstadoCausa.INICIO_INDAGACION_NOTIFICADO}>Inicio de Indagación Notificado</option>
              </optgroup>
              <optgroup label="2. Estado de Investigación">
                <option value={EstadoCausa.EN_PROCESO_INDAGACION}>En Proceso de Indagación</option>
                <option value={EstadoCausa.RECOPILACION_EVIDENCIAS_CURSO}>Recopilación de Evidencias en Curso</option>
                <option value={EstadoCausa.DERIVADO_A_MEDIACION}>Derivado a Mediación</option>
                <option value={EstadoCausa.MEDIACION_EN_DESARROLLO}>Mediación en Desarrollo</option>
                <option value={EstadoCausa.MEDIACION_CERRADA_ACUERDO}>Mediación Cerrada con Acuerdo</option>
                <option value={EstadoCausa.MEDIACION_FRACASADA_RETORNO}>Mediación Fracasada – Retorno a Indagación</option>
              </optgroup>
              <optgroup label="3. Análisis y Resolución">
                <option value={EstadoCausa.INFORME_CONCLUYENTE_ELABORACION}>Informe Concluyente en Elaboración</option>
                <option value={EstadoCausa.INFORME_CONCLUYENTE_EMITIDO}>Informe Concluyente Emitido</option>
                <option value={EstadoCausa.ENTREVISTA_DISCIPLINARIA_PENDIENTE}>Entrevista Disciplinaria Pendiente</option>
                <option value={EstadoCausa.ENTREVISTA_DISCIPLINARIA_REALIZADA}>Entrevista Disciplinaria Realizada</option>
                <option value={EstadoCausa.RESOLUCION_ELABORACION}>Resolución en Elaboración</option>
                <option value={EstadoCausa.RESOLUCION_FINAL_NOTIFICADA}>Resolución Final Notificada</option>
              </optgroup>
              <optgroup label="4. Estado de Impugnación">
                <option value={EstadoCausa.EN_PLAZO_APELACION}>En Plazo de Apelación</option>
                <option value={EstadoCausa.APELACION_RECEPCIONADA}>Apelación Recepcionada</option>
                <option value={EstadoCausa.APELACION_REVISION_RECTORIA}>Apelación en Revisión por Rectoría</option>
                <option value={EstadoCausa.APELACION_RESUELTA}>Apelación Resuelta</option>
                <option value={EstadoCausa.RESOLUCION_EJECUTORIADA}>Resolución Ejecutoriada</option>
              </optgroup>
              <optgroup label="5. Estado de Seguimiento">
                <option value={EstadoCausa.MEDIDA_EJECUCION}>Medida en Ejecución</option>
                <option value={EstadoCausa.PROCESO_SEGUIMIENTO}>En Proceso de Seguimiento</option>
                <option value={EstadoCausa.SEGUIMIENTO_FINALIZADO}>Seguimiento Finalizado</option>
                <option value={EstadoCausa.CAUSA_CERRADA}>Causa Cerrada</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Due Process Breach Alerts pane */}
      {breaches.length > 0 && (
        <div className="bg-danger-50 border-b border-danger-200 px-4 sm:px-5 py-2.5 text-[11px] text-danger-800">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <AlertTriangle className="h-4 w-4 text-danger-600" aria-hidden="true" />
            <span>RIESGOS PROCEDIMENTALES:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {breaches.map((b) => <li key={b} className="font-medium">{b}</li>)}
          </ul>
        </div>
      )}

      {/* Primary interactive tabs */}
      <div className="flex border-b border-neutral-200/60 bg-neutral-50/80 p-2 gap-2" role="tablist" aria-label="Secciones del expediente">
        <button
          type="button"
          onClick={() => setActiveTab('proceso')}
          role="tab"
          aria-selected={activeTab === 'proceso'}
          className={`flex-1 py-2.5 px-3 text-[12px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'proceso'
              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
              : 'text-neutral-600 hover:text-neutral-800 hover:bg-white border border-transparent hover:border-neutral-200/80'
          }`}
        >
          <ClipboardList className="h-4 w-4 text-brand-500" aria-hidden="true" />
          <span className="hidden sm:inline">Fases y Medidas</span>
          <span className="sm:hidden">Proceso</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bitacora')}
          role="tab"
          aria-selected={activeTab === 'bitacora'}
          className={`flex-1 py-2.5 px-3 text-[12px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'bitacora'
              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
              : 'text-neutral-600 hover:text-neutral-800 hover:bg-white border border-transparent hover:border-neutral-200/80'
          }`}
        >
          <ListTodo className="h-4 w-4 text-brand-500" aria-hidden="true" />
          <span>Bitácora ({causa.bitacora.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('asistente_ia')}
          role="tab"
          aria-selected={activeTab === 'asistente_ia'}
          className={`flex-1 py-2.5 px-3 text-[12px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'asistente_ia'
              ? 'bg-secondary-500 text-white shadow-sm shadow-secondary-500/20'
              : 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50 border border-transparent hover:border-secondary-200/80'
          }`}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Asistente IA</span>
          <span className="sm:hidden">IA</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        
        {/* TAB 1: PROCESO */}
        {activeTab === 'proceso' && (
          <div className="space-y-4">
            {/* 5-phase visual ribbon */}
            <div className="grid grid-cols-5 gap-1.5 text-center bg-neutral-50 p-2 rounded-lg border border-neutral-200" role="list" aria-label="Indicador de fases">
              {FASES_LIST.map((f, i) => {
                const isActive = currentFase === f.name;
                const abbreviations: Record<string, string> = {
                  'Recepción': 'Recepción',
                  'Investigación': 'Investigación',
                  'Resolución': 'Resolución',
                  'Impugnación': 'Impugnación',
                  'Seguimiento': 'Seguimiento'
                };
                return (
                  <div key={f.name} className="flex flex-col items-center" role="listitem">
                    <span className={`text-[8px] font-semibold ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      Fase {i + 1}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                      isActive ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500'
                    }`}>
                      {abbreviations[f.name] || f.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current State */}
            <div className="bg-gradient-to-r from-info-50/80 to-neutral-50 border border-info-200/60 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-left">
              <div className="p-2 bg-info-100/60 rounded-lg text-info-600 shrink-0" aria-hidden="true">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-semibold tracking-wider text-info-600 font-mono">
                    Estado de la causa
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-info-500 animate-pulse" aria-hidden="true" />
                </div>
                <h4 className="text-xs font-bold text-neutral-900 font-sans">
                  {causa.estadoActual}
                </h4>
                <p className="text-[10px] text-neutral-500 leading-snug">
                  {MAPPED_STATES[causa.estadoActual]?.desc || 'Sin descripción técnica registrada.'}
                </p>
              </div>
            </div>

            {/* Clasificación actual + RICE opcional */}
            <div className="bg-white border border-neutral-200 p-3.5 rounded-xl text-left space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" />
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Clasificación:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    causa.tipoInfraccion === 'Gravísima' ? 'bg-red-100 text-red-800' :
                    causa.tipoInfraccion === 'Muy Grave' ? 'bg-purple-100 text-purple-800' :
                    causa.tipoInfraccion === 'Grave' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>{causa.tipoInfraccion}</span>
                  {causa.comprometeAulaSegura && (
                    <span className="text-[9px] font-bold text-danger-600 bg-danger-50 border border-danger-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                      AULA SEGURA
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-neutral-400 italic">
                Clasificación definida al abrir la causa. 
                {causa.conductaRiceId ? ' Vinculada al RICE 2026.' : ''}
              </p>
              
              {/* RICE dropdown expandible */}
              <details className="group mt-0.5">
                <summary className="text-[10px] font-semibold text-brand-600 cursor-pointer hover:text-brand-700 list-none flex items-center gap-1 select-none">
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  <span>Vincular conducta del RICE (opcional)</span>
                  <ChevronDown className="h-3 w-3 ml-auto group-open:rotate-180 transition-transform" aria-hidden="true" />
                </summary>
                <div className="mt-2 space-y-2">
                  <select
                    id="conducta-select"
                    value={causa.conductaRiceId || ""}
                    disabled={currentRole === 'docente'}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const selectedConducta = REGLAMENTO_CONDUCTAS.find(c => c.id === nextId);
                      const nowStr = new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0];
                      
                      onUpdateCausa({
                        ...causa,
                        conductaRiceId: nextId || undefined,
                        medidasEjecutadas: [],
                        tipoInfraccion: selectedConducta ? selectedConducta.gravedad : causa.tipoInfraccion,
                        comprometeAulaSegura: selectedConducta ? selectedConducta.gravedad === 'Gravísima' : causa.comprometeAulaSegura,
                        fechaUltimaActualizacion: nowStr
                      });
                    }}
                    className="w-full text-xs border border-brand-200 rounded-lg p-2 bg-white font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 cursor-pointer"
                    aria-label="Seleccionar conducta del reglamento"
                  >
                    <option value="" className="text-neutral-400 font-normal">-- Sin vincular --</option>
                    <optgroup label="Faltas Leves (Art. 24)" className="text-emerald-700 font-bold bg-white">
                      {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Leve').map(c => (
                        <option key={c.id} value={c.id} className="font-medium text-neutral-800">
                          ({c.articulo} N° {c.numero}) {c.conducta.slice(0, 60)}...
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Faltas Graves (Art. 25)" className="text-amber-700 font-bold bg-white">
                      {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Grave').map(c => (
                        <option key={c.id} value={c.id} className="font-medium text-neutral-800">
                          ({c.articulo} N° {c.numero}) {c.conducta.slice(0, 60)}...
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Faltas Muy Graves (Art. 26)" className="text-purple-700 font-bold bg-white">
                      {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Muy Grave').map(c => (
                        <option key={c.id} value={c.id} className="font-medium text-neutral-800">
                          ({c.articulo} N° {c.numero}) {c.conducta.slice(0, 60)}...
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Faltas Gravísimas / Aula Segura (Art. 27)" className="text-danger-700 font-bold bg-white">
                      {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Gravísima').map(c => (
                        <option key={c.id} value={c.id} className="font-medium text-neutral-800">
                          ({c.articulo} N° {c.numero}) {c.conducta.slice(0, 60)}...
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {/* Medidas Formativas y Disciplinarias si hay conducta vinculada */}
                  {causa.conductaRiceId && (() => {
                    const conducta = REGLAMENTO_CONDUCTAS.find(c => c.id === causa.conductaRiceId);
                    if (!conducta) return null;

                    const toggleMeasure = (type: 'formativa' | 'disciplinaria', measureName: string) => {
                      if (currentRole === 'docente') return;
                      const key = `${type}:${measureName}`;
                      const currentEjecutadas = causa.medidasEjecutadas || [];
                      const isChecked = currentEjecutadas.includes(key);
                      const nowStr = new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0];
                      
                      let nextEjecutadas = [];
                      let nextBitacora = [...causa.bitacora];
                      const logId = `b_medida_${causa.id}_${type}_${encodeURIComponent(measureName)}`;

                      if (isChecked) {
                        nextEjecutadas = currentEjecutadas.filter(k => k !== key);
                        nextBitacora = nextBitacora.filter(entry => entry.id !== logId);
                      } else {
                        nextEjecutadas = [...currentEjecutadas, key];
                        const newEntry: BitacoraEntry = {
                          id: logId,
                          fecha: new Date('2026-05-27T14:50:29Z').toISOString().replace('.000Z', 'Z'),
                          tipo: 'Resolución' as const,
                          titulo: `Ejecución: Medida ${type === 'formativa' ? 'Formativa' : 'Disciplinaria'}`,
                          descripcion: `Se verifica y registra formalmente la ejecución de la medida sancionada por el RICE (${conducta.articulo}): "${measureName}".`,
                          participantes: [conducta.responsable, privacyMode ? causa.nnaProtectedName : causa.estudianteNombre]
                        };
                        nextBitacora = [newEntry, ...nextBitacora];
                      }

                      onUpdateCausa({
                        ...causa,
                        medidasEjecutadas: nextEjecutadas,
                        bitacora: nextBitacora,
                        fechaUltimaActualizacion: nowStr
                      });
                    };

                    return (
                      <div className="space-y-2.5 mt-2 border-t border-neutral-100 pt-2">
                        <div className="bg-neutral-50 border border-neutral-200 p-2 rounded-lg text-[10px] leading-relaxed">
                          <span className="font-semibold text-brand-700 block text-[8px] uppercase tracking-wider">
                            RICE {conducta.articulo} N° {conducta.numero}
                          </span>
                          <p className="mt-0.5 text-neutral-600 truncate">{conducta.conducta}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <span className="block text-[8px] font-semibold text-neutral-400 uppercase tracking-widest">Formativas:</span>
                            {conducta.medidasFormativas.map((m) => {
                              const isChecked = (causa.medidasEjecutadas || []).includes(`formativa:${m}`);
                              return (
                                <button key={`formativa-${m}`} type="button" disabled={currentRole === 'docente'}
                                  onClick={() => toggleMeasure('formativa', m)}
                                  className={`w-full p-1.5 rounded-lg text-left text-[10px] leading-normal border flex items-start gap-1.5 select-none transition-all ${
                                    isChecked ? 'bg-success-50 text-success-800 border-success-200' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                  }`}>
                                  <span className="mt-0.5 shrink-0">
                                    {isChecked ? <span className="h-3 w-3 rounded bg-success-600 text-white flex items-center justify-center text-[7px] font-bold">✓</span>
                                    : <span className="h-3 w-3 rounded border border-neutral-300 bg-white block" />}
                                  </span>
                                  <span>{m}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="space-y-1.5">
                            <span className="block text-[8px] font-semibold text-neutral-400 uppercase tracking-widest">Disciplinarias:</span>
                            {conducta.medidasDisciplinarias.map((m) => {
                              const isChecked = (causa.medidasEjecutadas || []).includes(`disciplinaria:${m}`);
                              return (
                                <button key={`disciplinaria-${m}`} type="button" disabled={currentRole === 'docente'}
                                  onClick={() => toggleMeasure('disciplinaria', m)}
                                  className={`w-full p-1.5 rounded-lg text-left text-[10px] leading-normal border flex items-start gap-1.5 select-none transition-all ${
                                    isChecked ? 'bg-danger-50 text-danger-800 border-danger-200' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                  }`}>
                                  <span className="mt-0.5 shrink-0">
                                    {isChecked ? <span className="h-3 w-3 rounded bg-danger-600 text-white flex items-center justify-center text-[7px] font-bold">✓</span>
                                    : <span className="h-3 w-3 rounded border border-neutral-300 bg-white block" />}
                                  </span>
                                  <span>{m}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </details>
            </div>

            {/* Due Process Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <div>
                  <h3 className="font-sans font-semibold text-xs uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-success-600" aria-hidden="true" /> Registro de hitos procesales
                  </h3>
                  <p className="text-[9px] text-neutral-400 mt-0.5 font-sans leading-tight">
                    Preserve la trazabilidad del debido proceso
                  </p>
                </div>
              </div>

              {/* Accordion of 5 stages */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {[
                  { id: 'recepcion', title: '1. Recepción y Apertura', prefix: 'chk_rec', phaseName: 'Recepción' },
                  { id: 'investigacion', title: '2. Investigación', prefix: 'chk_inv', phaseName: 'Investigación' },
                  { id: 'resolucion', title: '3. Análisis y Resolución', prefix: 'chk_res', phaseName: 'Resolución' },
                  { id: 'impugnacion', title: '4. Impugnación', prefix: 'chk_imp', phaseName: 'Impugnación' },
                  { id: 'seguimiento', title: '5. Seguimiento', prefix: 'chk_seg', phaseName: 'Seguimiento' },
                ].map((section) => {
                  const sectionItems = causa.checklistDebidoProceso.filter(item => item.id.startsWith(section.prefix));
                  const completedCount = sectionItems.filter(item => item.completado).length;
                  const isExpanded = expandedStages[section.id];
                  const isActive = currentFase === section.phaseName;

                  return (
                    <div key={section.id} className={`border rounded-lg overflow-hidden bg-white transition-all ${isActive ? 'ring-1 border-brand-300 ring-brand-300/30 bg-brand-50/5' : 'border-neutral-200'}`}>
                      {/* Section Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedStages({ ...expandedStages, [section.id]: !isExpanded })}
                        className={`w-full flex items-center justify-between p-3 transition-colors text-left font-sans select-none ${
                          isExpanded ? 'bg-neutral-50 border-b border-neutral-200' : 'bg-neutral-50/50 hover:bg-neutral-50'
                        }`}
                        aria-expanded={isExpanded}
                        aria-controls={`section-${section.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-semibold ${completedCount === sectionItems.length ? 'text-success-700' : 'text-neutral-800'}`}>
                            {section.title}
                          </span>
                          <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            completedCount === sectionItems.length
                              ? 'bg-success-100 text-success-700'
                              : completedCount > 0
                              ? 'bg-warning-100 text-warning-700'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            {completedCount}/{sectionItems.length}
                          </span>
                          {isActive && (
                            <span className="text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-brand-600 text-white shrink-0">
                              Activa
                            </span>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" />}
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div id={`section-${section.id}`} className="divide-y divide-neutral-100 p-2 space-y-2">
                          {sectionItems.map((item) => {
                            const isSelected = registeringItemId === item.id;
                            return (
                              <div key={item.id} className={`p-3 rounded-lg border transition-all text-left ${
                                item.completado
                                  ? 'bg-success-50/30 border-success-200'
                                  : isSelected
                                  ? 'bg-info-50/30 border-info-200'
                                  : 'bg-neutral-50/30 border-neutral-200 hover:bg-neutral-50/50'
                              }`}>
                                {/* Item Header */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className="mt-0.5 shrink-0">
                                      {item.completado ? (
                                        <span className="h-4 w-4 rounded-full bg-success-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                      ) : (
                                        <span className="h-4 w-4 rounded-full border border-neutral-300 bg-white block" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-semibold leading-tight text-neutral-900">{item.label}</h4>
                                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{item.descripcion}</p>
                                    </div>
                                  </div>

                                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 shrink-0">
                                    {item.requeridoPor}
                                  </span>
                                </div>

                                {/* Completed Metadata */}
                                {item.completado && (
                                  <div className="mt-2 text-[11px] bg-white rounded border border-success-200/70 p-2.5 space-y-1.5 font-sans">
                                    <div className="flex flex-wrap items-center justify-between gap-1 border-b border-neutral-100 pb-1 text-neutral-400">
                                      <span>Registrado por: <strong className="text-neutral-600">{item.registradoPor || 'Esteban Valenzuela'}</strong></span>
                                      <span className="font-mono">Fecha: {item.fechaCompletado}</span>
                                    </div>
                                    {item.observaciones && (
                                      <p className="text-neutral-600 italic leading-relaxed text-[11px] pl-1.5 border-l-2 border-success-500/50">
                                        "{item.observaciones}"
                                      </p>
                                    )}
                                    {item.documentoNombre && (
                                      <div className="flex items-center justify-between text-[11px] bg-neutral-50 rounded px-2 py-1 border border-neutral-200">
                                        <span className="flex items-center gap-1 text-neutral-600 truncate">
                                          <File className="h-3 w-3 text-info-500 shrink-0" aria-hidden="true" />
                                          <span className="truncate">{item.documentoNombre}</span>
                                        </span>
                                        <button
                                          type="button"
                                          className="text-[9px] text-info-600 font-semibold flex items-center gap-0.5 hover:underline shrink-0 pl-2"
                                          aria-label={`Ver documento ${item.documentoNombre}`}
                                        >
                                          <Download className="h-3 w-3" aria-hidden="true" /> Ver
                                        </button>
                                      </div>
                                    )}

                                    {currentRole !== 'docente' && (
                                      <div className="flex justify-end pt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleResetRegistration(item.id)}
                                          className="text-[10px] text-danger-600 hover:text-danger-700 font-semibold flex items-center gap-1 transition-all"
                                        >
                                          <Trash className="h-3 w-3" aria-hidden="true" /> Anular registro
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Incomplete State */}
                                {!item.completado && (
                                  <div className="mt-2.5">
                                    {!isSelected ? (
                                      currentRole !== 'docente' && (
                                        <button
                                          type="button"
                                          onClick={() => handleStartRegister(item)}
                                          className="text-[11px] bg-white border border-neutral-300 hover:bg-neutral-50 px-2.5 py-1 rounded font-medium text-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                          <Plus className="h-3.5 w-3.5 text-success-600" aria-hidden="true" /> Registrar hito
                                        </button>
                                      )
                                    ) : (
                                      /* Registration Form */
                                      <div className="bg-white rounded border border-info-200 p-3 space-y-3 mt-2 text-left">
                                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                                          <span className="text-[10px] font-semibold text-info-700 uppercase tracking-wide">
                                            Registro oficial
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label htmlFor={`reg-name-${item.id}`} className="block text-[9px] font-semibold text-neutral-400 uppercase">
                                              Responsable:
                                            </label>
                                            <input
                                              id={`reg-name-${item.id}`}
                                              type="text"
                                              className="w-full mt-1 border border-neutral-300 rounded-lg p-1.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                                              value={regName}
                                              onChange={(e) => setRegName(e.target.value)}
                                              aria-label="Nombre del responsable"
                                            />
                                          </div>

                                          <div>
                                            <span id={`reg-file-label-${item.id}`} className="block text-[9px] font-semibold text-neutral-400 uppercase">
                                              Documento de respaldo:
                                            </span>
                                            <div className="relative mt-1 flex items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg py-1.5 px-2 bg-neutral-50/50 hover:bg-neutral-50 transition-all">
                                              <label htmlFor={`reg-file-${item.id}`} className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium cursor-pointer">
                                                <Upload className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                                                {regFileName || 'Seleccionar archivo...'}
                                                <input
                                                  id={`reg-file-${item.id}`}
                                                  type="file"
                                                  onChange={handleFileChange}
                                                  className="sr-only"
                                                  accept=".pdf,.doc,.docx,.jpg,.png"
                                                  aria-labelledby={`reg-file-label-${item.id}`}
                                                />
                                              </label>
                                            </div>
                                          </div>
                                        </div>

                                        <div>
                                          <label htmlFor={`reg-obs-${item.id}`} className="block text-[9px] font-semibold text-neutral-400 uppercase">
                                            Observaciones:
                                          </label>
                                          <textarea
                                            id={`reg-obs-${item.id}`}
                                            rows={2}
                                            className="w-full mt-1 border border-neutral-300 rounded-lg p-1.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                                            value={regObservations}
                                            onChange={(e) => setRegObservations(e.target.value)}
                                            placeholder="Detalle de la actuación procesal..."
                                            aria-label="Observaciones del registro"
                                          />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => setRegisteringItemId(null)}
                                            className="text-[11px] text-neutral-500 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-all"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveRegistration(item.id)}
                                            className="text-[11px] bg-brand-600 text-white font-medium px-4 py-1.5 rounded-lg hover:bg-brand-700 transition-all flex items-center gap-1"
                                          >
                                            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Confirmar registro
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BITÁCORA */}
        {activeTab === 'bitacora' && (
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
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Nuevo registro</span>
                </button>
              )}
            </div>

            {/* New Log Form */}
            {showLogForm && (
              <form onSubmit={handleAddNewLog} className="bg-white border border-brand-200 rounded-lg p-4 space-y-3 text-left animate-slide-up">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h4 className="text-[11px] font-semibold text-neutral-800">Nuevo registro en bitácora</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="log-type" className="block text-[9px] font-semibold text-neutral-400 uppercase mb-1">Tipo</label>
                    <select
                      id="log-type"
                      value={logType}
                      onChange={(e) => setLogType(e.target.value as any)}
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
                      value={logParticipantes}
                      onChange={(e) => setLogParticipantes(e.target.value)}
                      placeholder="Separados por comas"
                      className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="log-title" className="block text-[9px] font-semibold text-neutral-400 uppercase mb-1">Título</label>
                  <input
                    id="log-title"
                    type="text"
                    required
                    value={logTitle}
                    onChange={(e) => setLogTitle(e.target.value)}
                    placeholder="Describa el evento brevemente"
                    className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="log-desc" className="block text-[9px] font-semibold text-neutral-400 uppercase mb-1">Descripción</label>
                  <textarea
                    id="log-desc"
                    required
                    rows={2}
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    placeholder="Relato detallado del hecho procesal..."
                    className="w-full text-xs border border-neutral-300 rounded-lg p-2 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
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
        )}

        {/* TAB 3: ASISTENTE IA */}
        {activeTab === 'asistente_ia' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1.5 bg-neutral-50 p-1 rounded-lg border border-neutral-200" role="tablist" aria-label="Herramientas de IA">
              <button
                type="button"
                onClick={() => setAiSubTab('auditoria')}
                role="tab"
                aria-selected={aiSubTab === 'auditoria'}
                className={`flex-1 py-2 px-3 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  aiSubTab === 'auditoria'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Auditoría legal
              </button>
              <button
                type="button"
                onClick={() => setAiSubTab('borradores')}
                role="tab"
                aria-selected={aiSubTab === 'borradores'}
                className={`flex-1 py-2 px-3 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  aiSubTab === 'borradores'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Redacción documentos
              </button>
            </div>

            {aiSubTab === 'auditoria' && (
              <div className="space-y-3">
                <div className="bg-info-50 border border-info-200 p-3 rounded-lg flex items-start gap-2.5 text-left">
                  <Sparkles className="h-5 w-5 text-info-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-900">Auditoría de debido proceso</h4>
                    <p className="text-[10px] text-neutral-500 leading-relaxed mt-0.5">
                      Analice el cumplimiento normativo del expediente según la Circular 482, Ley 21809 y Ley Aula Segura. El asistente identificará brechas y emitirá recomendaciones.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isAuditing ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Analizando expediente...</>
                  ) : (
                    <><FileSignature className="h-4 w-4" aria-hidden="true" /> Ejecutar auditoría legal</>
                  )}
                </button>

                {auditReport && (
                  <div className="bg-white border border-neutral-200 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    <CustomMarkdownRenderer text={auditReport} />
                  </div>
                )}
              </div>
            )}

            {aiSubTab === 'borradores' && (
              <div className="space-y-3">
                <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg flex items-start gap-2.5 text-left">
                  <FileText className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-900">Redacción de documentos oficiales</h4>
                    <p className="text-[10px] text-neutral-500 leading-relaxed mt-0.5">
                      Genere borradores legales listos para notificar a apoderados y autoridades, cumpliendo con la formalidad de la Circular 482.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="doc-type" className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Tipo de documento
                  </label>
                  <select
                    id="doc-type"
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value as any)}
                    className="w-full text-xs border border-neutral-300 rounded-lg p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  >
                    <option value="notificacion_apertura">Notificación de apertura de investigación</option>
                    <option value="citacion_entrevista">Citación a entrevista de descargos</option>
                    <option value="informe_cierre_indagacion">Informe de cierre de indagación</option>
                    <option value="informe_concluyente">Informe concluyente y resolución final</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="father-name" className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Nombre del apoderado/tutor
                  </label>
                  <input
                    id="father-name"
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Ej. Juan Pérez González"
                    className="w-full mt-1 text-xs border border-neutral-300 rounded-lg p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDraftDocument}
                  disabled={isDrafting}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isDrafting ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Redactando documento...</>
                  ) : (
                    <><FileSignature className="h-4 w-4" aria-hidden="true" /> Generar borrador legal</>
                  )}
                </button>

                {draftedDocument && (
                  <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 max-h-[500px] overflow-y-auto">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCopyToClipboard}
                        className="text-[10px] text-brand-600 font-semibold flex items-center gap-1 hover:text-brand-700 transition-all cursor-pointer"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        {copyFeedback ? '¡Copiado!' : 'Copiar al portapapeles'}
                      </button>
                    </div>
                    <CustomMarkdownRenderer text={draftedDocument} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}