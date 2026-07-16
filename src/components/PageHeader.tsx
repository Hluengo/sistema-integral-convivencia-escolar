/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-bold text-neutral-900 text-xl tracking-tight sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-neutral-500 text-sm">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
