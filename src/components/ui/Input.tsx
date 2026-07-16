/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  id?: string;
}

let inputIdCounter = 0;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, id: externalId, className = '', ...props }, ref) => {
    const generatedId = externalId ?? `input-${++inputIdCounter}`;
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
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={generatedId}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all duration-150 placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-neutral-200'
            } ${icon ? 'pl-10' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        {helperText && !error && <p className="text-neutral-400 text-xs">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
