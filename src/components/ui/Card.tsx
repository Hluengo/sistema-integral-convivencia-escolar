/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

type CardVariant = 'default' | 'interactive' | 'elevated';

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-neutral-200/60 shadow-sm',
  interactive:
    'bg-white border border-neutral-200/60 shadow-sm hover:shadow-md hover:border-neutral-300 cursor-pointer transition-all duration-200',
  elevated: 'bg-white border border-neutral-200/60 shadow-md',
};

export default function Card({
  variant = 'default',
  children,
  className = '',
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl ${variantStyles[variant]} ${onClick ? 'text-left w-full' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
