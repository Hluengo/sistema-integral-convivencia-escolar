import React from 'react';
import { Search, Filter, AlertCircle, ChevronRight, Award, AlertTriangle, Shield, Plus, FileText } from 'lucide-react';
import { Student } from '../types';
import { maskName, maskRut, getSemaphoricStyle } from '../lib/utils';
import {
  getDisciplinaryStatusLabel,
  getDisciplinaryStatusStyle,
} from '../domain/disciplinaryStatus';

export { getDisciplinaryStatusLabel, getDisciplinaryStatusStyle };

export const TEACHERS_BY_COURSE: Record<string, string> = {
  '1° Básico A': 'Constanza Espinoza Miranda',
  '1° Básico B': 'Natalia Albornoz Rodríguez',
  '2° Básico A': 'Camila Godoy Venegas',
  '2° Básico B': 'Belén Fuentes Salazar',
  '3° Básico A': 'Esperanza Moraga Saint Jour',
  '3° Básico B': 'María Olivia Garcés',
  '4° Básico A': 'Javiera Jofré San Martín',
  '4° Básico B': 'Carolina Ruíz Risopatrón',
  '5° Básico A': 'Pamela Jara González',
  '5° Básico B': 'Viviana Saavedra Barrera',
  '6° Básico A': 'Silvana Pincheira Rodríguez',
  '6° Básico B': 'Rosario Salinas Campos',
  '7° Básico A': 'Marcelo Muñoz Pino',
  '7° Básico B': 'María Isabel Matus Retamal',
  '8° Básico A': 'Vannia Retamal Salgado',
  '8° Básico B': 'Patricio Zambrano Asencio',
  '1° Medio A': 'Ester Contreras Espinoza',
  '1° Medio B': 'Maritza Carrasco Palma',
  '2° Medio A': 'Percy Rocha Luna',
  '2° Medio B': 'Jeremy Pérez Muñoz',
  '3° Medio A': 'Angelo Freire Contreras',
  '3° Medio B': 'Carolina Agüero Cárdenas',
  '4° Medio A': 'Vicente Burgos Estrada',
  '4° Medio B': 'Keyla Rodríguez Sanhueza',
};

interface StudentTableProps {
  students: Student[];
  privacyMode: boolean;
  onSelectStudent: (student: Student) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenNewProcess?: () => void;
}

export default function StudentTable({
  students,
  privacyMode,
  onSelectStudent,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  onRefresh,
  isLoading,
  onOpenNewProcess
}: StudentTableProps) {
  const [activeCaseIds, setActiveCaseIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const handleLoadCases = () => {
      const local = localStorage.getItem('convivencia_disciplinary_cases');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          const ids = parsed.map((c: any) => c.student_id);
          setActiveCaseIds(ids);
        } catch (e) {
          console.warn('Error parsing active cases', e);
        }
      }
    };

    handleLoadCases();
    window.addEventListener('storage', handleLoadCases);
    window.addEventListener('disciplinary-case-registered', handleLoadCases);
    return () => {
      window.removeEventListener('storage', handleLoadCases);
      window.removeEventListener('disciplinary-case-registered', handleLoadCases);
    };
  }, [students]);

  const handleMaskName = (name: string) => maskName(name, privacyMode);
  const handleMaskRut = (rut?: string) => maskRut(rut, privacyMode);

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    const teacherName = TEACHERS_BY_COURSE[student.course_id] || '';
    const matchesSearch = 
      student.full_name.toLowerCase().includes(query) ||
      student.course_id.toLowerCase().includes(query) ||
      teacherName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'con_registro':
        return student.annotations_count >= 5;
      case 'amonestacion':
        return student.annotations_count >= 5 && student.annotations_count < 10;
      case 'compromiso':
        return student.annotations_count >= 10 && student.annotations_count < 15;
      case 'derivacion':
        return student.annotations_count >= 15;
      default:
        return student.annotations_count >= 5;
    }
  });

  const quickFiltersList = [
    { id: 'con_registro', label: 'Con Registro', color: 'indigo' },
    { id: 'amonestacion', label: 'Carta de Amonestación', color: 'amber' },
    { id: 'compromiso', label: 'Carta de Compromiso', color: 'orange' },
    { id: 'derivacion', label: 'Derivado a CE', color: 'rose' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, curso o profesor jefe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewProcess && (
              <button
                onClick={onOpenNewProcess}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nuevo Proceso Disciplinario
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition-all"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1.5">
            <Filter className="w-3 h-3 text-slate-400" />
            Filtros:
          </span>
          {quickFiltersList.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-all ${
                activeFilter === f.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-3 px-4 font-sans">Estudiante (NNA)</th>
              <th className="py-3 px-4 font-sans">RUT</th>
              <th className="py-3 px-4 font-sans">Curso</th>
              <th className="py-3 px-4 font-sans">Profesor/a Jefe</th>
              <th className="py-3 px-4 text-center font-sans">Positivas</th>
              <th className="py-3 px-4 text-center font-sans">Negativas</th>
              <th className="py-3 px-4 font-sans">Último Registro</th>
              <th className="py-3 px-4 font-sans">Estado Disciplinario</th>
              <th className="py-3 px-4 text-right font-sans">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 text-sm">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const style = getSemaphoricStyle(student.annotations_count);
                const teacherName = TEACHERS_BY_COURSE[student.course_id] || 'Sin asignar';
                const statusLabel = getDisciplinaryStatusLabel(student.annotations_count);
                const statusStyle = getDisciplinaryStatusStyle(student.annotations_count);
                
                return (
                  <tr
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className={`cursor-pointer transition-colors ${style.rowBg}`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {handleMaskName(student.full_name)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {student.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {handleMaskRut(student.rut)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                      {student.course_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                      {teacherName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Award className="w-3 h-3 text-emerald-600" />
                        {student.positive_annotations_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${style.badge}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {student.annotations_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      {student.last_annotation_date || 'Sin registros'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="p-1 rounded-lg hover:bg-slate-150 text-slate-400 hover:text-slate-700 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 bg-slate-50/50">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-medium text-sm text-slate-700">No se encontraron estudiantes</p>
                  <p className="text-xs text-slate-500 mt-1">Intenta ajustando el filtro rápido o los términos de búsqueda.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          Mostrando <span className="font-semibold text-slate-700">{filteredStudents.length}</span> de <span className="font-semibold text-slate-700">{students.length}</span> estudiantes registrados.
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Amonestación (5-9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span>Compromiso (10-14)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Derivado CE (15+)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
