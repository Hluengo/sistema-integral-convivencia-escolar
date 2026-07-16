/** @license SPDX-License-Identifier: Apache-2.0 */

import { Users } from 'lucide-react';
import { statusStyle, type Student } from './constants';

interface StudentSelectStepProps {
  students: Student[];
  course: string | null;
  selectedId: string | null;
  onSelect: (student: Student) => void;
}

export default function StudentSelectStep({ students, course, selectedId, onSelect }: StudentSelectStepProps) {
  const filtered = course ? students.filter((s) => (s.course_name || s.course_id) === course) : [];

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
        <Users className="h-4 w-4 text-indigo-600" /> Estudiantes de {course}
      </p>
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-neutral-400 text-sm">
          No hay estudiantes en este curso.
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all${
                selectedId === s.id
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-neutral-800 text-sm">{s.full_name}</p>
                <p className="text-neutral-400 text-xs">
                  {s.rut ? `RUT: ${s.rut} | ` : ''}
                  {s.annotations_count ?? 0} anotacion
                  {(s.annotations_count ?? 0) !== 1 ? 'es' : ''}
                </p>
              </div>
              {s.disciplinary_status && (
                <span className={`ml-2 shrink-0 rounded-full px-2.5 py-1 font-bold text-[10px] ${statusStyle(s.disciplinary_status)}`}>
                  {s.disciplinary_status}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
