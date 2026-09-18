/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ElementType } from "react";

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
export default function SummaryCard({
  icon: Icon,
  label,
  value,
}: SummaryCardProps) {
  return (
    <div className="flex min-h-20 items-center gap-3 border-l-2 border-brand-500 bg-white px-4 py-3">
      <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-bold text-2xl text-neutral-900">{value}</p>
        <p className="mt-0.5 text-neutral-600 text-xs">{label}</p>
      </div>
    </div>
  );
}
