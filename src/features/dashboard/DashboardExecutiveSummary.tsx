/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
} from "lucide-react";
import MetricCard from "../../shared/ui/MetricCard";

interface DashboardExecutiveSummaryProps {
  total: number;
  newThisMonth: number;
  closed: number;
  closureRate: number;
  active: number;
  investigatingCount: number;
  resolvingCount: number;
  annotationTotal: number;
  negativeAnnotations: number;
  positiveAnnotations: number;
  overdueDeadlines: number;
  dueWithin48Hours: number;
  withoutDelay: number;
  onFaseSelect: () => void;
}

export default function DashboardExecutiveSummary({
  total,
  newThisMonth,
  closed,
  closureRate,
  active,
  investigatingCount,
  resolvingCount,
  annotationTotal,
  negativeAnnotations,
  positiveAnnotations,
  overdueDeadlines,
  dueWithin48Hours,
  withoutDelay,
  onFaseSelect,
}: DashboardExecutiveSummaryProps) {
  return (
    <section
      aria-label="Resumen ejecutivo"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <MetricCard
        label="Casos ingresados"
        value={total}
        sublabel="Total de expedientes del ciclo"
        icon={GitCompareArrows}
        iconBg="bg-brand-50"
        iconColor="text-brand-600"
        accentColor="#006194"
        valueAside={
          <span className="rounded-full bg-brand-50 px-2 py-1 font-bold text-[11px] text-brand-700">
            +{newThisMonth} ingresados este mes
          </span>
        }
        footer={
          <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
            <span className="rounded-md bg-slate-50 px-2 py-1.5">
              <strong className="text-neutral-900">{closed}</strong> expedientes
              cerrados
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-1.5">
              Tasa cierre:{" "}
              <strong className="text-neutral-900">{closureRate}%</strong>
            </span>
          </div>
        }
      />
      <MetricCard
        label="Casos abiertos"
        value={active}
        sublabel={`de ${total} expedientes ingresados`}
        icon={Activity}
        iconBg="bg-slate-100"
        iconColor="text-slate-600"
        accentColor="#64748b"
        onClick={onFaseSelect}
        footer={
          <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
            <span className="rounded-md bg-slate-50 px-2 py-1.5">
              <strong className="text-neutral-900">{investigatingCount}</strong>{" "}
              en etapa de investigación
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-1.5">
              <strong className="text-neutral-900">{resolvingCount}</strong> en
              resolución o apelación
            </span>
          </div>
        }
      />
      <MetricCard
        label="Anotaciones en seguimiento"
        value={annotationTotal}
        valueAside={
          <span className="font-medium text-neutral-600 text-[11px]">
            Estudiantes en seguimiento
          </span>
        }
        sublabel="Anotaciones de estudiantes ingresados al seguimiento"
        icon={CalendarDays}
        iconBg="bg-muygrave-50"
        iconColor="text-muygrave-600"
        accentColor="#4648d4"
        footer={
          <div className="grid grid-cols-2 gap-2 text-center font-semibold text-[11px]">
            <span className="rounded-md bg-gravisima-50 px-2 py-1.5 text-gravisima-700">
              {negativeAnnotations} negativas
            </span>
            <span className="rounded-md bg-leve-50 px-2 py-1.5 text-leve-700">
              {positiveAnnotations} positivas
            </span>
          </div>
        }
      />
      <MetricCard
        label="Plazos por etapa procesal"
        value={overdueDeadlines}
        valueAside={
          <span className="rounded-full bg-leve-50 px-2 py-1 font-bold text-[11px] text-leve-700">
            {overdueDeadlines > 0 ? "Vencidos" : "Sin vencidos"}
          </span>
        }
        sublabel="Investigación, resolución y apelación"
        icon={overdueDeadlines > 0 ? Clock3 : CheckCircle2}
        iconBg={overdueDeadlines > 0 ? "bg-gravisima-50" : "bg-leve-50"}
        iconColor={
          overdueDeadlines > 0 ? "text-gravisima-600" : "text-leve-600"
        }
        accentColor={overdueDeadlines > 0 ? "#ef4444" : "#16a34a"}
        isAlert={overdueDeadlines > 0}
        footer={
          <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
            <span className="rounded-md bg-slate-50 px-2 py-1.5">
              <strong className="text-neutral-900">{dueWithin48Hours}</strong>{" "}
              vencen en 48 h
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-1.5">
              <strong className="text-neutral-900">{withoutDelay}</strong>{" "}
              dentro de plazo
            </span>
          </div>
        }
      />
    </section>
  );
}
