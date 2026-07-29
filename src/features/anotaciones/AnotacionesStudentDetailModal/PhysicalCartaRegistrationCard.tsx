/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { ClipboardCheck, Plus, X } from 'lucide-react';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';
import {
  getPhysicalCartaBaselineType,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  type LetterType,
} from '@/src/shared/lib/domain/disciplinaryStage';
import { usePhysicalCartaRegistration } from '@/src/shared/lib/hooks/usePhysicalCartaRegistration';
import { formatDate } from './constants';

const PHYSICAL_LETTER_TYPES: Array<Exclude<LetterType, 'Ficha de Derivación'>> = [
  'Amonestación Escrita',
  'Carta de Compromiso Conductual',
];

function getTodayInChile(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

interface PhysicalCartaRegistrationCardProps {
  studentId: string;
  cartas: CartaDisciplinaria[];
  negativeCount: number;
  onRegistered: () => void | Promise<void>;
}

export default function PhysicalCartaRegistrationCard({
  studentId,
  cartas,
  negativeCount,
  onRegistered,
}: PhysicalCartaRegistrationCardProps) {
  const today = getTodayInChile();
  const schoolYear = Number(today.slice(0, 4));
  const physicalCartas = cartas.filter((carta) => {
    const cartaYear =
      carta.school_year ?? new Date(`${carta.emission_date}T00:00:00`).getFullYear();
    return carta.origin === 'physical' && carta.status !== 'Anulada' && cartaYear === schoolYear;
  });
  const physicalBaselineType = getPhysicalCartaBaselineType(cartas, schoolYear);
  const requiredLetterType = mapDocTypeToLetterType(getSuggestedLetterType(negativeCount));
  const outstandingLetterType = mapDocTypeToLetterType(
    getSuggestedLetterType(negativeCount, physicalBaselineType),
  );
  const registeredTypes = new Set(physicalCartas.map((carta) => carta.letter_type));
  const allPhysicalTypesRegistered = PHYSICAL_LETTER_TYPES.every((type) =>
    registeredTypes.has(type),
  );
  const initialType =
    registeredTypes.has('Amonestación Escrita') &&
    !registeredTypes.has('Carta de Compromiso Conductual')
      ? 'Carta de Compromiso Conductual'
      : 'Amonestación Escrita';
  const [showForm, setShowForm] = useState(false);
  const [letterType, setLetterType] =
    useState<Exclude<LetterType, 'Ficha de Derivación'>>(initialType);
  const [emissionDate, setEmissionDate] = useState(today);
  const [observations, setObservations] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const { isRegistering, registerPhysicalCarta } = usePhysicalCartaRegistration({
    onRegistered,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const result = await registerPhysicalCarta({
      studentId,
      letterType,
      emissionDate,
      observations,
    });
    setHasError(!result.ok);
    setMessage(result.message);
    if (result.ok) {
      setShowForm(false);
      setObservations('');
      setLetterType(
        letterType === 'Amonestación Escrita'
          ? 'Carta de Compromiso Conductual'
          : 'Amonestación Escrita',
      );
    }
  };

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Carta física existente</h3>
            <p className="mt-1 max-w-2xl text-xs text-neutral-600">
              Registra una carta emitida fuera de la plataforma. Esta constancia no suma anotaciones
              ni genera un documento digital.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((visible) => !visible);
            setMessage(null);
          }}
          disabled={allPhysicalTypesRegistered}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {allPhysicalTypesRegistered
            ? 'Constancias registradas'
            : showForm
              ? 'Cancelar'
              : 'Registrar carta física'}
        </button>
      </div>

      {physicalCartas.length > 0 && (
        <div className="mt-4 space-y-2">
          {physicalCartas.map((carta) => (
            <div
              key={carta.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs"
            >
              <span className="font-bold text-neutral-900">{carta.letter_type}</span>
              <span className="text-neutral-500">
                Fecha física: {formatDate(carta.emission_date)}
              </span>
            </div>
          ))}
          {physicalBaselineType && (
            <p className="text-xs font-semibold text-sky-800">
              {outstandingLetterType
                ? `Constancia procesada. Por el conteo actual corresponde ${outstandingLetterType}.`
                : requiredLetterType
                  ? `Constancia procesada: acredita ${physicalBaselineType} para el conteo actual.`
                  : 'Constancia procesada. No hay una carta exigible por el conteo actual.'}
            </p>
          )}
        </div>
      )}

      {showForm && (
        <form
          className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-sky-200 bg-white p-4 md:grid-cols-2"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label htmlFor="physical-letter-type" className="text-xs font-semibold text-neutral-700">
            Tipo de carta física
            <select
              id="physical-letter-type"
              value={letterType}
              onChange={(event) =>
                setLetterType(event.target.value as Exclude<LetterType, 'Ficha de Derivación'>)
              }
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              {PHYSICAL_LETTER_TYPES.map((type) => (
                <option key={type} value={type} disabled={registeredTypes.has(type)}>
                  {type}
                  {registeredTypes.has(type) ? ' · ya registrada' : ''}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="physical-letter-date" className="text-xs font-semibold text-neutral-700">
            Fecha de la carta
            <input
              id="physical-letter-date"
              aria-label="Fecha de la carta física"
              type="date"
              required
              min={`${schoolYear}-01-01`}
              max={today}
              value={emissionDate}
              onChange={(event) => setEmissionDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            />
          </label>
          <label
            htmlFor="physical-letter-observations"
            className="text-xs font-semibold text-neutral-700 md:col-span-2"
          >
            Observación opcional
            <textarea
              id="physical-letter-observations"
              aria-label="Observación de la carta física"
              rows={2}
              maxLength={1000}
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Ej.: Carta firmada y archivada en expediente físico."
              className="mt-1 w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isRegistering || registeredTypes.has(letterType)}
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {isRegistering ? 'Guardando...' : 'Guardar constancia'}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p
          role={hasError ? 'alert' : 'status'}
          className={`mt-3 text-xs font-semibold ${hasError ? 'text-red-700' : 'text-emerald-700'}`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
