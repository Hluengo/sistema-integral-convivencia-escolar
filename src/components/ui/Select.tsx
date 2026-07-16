/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  id?: string;
}

let selectIdCounter = 0;

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  error,
  disabled,
  className = '',
  icon,
  id: externalId,
}: SelectProps) {
  const generatedId = externalId ?? `select-${++selectIdCounter}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={generatedId}
          className="font-semibold text-neutral-700 text-xs uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-neutral-400">
            {icon}
          </div>
        )}
        <select
          id={generatedId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-neutral-900 outline-none transition-all duration-150 focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
              : 'border-neutral-200'
          } ${icon ? 'pl-10' : ''} ${!value ? 'text-neutral-400' : ''} ${className}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
