/** @license SPDX-License-Identifier: Apache-2.0 */

interface ObservationsFieldProps {
  docType: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ObservationsField({
  docType,
  value,
  onChange,
}: ObservationsFieldProps) {
  const isDerivacion = docType === 'derivacion';

  return (
    <div>
      <label
        htmlFor="doc-observations"
        className="mb-1 block font-medium text-neutral-700 text-sm"
      >
        {isDerivacion ? 'Fundamentación de la Derivación' : 'Observaciones'}
      </label>
      <textarea
        id="doc-observations"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isDerivacion
            ? 'Describa los motivos y antecedentes de la derivación...'
            : 'Observaciones adicionales para el documento...'
        }
        rows={4}
        className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}