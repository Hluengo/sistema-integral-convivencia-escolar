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
    if (id === 'compromiso_conductual') return hasTenOrMore;
    return true;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Tipo de Documento
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DOC_TYPES.map(({ id, label, icon: Icon, description }) => {
          const enabled = isEnabled(id);
          const isActive = docType === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => enabled && onDocTypeChange(id)}
              disabled={!enabled}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-left transition-all
                ${isActive
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${!enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {!enabled && (
                <div className="absolute top-2 right-2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
              )}
              <Icon className={`w-8 h-8 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <div className="text-center">
                <span className={`block text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                  {label}
                </span>
                <span className="block text-xs text-gray-500 mt-1 leading-tight">
                  {description}
                </span>
              </div>
              {!enabled && id === 'compromiso_conductual' && (
                <span className="text-xs text-amber-600 font-medium">
                  Faltan {10 - negativeCount} anotaciones
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
