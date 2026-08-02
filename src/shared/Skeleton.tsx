/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SkeletonProps {
  className?: string;
  count?: number;
}

function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={'sk-' + i} className={`skeleton ${className}`} aria-hidden="true" />
      ))}
    </>
  );
}

export function CausaCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando expediente"
      className="card animate-pulse space-y-3 p-5"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-3 w-full rounded-md" />
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={'sk-' + i} className="h-6 w-6 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function DashboardMetricSkeleton() {
  return (
    <div role="status" aria-label="Cargando métricas" className="card animate-pulse space-y-3 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-1.5 w-full rounded-full" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div role="status" aria-label="Cargando mensaje" className="animate-pulse flex justify-start">
      <div className="flex max-w-[70%] items-start gap-2.5">
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando tabla" className="animate-pulse space-y-3">
      <div className="flex gap-4 border-b border-neutral-100 pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={'sk-' + i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function AnnotationsSkeleton() {
  return (
    <div role="status" aria-label="Cargando anotaciones" className="animate-pulse space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={'sk-' + i} className="rounded-xl border border-neutral-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function MainContentSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6 animate-pulse space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardMetricSkeleton key={'sk-' + i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="col-span-2 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CausaCardSkeleton key={'sk-' + i} />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <span className="sr-only">Cargando vista principal...</span>
    </div>
  );
}

export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Cargando texto" className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={'sk-' + i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <aside
      role="status"
      aria-label="Cargando navegación"
      className="hidden h-dvh w-[68px] shrink-0 animate-pulse flex-col bg-neutral-950 px-3 py-4 shadow-xl lg:flex"
    >
      <Skeleton className="mx-auto h-10 w-10 rounded-xl bg-neutral-800" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={'nav-' + i} className="h-10 w-10 rounded-xl bg-neutral-800" />
        ))}
      </div>
      <Skeleton className="mt-auto h-10 w-10 rounded-xl bg-neutral-800" />
      <span className="sr-only">Cargando...</span>
    </aside>
  );
}

export function HeaderSkeleton() {
  return (
    <header
      role="status"
      aria-label="Cargando encabezado"
      className="h-16 border-neutral-200/60 border-b bg-white px-4 sm:px-6"
    >
      <div className="flex h-full animate-pulse items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Cargando...</span>
    </header>
  );
}

export function CommandPaletteSkeleton() {
  return (
    <div role="status" aria-label="Cargando buscador de comandos" className="sr-only">
      Cargando comandos...
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg animate-pulse rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
}

export function DetailModalSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando detalle del expediente"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 backdrop-blur-sm"
    >
      <div className="flex h-[min(92vh,900px)] w-[min(96vw,1280px)] animate-pulse flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-neutral-900 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl bg-neutral-800" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-5 w-48 bg-neutral-800" />
                <Skeleton className="h-3 w-64 max-w-full bg-neutral-800" />
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Skeleton className="h-9 w-9 rounded-xl bg-neutral-800" />
              <Skeleton className="h-9 w-9 rounded-xl bg-neutral-800" />
            </div>
          </div>
        </div>
        <div className="border-neutral-100 border-b bg-white px-4 pb-3 sm:px-6">
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={'tab-' + i} className="h-10 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="hidden space-y-3 lg:block">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
}

export function TimelineEditSkeleton() {
  return <ModalSkeleton />;
}

export function ClosedCasesSkeleton() {
  return (
    <div role="status" aria-label="Cargando expedientes cerrados" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <CausaCardSkeleton key={'closed-' + i} />
      ))}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function ManagementViewSkeleton() {
  return (
    <div role="status" aria-label="Cargando administración" className="animate-pulse space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="flex gap-2 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={'tab-' + i} className="h-10 w-32 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DashboardMetricSkeleton key={'summary-' + i} />
        ))}
      </div>
      <div className="card space-y-4 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <TableSkeleton rows={4} />
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function ReportsViewSkeleton() {
  return (
    <div role="status" aria-label="Cargando centro de reportes" className="animate-pulse space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200/70 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={'filter-' + i} className="h-11 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <DashboardMetricSkeleton key={'metric-' + i} />
        ))}
      </div>
      <div className="card p-5">
        <TableSkeleton rows={4} />
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function PlatformViewSkeleton() {
  return (
    <div role="status" aria-label="Cargando plataforma" className="animate-pulse space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl sm:max-w-sm" />
      </div>
      <div className="flex gap-2 overflow-hidden rounded-2xl border border-neutral-200/70 bg-white p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={'platform-tab-' + i} className="h-10 w-36 shrink-0 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DashboardMetricSkeleton key={'platform-summary-' + i} />
        ))}
      </div>
      <div className="card p-5">
        <TableSkeleton rows={4} />
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function DocumentGeneratorSkeleton() {
  return (
    <div role="status" aria-label="Cargando generador de carta" className="animate-pulse space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
