import React from 'react';
import { AlertTriangle, Sparkles, Shield, Lock } from 'lucide-react';

type DocType = 'amonestacion' | 'derivacion' | 'compromiso_conductual';

interface DocTypeSelectorProps {
  docType: DocType;
  onDocTypeChange: (type: DocType) => void;
  currentStep?: number;
  hasTenOrMore: boolean;
  negativeCount: number;
}

const DOC_OPTIONS = [
  {
    type: 'amonestacion' as DocType,
    label: 'Carta de Amonestación Escrita',
    description: 'Fase 2 de la disciplina correctiva escolar.',
    icon: AlertTriangle,
    requiredStep: 2,
  },
  {
    type: 'compromiso_conductual' as DocType,
    label: 'Compromiso Conductual RICE 2026',
    description: 'Habilitado automáticamente para ≥ 10 anotaciones o etapa 3.',
    icon: Sparkles,
    requiredStep: 3,
    showDynamicLock: true,
  },
  {
    type: 'derivacion' as DocType,
    label: 'Derivación Interna Convivencia',
    description: 'Derivación al equipo psicosocial o psicólogo de ciclo.',
    icon: Shield,
    requiredStep: 4,
  },
];

export default function DocTypeSelector({
  docType,
  onDocTypeChange,
  currentStep,
  hasTenOrMore,
  negativeCount,
}: DocTypeSelectorProps) {
  return (
    <div>
      <label htmlFor="doc-type-group" className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
        1. Selección de Documento Institucional
      </label>
      <div id="doc-type-group" className="grid grid-cols-1 gap-2">
        {DOC_OPTIONS.map(opt => {
          const isLocked = currentStep !== undefined && currentStep < opt.requiredStep;
          const isSelected = docType === opt.type;
          const showRequired = opt.showDynamicLock && hasTenOrMore && !isLocked;

          return (
            <button
              key={opt.type}
              onClick={() => onDocTypeChange(opt.type)}
              type="button"
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600'
                  : opt.showDynamicLock && hasTenOrMore
                    ? 'border-amber-400 bg-amber-50/30 hover:bg-amber-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
              } ${isLocked ? 'opacity-70 bg-slate-50/50' : ''}`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : opt.showDynamicLock && hasTenOrMore
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isLocked ? (
                  <Lock className="w-4 h-4 text-slate-400" />
                ) : (
                  <opt.icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                    {opt.label}
                    {isLocked && (
                      <span className="text-[8px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-bold uppercase">
                        Bloqueado
                      </span>
                    )}
                  </span>
                  {showRequired && (
                    <span className="text-[8px] uppercase tracking-wider bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded shrink-0 animate-bounce">
                      REQUERIDO
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">{opt.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
