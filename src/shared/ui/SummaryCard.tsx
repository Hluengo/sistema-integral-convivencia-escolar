/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ElementType } from 'react';

interface SummaryCardProps {
  icon: ElementType;
  label: string;
  value: string;
}

/**
 * Tarjeta de resumen con métrica destacada.
 * Lenguaje visual compartido por el centro de administración,
 * el centro de reportes y la plataforma de superadministración.
 */
export default function SummaryCard({ icon: Icon, label, value }: SummaryCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="rounded-xl bg-brand-50 p-3 text-brand-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-bold text-2xl text-neutral-900">{value}</p>
        <p className="mt-0.5 text-neutral-500 text-xs">{label}</p>
      </div>
    </div>
  );
}
