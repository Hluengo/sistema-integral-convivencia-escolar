/** @license SPDX-License-Identifier: Apache-2.0 */

import { Lock, FileText, AlertTriangle, Users } from 'lucide-react';

interface DocTypeSelectorProps {
  docType: string;
  onDocTypeChange: (type: string) => void;
  hasTenOrMore: boolean;
  negativeCount: number;
}

const DOC_TYPES = [
  {
    id: 'amonestacion',
    label: 'Amonestación',
    icon: FileText,
    description: 'Carta de amonestación por anotaciones negativas',
  },
  {
    id: 'compromiso_conductual',
    label: 'Compromiso Conductual',
    icon: Users,
    description: 'Carta de compromiso conductual (requiere 10+ anotaciones)',
  },
  {
    id: 'derivacion',
    label: 'Derivación',
    icon: AlertTriangle,
    description: 'Derivación a Inspectoría / Convivencia Escolar',
  },
] as const;

export default function DocTypeSelector({
  docType,
  onDocTypeChange,
  hasTenOrMore,
  negativeCount,
}: DocTypeSelectorProps) {
  const isEnabled = (id: string) => {
    if (id === 'compromiso_conductual') { return hasTenOrMore; }
    return true;
  };

  return (
    <fieldset className="space-y-3">
      <legend className="block font-medium text-neutral-700 text-sm">Tipo de Documento</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DOC_TYPES.map(({ id, label, icon: Icon, description }) => {
          const enabled = isEnabled(id);
          const isActive = docType === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => enabled && onDocTypeChange(id)}
              disabled={!enabled}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                  isActive
                    ? 'border-brand-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }
                ${!enabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              {!enabled && (
                <div className="absolute top-2 right-2 text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
              )}
              <Icon className={`h-8 w-8 ${isActive ? 'text-blue-600' : 'text-neutral-500'}`} />
              <div className="text-center">
                <span
                  className={`block font-semibold text-sm ${isActive ? 'text-blue-700' : 'text-neutral-800'}`}
                >
                  {label}
                </span>
                <span className="mt-1 block text-neutral-500 text-xs leading-tight">
                  {description}
                </span>
              </div>
              {!enabled && id === 'compromiso_conductual' && (
                <span className="font-medium text-amber-600 text-xs">
                  Faltan {10 - negativeCount} anotaciones
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
