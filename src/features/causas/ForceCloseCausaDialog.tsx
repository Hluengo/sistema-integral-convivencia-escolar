/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { FileUp, LockKeyhole } from 'lucide-react';
import type { Causa } from '../../shared/lib/types';
import {
  DOCUMENT_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_HELPER_TEXT,
  uploadDocument,
} from '../../shared/api/services/storage.service';
import Button from '../../shared/ui/Button';
import ImproveTextarea from '../../shared/ImproveTextarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../shared/ui/Dialog';
import { buildForceClosedCausa } from './forceCloseCausa';

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
  const [responsable, setResponsable] = useState(causa.responsable.split(' (')[0].trim());
  const [titulo, setTitulo] = useState('Cierre anticipado fundado');
  const [motivo, setMotivo] = useState('');
  const [informe, setInforme] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!responsable.trim() || !titulo.trim() || !motivo.trim()) {
      setError('Complete responsable, título y fundamento antes de cerrar la causa.');
      return;
    }

    setIsSaving(true);
    try {
      const documentoAdjunto = informe
        ? await uploadDocument(causa.id, informe, 'documentos')
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
      setError(cause instanceof Error ? cause.message : 'No fue posible cerrar la causa.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-10">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-gravisima-600" aria-hidden="true" />
              Cerrar causa con fundamento
            </DialogTitle>
            <DialogDescription className="mt-1">
              El expediente {causa.id} pasará a cerrado. Sus hitos, documentos e investigación se
              conservarán y este cierre quedará registrado en Historial.
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

            <ImproveTextarea
              id="force-close-reason"
              label="Motivo y fundamento"
              value={motivo}
              onChange={setMotivo}
              rows={6}
              improvementContext="cierre_causa"
              className="mt-1.5 w-full resize-y rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Describa los antecedentes y la conclusión que justifican el cierre."
              required
            />

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
                onChange={(event) => setInforme(event.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-neutral-600 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-brand-700 file:text-xs"
              />
              {informe && (
                <span className="mt-2 block truncate text-neutral-600 text-xs">{informe.name}</span>
              )}
            </div>

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
            <Button type="submit" variant="danger" isLoading={isSaving}>
              Confirmar cierre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
