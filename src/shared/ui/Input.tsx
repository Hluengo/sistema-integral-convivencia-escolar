/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || props['aria-invalid']}
      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 ${
        invalid
          ? 'border-gravisima-300 focus:border-gravisima-500 focus:ring-2 focus:ring-gravisima-500/20'
          : 'border-neutral-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
      } ${className}`}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

export default Input;
