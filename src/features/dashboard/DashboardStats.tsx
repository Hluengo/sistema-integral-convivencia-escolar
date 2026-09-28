/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type Causa,
  type TipoInfraccion,
  type FaseProcedimental,
  EstadoCausa,
} from "../../shared/lib/types";
import { getStats } from "../../shared/lib/data";
import { getCausaOperationalPhase } from "../causas/causaOperationalSummary";
import {
  Activity,
  BarChart3,
  CalendarDays,
  AlertCircle,
  Inbox,
  ArrowRight,
  Clock3,
  CheckCircle2,
  FolderOpen,
  FileQuestion,
  FileText,
  FileWarning,
  AlertTriangle,
  GitCompareArrows,
  Info,
} from "lucide-react";
import MetricCard from "../../shared/ui/MetricCard";
import AnotacionesDashboardStats, {
  AnnotationStageCard,
} from "../anotaciones/AnotacionesDashboardStats";
import EmptyState from "../../shared/EmptyState";
import DashboardTrendsPanel from "./DashboardTrendsPanel";
import {
  fetchAnnualAnnotationTrends,
  fetchAnnotationStageCounts,
  fetchStudentAnnotationRanking,
  fetchTeacherAnnotationRanking,
} from "../../shared/api/services/annotations.service";
import { fetchCourseCartaRanking } from "../../shared/api/services/cartas.service";
import {
  fetchPublicDashboardKpis,
  type PublicDashboardKpis,
} from "../../shared/api/services/public-dashboard.service";
import { useAuthStore } from "../../shared/lib/stores/authStore";
import {
  createEmptyAnnotationStageCounts,
  type AnnotationStageCounts,
} from "../../shared/lib/domain/annotationStageCounts";
import OnboardingChecklist from "../onboarding/OnboardingChecklist";
import type { SidebarView } from "../../widgets/sidebar/Sidebar";
import { fetchOnboardingStatus } from "../../shared/api/services/institution.service";
import {
  buildDashboardTrendSummary,
  getDashboardSchoolYear,
} from "./dashboardTrends";
import { getDashboardActions, type DashboardAction } from "./dashboardActions";

const DASHBOARD_STALE_TIME_MS = 300_000;

interface DashboardStatsProps {
  causas: Causa[];
  onFaseSelect: (fase: FaseProcedimental | "Todas") => void;
  onboardingEnabled?: boolean;
  coursesCount?: number;
  onNavigate?: (view: SidebarView) => void;
  onSelectCausa?: (causaId: string) => void;
  privacyMode?: boolean;
}

const SEVERITY_CONFIG: Record<TipoInfraccion, { label: string; dot: string }> =
  {
    Leve: { label: "Leves", dot: "bg-leve-500" },
    Grave: { label: "Graves", dot: "bg-grave-500" },
    "Muy Grave": { label: "Muy Graves", dot: "bg-muygrave-500" },
    Gravísima: { label: "Gravísimas", dot: "bg-gravisima-500" },
  };

function SeverityCard({
  tipo,
  count,
  total,
}: {
  tipo: TipoInfraccion;
  count: number;
  total: number;
}) {
  const cfg = SEVERITY_CONFIG[tipo];
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-2 text-neutral-700">
          <span
            className={`size-2 rounded-full ${cfg.dot}`}
            aria-hidden="true"
          />
          {tipo.toUpperCase()}
        </span>
        <span className="text-neutral-500 tabular-nums">
          {count} de {total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${cfg.dot}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Cargando indicadores del dashboard"
      aria-live="polite"
    >
      <div
        className="h-32 animate-pulse border-l-4 border-neutral-200 bg-white"
        aria-hidden="true"
      />
      <div
        className="card h-24 animate-pulse bg-neutral-100"
        aria-hidden="true"
      />
      <div
        className="card h-40 animate-pulse bg-neutral-100"
        aria-hidden="true"
      />
      <div className="hidden" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} />
        ))}
      </div>
      <span className="sr-only">Cargando indicadores del dashboard</span>
    </div>
  );
}

