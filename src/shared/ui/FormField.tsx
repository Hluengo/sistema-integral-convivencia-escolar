/** @license SPDX-License-Identifier: Apache-2.0 */

import type { ReactNode } from "react";

interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  labelAction?: ReactNode;
  children: ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  hint,
  error,
  className = "",
  labelAction,
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {labelAction ? (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={htmlFor}
            className="block font-semibold text-neutral-700 text-sm"
          >
            {label}
          </label>
          {labelAction}
        </div>
      ) : (
        <label
          htmlFor={htmlFor}
          className="block font-semibold text-neutral-700 text-sm"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="text-gravisima-600 text-xs"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-neutral-500 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
