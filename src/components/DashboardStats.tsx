import React from 'react';
import { 
  FileText, Shield, AlertTriangle
} from 'lucide-react';
import { Student, Annotation } from '../types';

interface DashboardStatsProps {
  students: Student[];
  annotations: Annotation[];
}

export default function DashboardStats({ students, annotations }: DashboardStatsProps) {
  
  // Disciplinary stages counts based on RICE Art.24.BIS
  // 5-9 negativas = Carta de Amonestación (1ra acumulación)
  const amonestacionCount = students.filter(s => s.annotations_count >= 5 && s.annotations_count < 10).length;
  // 10-14 negativas = Carta de Compromiso Conductual (2da acumulación)
  const compromisoCount = students.filter(s => s.annotations_count >= 10 && s.annotations_count < 15).length;
  // 15+ negativas = Derivación a Convivencia Escolar (3ra acumulación)
  const derivacionCount = students.filter(s => s.annotations_count >= 15).length;

  const statsList = [
    {
      title: 'Carta de Amonestación',
      value: amonestacionCount,
      description: '1ra acumulación (5-9 anotaciones)',
      icon: FileText,
      color: 'bg-amber-50 border-amber-200 text-amber-600'
    },
    {
      title: 'Carta de Compromiso',
      value: compromisoCount,
      description: '2da acumulación (10-14 anotaciones)',
      icon: Shield,
      color: 'bg-orange-50 border-orange-200 text-orange-600'
    },
    {
      title: 'Derivación a Convivencia Escolar',
      value: derivacionCount,
      description: '3ra acumulación (15+ anotaciones)',
      icon: AlertTriangle,
      color: 'bg-rose-50 border-rose-200 text-rose-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statsList.map((stat, i) => {
        const IconComponent = stat.icon;
        
        return (
          <div 
            key={i} 
            className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between shadow-xs hover:border-slate-300 transition-all"
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {stat.title}
              </span>
              <span className="text-3xl font-black text-slate-800 tracking-tight block">
                {stat.value}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                {stat.description}
              </span>
            </div>
            
            <div className={`p-3 rounded-xl border ${stat.color} shrink-0`}>
              <IconComponent className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
