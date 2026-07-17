/** @license SPDX-License-Identifier: Apache-2.0 */

import { School } from 'lucide-react';
import { LEVELS, levelFromCourse, type CourseInfo } from './constants';

interface CourseSelectStepProps {
  courses: CourseInfo[];
  course: string | null;
  onSelect: (course: string) => void;
}

export default function CourseSelectStep({ courses, course, onSelect }: CourseSelectStepProps) {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
        <School className="h-4 w-4 text-indigo-600" /> Selecciona el curso
      </p>
      {LEVELS.map(({ key, label, icon: Icon }) => {
        const cs = courses.filter((c) => levelFromCourse(c.n) === key);
        if (!cs.length) return null;
        return (
          <div key={key}>
            <h4 className="mb-2 flex items-center gap-1.5 font-bold text-neutral-500 text-xs uppercase tracking-wider">
              <Icon className="h-3.5 w-3.5" /> {label}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cs.map((c) => (
                <button
                  key={c.n}
                  type="button"
                  onClick={() => onSelect(c.n)}
                  className={`rounded-xl border p-3 text-left transition-all${
                    course === c.n
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <p className="font-semibold text-neutral-800 text-sm">{c.n}</p>
                  <p className="text-neutral-400 text-xs">
                    {c.c} estudiante{c.c !== 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
