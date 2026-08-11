/** @license SPDX-License-Identifier: Apache-2.0 */

import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  hint,
  error,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block font-semibold text-neutral-600 text-xs uppercase">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-gravisima-600 text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-neutral-500 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
