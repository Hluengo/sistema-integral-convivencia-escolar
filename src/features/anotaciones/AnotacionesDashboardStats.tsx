import { AlertTriangle, BarChart3, FileQuestion, FileText, FileWarning } from 'lucide-react';
import MetricCard from '../../components/MetricCard';

interface AnotacionesDashboardStatsProps {
  sinCartaCount: number;
  amonestacionCount: number;
  compromisoCount: number;
  derivacionCount: number;
}

export default function AnotacionesDashboardStats({
  sinCartaCount,
  amonestacionCount,
  compromisoCount,
  derivacionCount,
}: AnotacionesDashboardStatsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-neutral-100 p-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-neutral-500 text-xs uppercase tracking-[0.06em]">
          Anotaciones
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Sin Carta"
          value={sinCartaCount}
          sublabel="1-4 anotaciones negativas"
          icon={FileQuestion}
          iconBg="bg-slate-50"
          iconColor="text-slate-600"
          accentColor="#64748b"
        />
        <MetricCard
          label="Carta de Amonestación"
          value={amonestacionCount}
          sublabel="5-9 anotaciones negativas"
          icon={FileText}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-600"
          accentColor="#eab308"
        />
        <MetricCard
          label="Carta de Compromiso"
          value={compromisoCount}
          sublabel="10-14 anotaciones negativas"
          icon={FileWarning}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          accentColor="#f97316"
        />
        <MetricCard
          label="Derivación a Convivencia"
          value={derivacionCount}
          sublabel="15+ anotaciones negativas"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          accentColor="#ef4444"
        />
      </div>
    </div>
  );
}

