/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card p-10 sm:p-14 text-center max-w-lg mx-auto animate-fade-in">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-50 mb-5 ring-1 ring-brand-100">
        <Icon className="h-8 w-8 text-brand-600" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-neutral-800">{title}</h3>
      <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
