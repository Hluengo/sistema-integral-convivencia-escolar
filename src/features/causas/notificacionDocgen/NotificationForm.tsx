/** @license SPDX-License-Identifier: Apache-2.0 */

import Button from '@/shared/ui/Button';
import { NOTIFICATION_SECTIONS } from './defaultContent';
import type { NotificationContent } from './types';

interface NotificationFormProps {
  apoderadoName: string;
  onApoderadoNameChange: (value: string) => void;
  emittedBy: string;
  onEmittedByChange: (value: string) => void;
  content: NotificationContent;
  onContentChange: (field: keyof NotificationContent, value: string) => void;
  onResetContent: () => void;
}

/**
 * Editor de la Notificación de Inicio de Indagación: los 9 bloques numerados
 * son editables y actualizan la hoja Carta en vivo (patrón DocumentForm de
 * cartas, sin IA).
 */
export default function NotificationForm({
  apoderadoName,
  onApoderadoNameChange,
  emittedBy,
  onEmittedByChange,
  content,
  onContentChange,
  onResetContent,
}: NotificationFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="notificacion-apoderado"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Nombre del Apoderado/a
          </label>
          <input
            id="notificacion-apoderado"
            aria-label="Nombre del apoderado o adulto responsable"
            type="text"
            value={apoderadoName}
            onChange={(event) => onApoderadoNameChange(event.target.value)}
            placeholder="Ingrese el nombre del apoderado/a"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="notificacion-emitido-por"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Emitido por
          </label>
          <input
            id="notificacion-emitido-por"
            aria-label="Emitido por"
            type="text"
            value={emittedBy}
            onChange={(event) => onEmittedByChange(event.target.value)}
            placeholder="Nombre de quien emite"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold text-neutral-900">Texto de la notificación</h5>
            <p className="mt-1 text-xs text-neutral-500">
              Estos textos actualizan la hoja Carta en vivo. Cada sección no debe superar los 220
              caracteres para que el documento quepa en una sola hoja. Revise los antecedentes del
              expediente antes de imprimir.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onResetContent}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            Restaurar texto base
          </Button>
        </div>
        <div className="space-y-4">
          {NOTIFICATION_SECTIONS.map((section, index) => (
            <div key={section.key}>
              <label
                htmlFor={`notificacion-${section.key}`}
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                {index + 1}. {section.title}
              </label>
              <textarea
                id={`notificacion-${section.key}`}
                aria-label={section.title}
                value={content[section.key]}
                onChange={(event) => onContentChange(section.key, event.target.value)}
                rows={index === 0 || index === 7 ? 4 : 3}
                className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
