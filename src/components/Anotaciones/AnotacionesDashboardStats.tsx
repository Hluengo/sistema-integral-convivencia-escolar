import { Users, FileText, FileWarning, AlertTriangle } from 'lucide-react';

interface AnotacionesDashboardStatsProps {
  totalStudents: number;
  amonestacionCount: number;
  compromisoCount: number;
  derivacionCount: number;
}

export default function AnotacionesDashboardStats({
  totalStudents,
  amonestacionCount,
  compromisoCount,
  derivacionCount,
}: AnotacionesDashboardStatsProps) {
  const stats = [
    {
      label: 'Estudiantes Totales',
      value: totalStudents,
      icon: Users,
      accent: 'bg-blue-500',
    },
    {
      label: 'Carta de Amonestación',
      value: amonestacionCount,
      icon: FileText,
      accent: 'bg-yellow-500',
    },
    {
      label: 'Carta de Compromiso',
      value: compromisoCount,
      icon: FileWarning,
      accent: 'bg-orange-500',
    },
    {
      label: 'Derivación a Convivencia Escolar',
      value: derivacionCount,
      icon: AlertTriangle,
      accent: 'bg-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm"
          >
            <div className={`flex size-12 items-center justify-center rounded-full ${stat.accent} bg-opacity-10`}>
              <Icon className={`size-6 ${stat.accent.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
