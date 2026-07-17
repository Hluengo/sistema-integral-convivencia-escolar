/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import Button from './ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  sm: { wrapper: 'py-8 px-4', iconBox: 'h-12 w-12 rounded-xl', iconSize: 'h-6 w-6', titleSize: 'text-sm', descSize: 'text-xs' },
  md: { wrapper: 'py-16 px-6', iconBox: 'h-16 w-16 rounded-2xl', iconSize: 'h-8 w-8', titleSize: 'text-base', descSize: 'text-sm' },
  lg: { wrapper: 'py-20 px-8', iconBox: 'h-20 w-20 rounded-2xl', iconSize: 'h-10 w-10', titleSize: 'text-lg', descSize: 'text-base' },
};

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = 'md',
  children,
  className = '',
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${styles.wrapper} ${className}`}
    >
      <div className={`mb-5 flex items-center justify-center bg-neutral-100 ${styles.iconBox}`}>
        <Icon className={`text-neutral-400 ${styles.iconSize}`} />
      </div>
      <h3 className={`mb-1.5 font-semibold text-neutral-700 ${styles.titleSize}`}>{title}</h3>
      {description && (
        <p className={`mb-6 max-w-sm text-neutral-500 ${styles.descSize}`}>{description}</p>
      )}
      {children}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
