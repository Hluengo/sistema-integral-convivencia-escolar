/** @license SPDX-License-Identifier: Apache-2.0 */

interface ApCoordinatorFieldsProps {
  docType: string;
  apoderadoName: string;
  onApoderadoNameChange: (value: string) => void;
  coordinatorName: string;
  onCoordinatorNameChange: (value: string) => void;
  emittedBy: string;
  onEmittedByChange: (value: string) => void;
}

export default function ApCoordinatorFields({
  docType,
  apoderadoName,
  onApoderadoNameChange,
  coordinatorName,
  onCoordinatorNameChange,
  emittedBy,
  onEmittedByChange,
}: ApCoordinatorFieldsProps) {
  if (docType === 'derivacion') { return null; }

  return (
    <>
      <div>
        <label
          htmlFor="apoderado-name"
          className="mb-1 block font-medium text-neutral-700 text-sm"
        >
          Nombre del Apoderado
        </label>
        <input
          id="apoderado-name"
          type="text"
          value={apoderadoName}
          onChange={(e) => onApoderadoNameChange(e.target.value)}
          placeholder="Ingrese el nombre del apoderado"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {docType === 'compromiso_conductual' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="coordinator-name"
              className="mb-1 block font-medium text-neutral-700 text-sm"
            >
              Nombre del Coordinador
            </label>
            <input
              id="coordinator-name"
              type="text"
              value={coordinatorName}
              onChange={(e) => onCoordinatorNameChange(e.target.value)}
              placeholder="Coordinador de ciclo / convivencia"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="emitted-by" className="mb-1 block font-medium text-neutral-700 text-sm">
              Emitido por
            </label>
            <input
              id="emitted-by"
              type="text"
              value={emittedBy}
              onChange={(e) => onEmittedByChange(e.target.value)}
              placeholder="Nombre de quien emite"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </>
  );
}