/** @license SPDX-License-Identifier: Apache-2.0 */
export default function CoordinatorEmittedByFields({
  docType,
  coordinatorName,
  onCoordinatorNameChange,
  emittedBy,
  onEmittedByChange,
}: {
  docType: string;
  coordinatorName: string;
  onCoordinatorNameChange: (v: string) => void;
  emittedBy: string;
  onEmittedByChange: (v: string) => void;
}) {
  if (docType !== 'compromiso_conductual') { return null; }

  return (
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
          aria-label="Nombre del coordinador"
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
          aria-label="Emitido por"
          type="text"
          value={emittedBy}
          onChange={(e) => onEmittedByChange(e.target.value)}
          placeholder="Nombre de quien emite"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}