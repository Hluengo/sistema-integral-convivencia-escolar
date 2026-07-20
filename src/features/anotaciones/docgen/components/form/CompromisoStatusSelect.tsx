/** @license SPDX-License-Identifier: Apache-2.0 */

interface CompromisoStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const COMPROMISO_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptado', label: 'Aceptado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cumplido', label: 'Cumplido' },
];

export default function CompromisoStatusSelect({
  value,
  onChange,
}: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label
        htmlFor="compromiso-status"
        className="mb-1 block font-medium text-neutral-700 text-sm"
      >
        Estado del Compromiso
      </label>
      <select
        id="compromiso-status"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
      >
        {COMPROMISO_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}