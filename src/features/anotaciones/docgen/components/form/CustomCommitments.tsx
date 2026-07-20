/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface CustomCommitmentsProps {
  customCommitments: string[];
  onAddCommitment: (commitment: string) => void;
  onRemoveCommitment: (index: number) => void;
}

export default function CustomCommitments({
  customCommitments,
  onAddCommitment,
  onRemoveCommitment,
}: { customCommitments: string[]; onAddCommitment: (c: string) => void; onRemoveCommitment: (i: number) => void }) {
  const [newCommitment, setNewCommitment] = useState('');

  const handleAdd = () => {
    const t = newCommitment.trim();
    if (t.length === 0) return;
    onAddCommitment(t);
    setNewCommitment('');
  };

  return (
    <div>
      <label
        htmlFor="custom-commitment"
        className="mb-1 block font-medium text-neutral-700 text-sm"
      >
        Compromisos Personalizados
      </label>
      <div className="mb-2 flex gap-2">
        <input
          id="custom-commitment"
          type="text"
          value={newCommitment}
          onChange={(e) => setNewCommitment(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Escriba un compromiso y presione Enter o el botón +"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          aria-label="Agregar compromiso"
          onClick={() => {
            const t = newCommitment.trim();
            if (t.length > 0) { onAddCommitment(t); setNewCommitment(''); }
          }}
          disabled={newCommitment.trim().length === 0}
          className="rounded-lg bg-brand-600 px-3 py-2 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {customCommitments.length > 0 ? (
        <ul className="space-y-1.5">
          {customCommitments.map((c, i) => (
            <li
              key={`commitment-${i}-${c.slice(0, 20)}`}
              className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700 text-sm"
            >
              <span className="flex-1">{c}</span>
              <button
                type="button"
                aria-label={`Eliminar compromiso: ${c}`}
                onClick={() => onRemoveCommitment(i)}
                className="mt-0.5 flex-shrink-0 text-red-500 transition-colors hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500 text-sm italic">
          No se han agregado compromisos personalizados.
        </p>
      )}
    </div>
  );
}