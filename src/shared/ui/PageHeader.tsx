/** @license SPDX-License-Identifier: Apache-2.0 */

import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  metric?: ReactNode;
  action?: ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  metric,
  action,
}: PageHeaderProps) {
  return (
    <header className="rounded-lg border border-neutral-200/80 bg-white px-5 py-4 shadow-xs sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 font-semibold text-brand-700 text-xs uppercase">{eyebrow}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-bold text-2xl text-neutral-950">{title}</h1>
            {metric}
          </div>
          {description ? (
            <p className="mt-1 max-w-3xl text-neutral-600 text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </header>
  );
}
