/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileUp, LockKeyhole } from "lucide-react";
import type { Causa } from "../../shared/lib/types";
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_HELPER_TEXT,
  uploadDocument,
} from "../../shared/api/services/storage.service";
import Button from "../../shared/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../shared/ui/Dialog";
import { buildForceClosedCausa } from "./forceCloseCausa";
import {
  fetchHechoEvidencias,
  fetchHechos,
} from "../../shared/api/services/hechos.service";
import { auditarExpediente } from "../../shared/lib/auditoria";

interface ForceCloseCausaDialogProps {
  causa: Causa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (causa: Causa) => void;
}

export default function ForceCloseCausaDialog({
  causa,
  open,
  onOpenChange,
  onConfirm,
}: ForceCloseCausaDialogProps) {
  const [responsable, setResponsable] = useState(
    causa.responsable.split(" (")[0].trim(),
  );
  const [titulo, setTitulo] = useState("Cierre anticipado fundado");
  const [motivo, setMotivo] = useState("");
  const [informe, setInforme] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [ackRisk, setAckRisk] = useState(false);

  const hechosQuery = useQuery({
    queryKey: ["hechos", causa.id, "forceClose"],
    queryFn: () => fetchHechos(causa.id),
    enabled: open,
  });
  const vinculosQuery = useQuery({
    queryKey: ["hecho_evidencias", causa.id, "forceClose"],
    queryFn: () => fetchHechoEvidencias(causa.id),
    enabled: open,
  });
  const audit = auditarExpediente(
    causa,
    hechosQuery.data ?? [],
    vinculosQuery.data ?? [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!responsable.trim() || !titulo.trim() || !motivo.trim()) {
      setError(
        "Complete responsable, título y fundamento antes de cerrar la causa.",
      );
      return;
    }
    if (!audit.puedeCerrar && !ackRisk) {
      setError(
        "Confirme que entiende el riesgo de cerrar con garantías bloqueantes.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const documentoAdjunto = informe
        ? await uploadDocument(causa.id, informe, "documentos")
        : undefined;
      onConfirm(
        buildForceClosedCausa(causa, {
          responsable,
          titulo,
          motivo,
          documentoAdjunto,
        }),
      );
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cerrar la causa.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-10">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole
                className="size-5 text-gravisima-600"
                aria-hidden="true"
              />
              Cerrar causa con fundamento
            </DialogTitle>
            <DialogDescription className="mt-1">
              El expediente {causa.id} pasará a cerrado. Sus hitos, documentos e
              investigación se conservarán y este cierre quedará registrado en
              Historial.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="force-close-responsable"
                className="mb-1.5 block font-semibold text-neutral-700 text-sm"
              >
                Responsable del cierre
              </label>
              <input
                id="force-close-responsable"
                aria-label="Responsable del cierre"
                value={responsable}
                onChange={(event) => setResponsable(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label
                htmlFor="force-close-title"
                className="mb-1.5 block font-semibold text-neutral-700 text-sm"
              >
                Título del cierre
              </label>
              <input
                id="force-close-title"
                aria-label="Título del cierre"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                required
              />
            </div>

            <div>
              <label
                htmlFor="force-close-reason"
                className="block font-semibold text-neutral-700 text-sm"
              >
                Motivo y fundamento
              </label>
              <textarea
                id="force-close-reason"
                aria-label="Motivo y fundamento"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                rows={6}
                className="mt-1.5 w-full resize-y rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Describa los antecedentes y la conclusión que justifican el cierre."
                required
              />
            </div>

            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 transition hover:border-brand-300 hover:bg-brand-50/30">
              <label
                htmlFor="force-close-report"
                className="flex items-center gap-2 font-semibold text-neutral-700 text-sm"
              >
                <FileUp className="size-4 text-brand-600" aria-hidden="true" />
                Informe ad-hoc (opcional)
              </label>
              <span className="mt-1 block text-neutral-500 text-xs">
                {DOCUMENT_UPLOAD_HELPER_TEXT}
              </span>
              <input
                id="force-close-report"
                aria-label="Informe ad-hoc"
                type="file"
                accept={DOCUMENT_UPLOAD_ACCEPT}
                onChange={(event) =>
                  setInforme(event.target.files?.[0] ?? null)
                }
                className="mt-3 block w-full text-neutral-600 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-brand-700 file:text-xs"
              />
              {informe && (
                <span className="mt-2 block truncate text-neutral-600 text-xs">
                  {informe.name}
                </span>
              )}
            </div>

            {!audit.puedeCerrar && (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
              >
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="size-4" /> Auditoría bloqueante —{" "}
                  {audit.verificadas}/{audit.total}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {audit.advertencias.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={ackRisk}
                    onChange={(e) => setAckRisk(e.target.checked)}
                    className="size-4"
                    aria-label="Acepto el riesgo de cerrar con garantías bloqueantes"
                  />
                  Entiendo el riesgo y deseo cerrar con fundamento de todas
                  formas
                </label>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-gravisima-50 px-3 py-2 text-gravisima-700 text-sm"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isSaving}
              disabled={!audit.puedeCerrar && !ackRisk}
            >
              Confirmar cierre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
