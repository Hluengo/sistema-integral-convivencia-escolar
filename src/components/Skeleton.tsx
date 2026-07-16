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

function _ChatMessageSkeleton() {
  return (
    <div role="status" aria-label="Cargando mensaje" className="flex justify-start">
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

function _TimelineTabSkeleton() {
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
