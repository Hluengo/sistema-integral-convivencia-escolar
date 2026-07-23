/** @license SPDX-License-Identifier: Apache-2.0 */

interface EmittedEntry {
  id?: string;
  studentId?: string;
  student_name?: string;
  studentName?: string;
  emissionDate?: string;
  emission_date?: string;
}

interface RecentlyEmittedProps {
  emittedList: EmittedEntry[];
}

export default function RecentlyEmitted({ emittedList }: RecentlyEmittedProps) {
  if (emittedList.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
      <h4 className="mb-3 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
        Documentos recientes en este dispositivo
      </h4>
      <ul className="space-y-2">
        {emittedList.slice(0, 5).map((entry, i) => (
          <li
            key={entry.id || i}
            className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700 text-xs"
          >
            <span className="truncate font-medium">{entry.studentName || entry.student_name}</span>
            <span className="ml-2 shrink-0 text-neutral-400">
              {entry.emissionDate || entry.emission_date}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