function DashboardActionQueue({
  actions,
  privacyMode,
  onOpen,
}: {
  actions: DashboardAction[];
  privacyMode: boolean;
  onOpen?: (causaId: string) => void;
}) {
  if (actions.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-neutral-600">
        <Clock3 className="size-4 text-leve-600" aria-hidden="true" />
        No hay plazos operativos vencidos o próximos a vencer.
      </div>
    );
  }

  return (
    <section
      aria-labelledby="dashboard-action-queue-title"
      className="rounded-2xl border border-gravisima-200/80 border-l-4 border-l-gravisima-500 bg-white px-5 py-5 shadow-sm ring-1 ring-black/[0.02]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="dashboard-action-queue-title"
            className="font-semibold text-neutral-900"
          >
            Acciones prioritarias
          </h2>
          <p className="mt-1 text-neutral-500 text-xs">
            Expedientes que requieren atención por plazo.
          </p>
        </div>
        <span className="rounded-full bg-gravisima-50 px-2.5 py-1 font-bold text-gravisima-700 text-xs">
          {actions.length}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {actions.slice(0, 5).map((action) => (
          <div
            key={action.causa.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-900 text-sm">
                {privacyMode
                  ? action.causa.nnaProtectedName
                  : action.causa.estudianteNombre}
              </p>
              <p className="truncate text-neutral-500 text-xs">
                {action.causa.id} · {action.causa.estudianteCurso} ·{" "}
                {action.causa.responsable}
              </p>
            </div>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(action.causa.id)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 py-1.5 font-semibold text-brand-700 text-xs hover:bg-brand-50"
                aria-label={`Abrir expediente ${action.causa.id}`}
              >
                <span
                  className={
                    action.urgency === "overdue"
                      ? "text-gravisima-700"
                      : "text-grave-700"
                  }
                >
                  {action.label}
                </span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <span className="shrink-0 font-semibold text-gravisima-700 text-xs">
                {action.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardStats({
  causas,
  onFaseSelect,
  onboardingEnabled = false,
  coursesCount = 0,
  onNavigate,
  onSelectCausa,
  privacyMode = false,
}: DashboardStatsProps) {
  const authenticatedStats = getStats(causas);
  const dashboardActions = useMemo(() => getDashboardActions(causas), [causas]);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const dashboardSchoolYear = useMemo(() => getDashboardSchoolYear(), []);

  const authenticatedCauseCounts = useMemo(() => {
    const active = causas.filter(
      (c) =>
        c.estadoActual !== EstadoCausa.CAUSA_CERRADA &&
        c.estadoActual !== EstadoCausa.RESOLUCION_EJECUTORIADA,
    ).length;
    const investigating = causas.filter(
      (c) => getCausaOperationalPhase(c) === "Investigación",
    ).length;
    const resolved = causas.filter(
      (c) =>
        c.estadoActual === EstadoCausa.CAUSA_CERRADA ||
        c.estadoActual === EstadoCausa.RESOLUCION_EJECUTORIADA,
    ).length;
    return { active, investigating, resolved };
  }, [causas]);

  const publicKpisQuery = useQuery({
    queryKey: ["public-dashboard-kpis"],
    queryFn: fetchPublicDashboardKpis,
    enabled: !isAuthenticated,
  });
  const annotationKpisQuery = useQuery({
    queryKey: ["annotation-stage-kpis", tenantId],
    queryFn: fetchAnnotationStageCounts,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const courseCartaRankingQuery = useQuery({
    queryKey: ["course-carta-ranking", tenantId],
    queryFn: fetchCourseCartaRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const teacherAnnotationRankingQuery = useQuery({
    queryKey: ["teacher-annotation-ranking", tenantId],
    queryFn: fetchTeacherAnnotationRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const studentAnnotationRankingQuery = useQuery({
    queryKey: ["student-annotation-ranking", tenantId],
    queryFn: fetchStudentAnnotationRanking,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const annualAnnotationTrendsQuery = useQuery({
    queryKey: ["annual-annotation-trends", tenantId, dashboardSchoolYear],
    queryFn: () => {
      if (!tenantId) return Promise.resolve([]);
      return fetchAnnualAnnotationTrends(dashboardSchoolYear, tenantId);
    },
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnMount: true,
  });
  const onboardingStatusQuery = useQuery({
    queryKey: ["onboarding-status", tenantId],
    queryFn: fetchOnboardingStatus,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
  const publicKpis = publicKpisQuery.data as PublicDashboardKpis | undefined;
  const trendSummary = useMemo(
    () =>
      buildDashboardTrendSummary(
        causas,
        annualAnnotationTrendsQuery.data ?? [],
        undefined,
        6,
      ),
    [causas, annualAnnotationTrendsQuery.data],
  );
  const loading = isAuthenticated
    ? !tenantId || annotationKpisQuery.isLoading
    : publicKpisQuery.isLoading;
  const kpiError = isAuthenticated
    ? annotationKpisQuery.isError
    : publicKpisQuery.isError;
  const cartaRankingError = isAuthenticated
    ? courseCartaRankingQuery.error
    : null;
  const teacherRankingError = isAuthenticated
    ? teacherAnnotationRankingQuery.error
    : null;
  const studentRankingError = isAuthenticated
    ? studentAnnotationRankingQuery.error
    : null;

  if (loading) return <DashboardSkeleton />;

  const total = isAuthenticated
    ? authenticatedStats.total
    : (publicKpis?.totalCauses ?? 0);
  const active = isAuthenticated
    ? authenticatedCauseCounts.active
    : (publicKpis?.activeCauses ?? 0);
  const pendingFollowUps = isAuthenticated
    ? dashboardActions.filter((action) => action.remainingDays <= 2).length
    : 0;
  const operationalStatus =
    pendingFollowUps > 0 ? "Atención requerida" : "Operación regular";
  const newThisMonth = isAuthenticated
    ? causas.filter((causa) => {
        const openedAt = new Date(causa.fechaApertura);
        const now = new Date();
        return (
          openedAt.getFullYear() === now.getFullYear() &&
          openedAt.getMonth() === now.getMonth()
        );
      }).length
    : 0;
  const severity = isAuthenticated
    ? authenticatedStats.porGravedad
    : {
        Leve: publicKpis?.leveCount ?? 0,
        Grave: publicKpis?.graveCount ?? 0,
        "Muy Grave": publicKpis?.muyGraveCount ?? 0,
        Gravísima: publicKpis?.gravisimaCount ?? 0,
      };
  const asPendingBreakdown = (value: number) => ({
    total: value,
    pending: value,
    processed: 0,
    archived: 0,
  });
  const annotations: AnnotationStageCounts = isAuthenticated
    ? (annotationKpisQuery.data ?? createEmptyAnnotationStageCounts())
    : {
        sinCarta: asPendingBreakdown(0),
        amonestacion: asPendingBreakdown(publicKpis?.amonestacionCount ?? 0),
        compromiso: asPendingBreakdown(publicKpis?.compromisoCount ?? 0),
        derivacion: asPendingBreakdown(publicKpis?.derivacionCount ?? 0),
      };
  const closed = isAuthenticated
    ? authenticatedCauseCounts.resolved
    : Math.max(total - active, 0);
  const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  if (!isAuthenticated && total === 0 && !kpiError) {
    return (
      <EmptyState
        icon={Inbox}
        title="No hay causas registradas"
        description="Aún no se han registrado expedientes disciplinarios. Las métricas aparecerán cuando existan causas activas."
      />
    );
  }

  return (
    <section
      aria-label="Panel de control"
      className="animate-fade-in space-y-6 pb-8"
    >
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="size-2 rounded-full bg-leve-500"
                aria-hidden="true"
              />
              <h2 className="font-semibold text-neutral-900 text-sm">
                {operationalStatus}
              </h2>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-[10px] text-brand-700 uppercase tracking-wide">
                Protocolo Ley Aula Segura
              </span>
            </div>
            <p className="mt-1 text-neutral-500 text-xs">
              {pendingFollowUps > 0
                ? `${pendingFollowUps} expediente${pendingFollowUps === 1 ? " requiere" : "s requieren"} atención por plazo.`
                : "Sin plazos ministeriales vencidos ni seguimientos próximos."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg bg-slate-50 px-3 py-2 font-semibold text-neutral-600">
            Ciclo académico actual
          </span>
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate("causas")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-3 font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <FolderOpen className="size-4" aria-hidden="true" />
              Ver expedientes
            </button>
          ) : null}
        </div>
      </section>

      {onboardingEnabled && tenantId && userId && onNavigate ? (
        <OnboardingChecklist
          tenantId={tenantId}
          userId={userId}
          coursesCount={coursesCount}
          readiness={onboardingStatusQuery.data}
          onNavigate={onNavigate}
        />
      ) : null}
      {isAuthenticated ? (
        <DashboardActionQueue
          actions={dashboardActions}
          privacyMode={privacyMode}
          onOpen={
            onSelectCausa
              ? (causaId) => {
                  onSelectCausa(causaId);
                  onNavigate?.("causas");
                }
              : undefined
          }
        />
      ) : null}

      <section
        aria-label="Resumen ejecutivo"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Expedientes activos"
          value={active}
          sublabel={`de ${total} totales`}
          icon={Activity}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          accentColor="#006194"
          onClick={() => onFaseSelect("Todas")}
          valueAside={
            <span className="rounded-full bg-brand-50 px-2 py-1 font-bold text-[11px] text-brand-700">
              +{newThisMonth} nuevos este mes
            </span>
          }
          footer={
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{closed}</strong> cerrados
                formalmente
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                Tasa cierre:{" "}
                <strong className="text-neutral-900">{closureRate}%</strong>
              </span>
            </div>
          }
        />
        <MetricCard
          label="Brecha de Resolución"
          value={Math.max(active, 0)}
          valueAside={
            <span className="rounded-full bg-gravisima-50 px-2 py-1 font-bold text-[11px] text-gravisima-700">
              Aperturas netas
            </span>
          }
          sublabel="Casos abiertos vs. acuerdos"
          icon={GitCompareArrows}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          accentColor="#64748b"
          footer={
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{total}</strong> aperturas
                acumuladas
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                <strong className="text-neutral-900">{closed}</strong> cerradas
                en el ciclo
              </span>
            </div>
          }
        />
        <MetricCard
          label="Anotaciones registradas"
          value={trendSummary.annotationTotal}
          valueAside={
            <span className="font-medium text-neutral-600 text-[11px]">
              Total Libro de Clases
            </span>
          }
          sublabel="Periodo de observación"
          icon={CalendarDays}
          iconBg="bg-muygrave-50"
          iconColor="text-muygrave-600"
          accentColor="#4648d4"
          footer={
            <div className="grid grid-cols-2 gap-2 text-center font-semibold text-[11px]">
              <span className="rounded-md bg-leve-50 px-2 py-1.5 text-leve-700">
                {trendSummary.positiveAnnotationShare}% Positivas
              </span>
              <span className="rounded-md bg-gravisima-50 px-2 py-1.5 text-gravisima-700">
                {trendSummary.negativeAnnotationShare}% Negativas
              </span>
            </div>
          }
        />
        <MetricCard
          label="Plazos de Seguimiento"
          value={pendingFollowUps}
          valueAside={
            <span className="rounded-full bg-leve-50 px-2 py-1 font-bold text-[11px] text-leve-700">
              {pendingFollowUps > 0
                ? "Requiere atención"
                : "Sin alertas críticas"}
            </span>
          }
          sublabel="Vencidos o dentro de 48 hrs"
          icon={pendingFollowUps > 0 ? Clock3 : CheckCircle2}
          iconBg={pendingFollowUps > 0 ? "bg-gravisima-50" : "bg-leve-50"}
          iconColor={
            pendingFollowUps > 0 ? "text-gravisima-600" : "text-leve-600"
          }
          accentColor={pendingFollowUps > 0 ? "#ef4444" : "#16a34a"}
          isAlert={pendingFollowUps > 0}
          footer={
            <div className="grid grid-cols-2 gap-2 text-neutral-600 text-[11px]">
              <span className="rounded-md bg-slate-50 px-2 py-1.5">
                {pendingFollowUps > 0 ? "Requieren atención" : "Sin atrasos"}
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
                {pendingFollowUps > 0
                  ? `${pendingFollowUps} alertas activas`
                  : "Sin alertas activas"}
              </span>
            </div>
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section
          aria-labelledby="severity-title"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-brand-600" aria-hidden="true" />
              <h2
                id="severity-title"
                className="font-bold text-neutral-900 text-sm"
              >
                Distribución por Gravedad
              </h2>
            </div>
            <span className="rounded-full bg-indigo-100 px-3 py-1 font-bold text-[11px] text-indigo-700">
              {total} Casos
            </span>
          </div>
          <p className="mt-1 text-neutral-500 text-xs leading-relaxed">
            Clasificación tipificada según Reglamento Interno de Convivencia
            Escolar (RICE).
          </p>
          <div className="mt-5 space-y-3.5">
            <SeverityCard tipo="Leve" count={severity.Leve} total={total} />
            <SeverityCard tipo="Grave" count={severity.Grave} total={total} />
            <SeverityCard
              tipo="Muy Grave"
              count={severity["Muy Grave"]}
              total={total}
            />
            <SeverityCard
              tipo="Gravísima"
              count={severity.Gravísima}
              total={total}
            />
          </div>
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-blue-700"
              aria-hidden="true"
            />
            <p className="text-blue-800 text-[11px] leading-tight">
              <strong>
                {total > 0
                  ? Math.round(
                      ((severity["Muy Grave"] + severity.Gravísima) / total) *
                        100,
                    )
                  : 0}
                %
              </strong>{" "}
              de los expedientes corresponden a faltas de alta ponderación
              formativa.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="measures-title"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-8"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-brand-600" aria-hidden="true" />
              <h2
                id="measures-title"
                className="font-bold text-neutral-900 text-sm"
              >
                Estado de Medidas y Cartas Disciplinarias
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-neutral-700 text-[11px] tabular-nums">
                {annotations.sinCarta.total +
                  annotations.amonestacion.total +
                  annotations.compromiso.total +
                  annotations.derivacion.total}{" "}
                alumnos ·{" "}
                {annotations.amonestacion.pending +
                  annotations.compromiso.pending +
                  annotations.derivacion.pending}{" "}
                por gestionar
              </span>
              <span className="inline-flex items-center gap-1 text-brand-600 text-[11px]">
                <Info className="size-3.5" aria-hidden="true" />
                Flujo de intervención gradual
              </span>
            </div>
          </div>
          <p className="mt-1 text-neutral-500 text-xs">
            Seguimiento en línea según volumen de anotaciones negativas
            registradas por estudiante.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnnotationStageCard
              label="Sin Carta"
              counts={annotations.sinCarta}
              threshold="1-4 anotaciones"
              icon={FileQuestion}
              iconBg="bg-neutral-50"
              iconColor="text-neutral-600"
              accentColor="#64748b"
            />
            <AnnotationStageCard
              label="Amonestación"
              counts={annotations.amonestacion}
              threshold="5-9 anotaciones"
              icon={FileText}
              iconBg="bg-grave-50"
              iconColor="text-grave-600"
              accentColor="#f59e0b"
            />
            <AnnotationStageCard
              label="Compromiso"
              counts={annotations.compromiso}
              threshold="10-14 anotaciones"
              icon={FileWarning}
              iconBg="bg-muygrave-50"
              iconColor="text-muygrave-600"
              accentColor="#f97316"
            />
            <AnnotationStageCard
              label="Derivación"
              counts={annotations.derivacion}
              threshold="15+ anotaciones"
              icon={AlertTriangle}
              iconBg="bg-gravisima-50"
              iconColor="text-gravisima-600"
              accentColor="#ef4444"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-slate-100 border-t pt-3 text-neutral-600 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-gravisima-500" />
              <strong className="text-neutral-800">Pendientes:</strong>{" "}
              requieren redactar y gestionar firma.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand-600" />
              <strong className="text-neutral-800">Procesadas:</strong> impresas
              en inspectoría / citación apoderado.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-neutral-400" />
              <strong className="text-neutral-800">Archivadas:</strong> firmadas
              y cargadas en ficha del alumno.
            </span>
          </div>
        </section>
      </section>

      {kpiError ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-gravisima-600" />
            <div>
              <p className="font-semibold text-neutral-800 text-sm">
                Error al cargar los indicadores
              </p>
              <p className="text-neutral-600 text-xs">
                No se pudieron obtener las métricas del dashboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) void annotationKpisQuery.refetch();
              else void publicKpisQuery.refetch();
            }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 font-semibold text-neutral-800 text-xs ring-1 ring-neutral-200 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {isAuthenticated ? (
        <DashboardTrendsPanel
          causas={causas}
          annotationTrends={annualAnnotationTrendsQuery.data ?? []}
          annotationTrendLoading={annualAnnotationTrendsQuery.isLoading}
          annotationTrendError={annualAnnotationTrendsQuery.error}
        />
      ) : null}

      <AnotacionesDashboardStats
        counts={annotations}
        showStage={false}
        courseCartaRanking={courseCartaRankingQuery.data ?? []}
        courseCartaRankingLoading={courseCartaRankingQuery.isLoading}
        courseCartaRankingError={cartaRankingError}
        teacherAnnotationRanking={teacherAnnotationRankingQuery.data ?? []}
        teacherAnnotationRankingLoading={
          teacherAnnotationRankingQuery.isLoading
        }
        teacherAnnotationRankingError={teacherRankingError}
        studentAnnotationRanking={studentAnnotationRankingQuery.data ?? []}
        studentAnnotationRankingLoading={
          studentAnnotationRankingQuery.isLoading
        }
        studentAnnotationRankingError={studentRankingError}
        privacyMode={privacyMode}
      />
    </section>
  );
}
