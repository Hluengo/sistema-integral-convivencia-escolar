/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', invalid = false, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || props['aria-invalid']}
      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 ${
        invalid
          ? 'border-gravisima-300 focus:border-gravisima-500 focus:ring-2 focus:ring-gravisima-500/20'
          : 'border-neutral-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';

export default Select;
