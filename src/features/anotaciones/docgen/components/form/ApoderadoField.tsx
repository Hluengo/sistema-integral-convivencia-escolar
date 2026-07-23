/** @license SPDX-License-Identifier: Apache-2.0 */
export default function ApoderadoField({
  value,
  onChange,
  docType,
}: { value: string; onChange: (v: string) => void; docType: string }) {
  if (docType === 'derivacion') { return null; }

  return (
    <div>
      <label
        htmlFor="apoderado-name"
        className="mb-1 block font-medium text-neutral-700 text-sm"
      >
        Nombre del Apoderado
      </label>
      <input
        id="apoderado-name"
          aria-label="Nombre del apoderado"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ingrese el nombre del apoderado"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}