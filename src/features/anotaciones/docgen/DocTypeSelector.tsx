/** @license SPDX-License-Identifier: Apache-2.0 */

import { Lock, FileText, AlertTriangle, Users } from "lucide-react";

interface DocTypeSelectorProps {
  docType: string;
  onDocTypeChange: (type: string) => void;
  hasTenOrMore: boolean;
  negativeCount: number;
}

const DOC_TYPES = [
  {
    id: "amonestacion",
    label: "Amonestación",
    icon: FileText,
    description: "Carta de amonestación por anotaciones negativas",
  },
  {
    id: "compromiso_conductual",
    label: "Compromiso Conductual",
    icon: Users,
    description: "Carta de compromiso conductual (requiere 10+ anotaciones)",
  },
  {
    id: "derivacion",
    label: "Derivación",
    icon: AlertTriangle,
    description: "Derivación a Inspectoría / Convivencia Escolar",
  },
] as const;

export default function DocTypeSelector({
  docType,
  onDocTypeChange,
  hasTenOrMore,
  negativeCount,
}: DocTypeSelectorProps) {
  const isEnabled = (id: string) => {
    if (id === "compromiso_conductual") {
      return hasTenOrMore;
    }
    return true;
  };

  return (
    <fieldset className="space-y-3">
      <legend className="block font-medium text-neutral-700 text-sm">
        Tipo de Documento
      </legend>
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
              className={`relative rounded-xl border p-3 text-left transition-colors ${
                isActive
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-200"
                  : "border-neutral-200 bg-slate-50/70 hover:border-neutral-300"
              }
                ${!enabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
              `}
            >
              <span className="absolute top-2 right-2">
                {!enabled ? (
                  <Lock className="h-3.5 w-3.5 text-neutral-400" />
                ) : isActive ? (
                  <span className="rounded bg-brand-600 px-1.5 py-0.5 font-bold text-white text-[10px]">
                    Activo
                  </span>
                ) : null}
              </span>
              <Icon
                className={`mb-1 h-5 w-5 ${isActive ? "text-brand-700" : "text-neutral-500"}`}
              />
              <span
                className={`block font-bold text-xs ${isActive ? "text-brand-900" : "text-neutral-800"}`}
              >
                {label}
              </span>
              <span className="mt-0.5 block text-neutral-500 text-[11px] leading-tight">
                {description}
              </span>
              {!enabled && id === "compromiso_conductual" && (
                <span className="mt-1 block font-semibold text-grave-600 text-xs">
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
