/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
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

export function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Cargando timeline" className="animate-pulse space-y-4 p-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={'sk-' + i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
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

export function FormSkeleton() {
  return (
    <div role="status" aria-label="Cargando formulario" className="animate-pulse space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-10 w-32 rounded-lg" />
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
