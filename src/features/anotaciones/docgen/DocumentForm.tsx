/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from "../../../shared/lib/types";
import type { LetterContent } from "./DocumentPreview/docTypes";
import Button from "@/shared/ui/Button";

interface DocumentFormProps {
  docType: string;
  apoderadoName: string;
  onApoderadoNameChange: (value: string) => void;
  coordinatorName: string;
  onCoordinatorNameChange: (value: string) => void;
  emittedBy: string;
  onEmittedByChange: (value: string) => void;
  letterContent: LetterContent;
  onLetterContentChange: (field: keyof LetterContent, value: string) => void;
  onResetLetterContent: () => void;
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
  negativeCount: number;
  annotations: Annotation[];
}

const TEXT_FIELDS: Array<{
  key: keyof LetterContent;
  label: string;
  help: string;
  rows: number;
}> = [
  {
    key: "motivo",
    label: "Motivo de la medida",
    help: "Explique por qué se aplica la medida y relaciónela con los antecedentes registrados.",
    rows: 2,
  },
  {
    key: "descripcion",
    label: "Descripción objetiva / antecedentes",
    help: "Describa hechos verificables, evitando juicios, etiquetas o información no registrada.",
    rows: 4,
  },
  {
    key: "medida",
    label: "Medida formativa y acompañamiento",
    help: "Indique el apoyo, responsable y plazo, privilegiando reflexión, autorregulación y mejora.",
    rows: 4,
  },
  {
    key: "acuerdos",
    label: "Acuerdos, acciones y seguimiento",
    help: "Registre compromisos concretos, responsables, frecuencia y fecha o condición de revisión.",
    rows: 4,
  },
  {
    key: "cierre",
    label: "Cierre y evaluación",
    help: "Consigne cómo se evaluará el cumplimiento, los avances y las medidas posteriores si corresponde.",
    rows: 3,
  },
  {
    key: "observaciones",
    label: "Observaciones relevantes",
    help: "Agregue solo antecedentes necesarios para el seguimiento y resguarde la confidencialidad.",
    rows: 3,
  },
];

export default function DocumentForm({
  docType,
  apoderadoName,
  onApoderadoNameChange,
  coordinatorName,
  onCoordinatorNameChange,
  emittedBy,
  onEmittedByChange,
  letterContent,
  onLetterContentChange,
  onResetLetterContent,
  negativeCount,
}: DocumentFormProps) {
  const showAdvanced =
    docType === "compromiso_conductual" ||
    docType === "compromiso_conductual_dupla" ||
    docType === "derivacion";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
        Cantidad de anotaciones negativas consideradas:{" "}
        <strong>{negativeCount}</strong>
      </div>

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
        <strong>Orientación reglamentaria:</strong> redacte la carta con enfoque
        formativo, proporcional y confidencial. Priorice acuerdos colaborativos,
        acompañamiento y seguimiento, conforme a los Arts. 5, 19, 20 y 24 BIS
        del Reglamento Interno.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="apoderado-name"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Nombre del Apoderado
          </label>
          <input
            id="apoderado-name"
            aria-label="Nombre del apoderado"
            type="text"
            value={apoderadoName}
            onChange={(e) => onApoderadoNameChange(e.target.value)}
            placeholder="Ingrese el nombre del apoderado"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="coordinator-name"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              {docType === "compromiso_conductual_dupla"
                ? "Nombre de la dupla psicosocial"
                : "Nombre del Coordinador"}
            </label>
            <input
              id="coordinator-name"
              aria-label="Nombre del coordinador"
              type="text"
              value={coordinatorName}
              onChange={(e) => onCoordinatorNameChange(e.target.value)}
              placeholder={
                docType === "compromiso_conductual_dupla"
                  ? "Nombre del profesional de la dupla psicosocial"
                  : "Coordinador de ciclo / convivencia"
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="emitted-by"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
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
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold text-neutral-900">
              Texto de la carta
            </h5>
            <p className="mt-1 text-xs text-neutral-500">
              Estos textos actualizan la plantilla en vivo.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onResetLetterContent}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            Restaurar texto base
          </Button>
        </div>
        <div className="space-y-4">
          {TEXT_FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`letter-${field.key}`}
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                {field.label}
              </label>
              <p className="mb-1 text-xs leading-relaxed text-neutral-500">
                {field.help}
              </p>
              <textarea
                id={`letter-${field.key}`}
                aria-label={field.label}
                value={letterContent[field.key]}
                onChange={(event) =>
                  onLetterContentChange(field.key, event.target.value)
                }
                rows={field.rows}
                className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
