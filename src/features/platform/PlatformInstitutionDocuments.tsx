/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { Archive, FileText, Upload } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../shared/ui/Button';
import { formatChileDateTime } from '../../shared/lib/dateTime';
import {
  archivePlatformInstitutionDocument,
  fetchPlatformInstitutionDocuments,
  uploadPlatformInstitutionDocument,
} from '../../shared/api/services/institution.service';

const INPUT_CLASS =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const CATEGORIES = [
  ['reglamento', 'Reglamento'],
  ['protocolo', 'Protocolo'],
  ['manual', 'Manual'],
  ['otro', 'Otro'],
] as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  tenantId: string;
}

export default function PlatformInstitutionDocuments({ tenantId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('otro');
  const queryClient = useQueryClient();
  const documentsQuery = useQuery({
    queryKey: ['platform-documents', tenantId],
    queryFn: () => fetchPlatformInstitutionDocuments(tenantId),
    enabled: Boolean(tenantId),
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Seleccione un documento.');
      return uploadPlatformInstitutionDocument(tenantId, file, title.trim(), category);
    },
    onSuccess: () => {
      setFile(null);
      setTitle('');
      void queryClient.invalidateQueries({ queryKey: ['platform-documents', tenantId] });
    },
  });
  const archive = useMutation({
    mutationFn: (id: string) => archivePlatformInstitutionDocument(tenantId, id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['platform-documents', tenantId] }),
  });
  const busy = upload.isPending || archive.isPending;

  if (!tenantId) {
    return (
      <p className="card p-6 text-neutral-500 text-sm">
        Seleccione un colegio para administrar sus documentos institucionales.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
            <Upload className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-neutral-900">Documentos institucionales</h3>
            <p className="mt-1 text-neutral-500 text-xs">
              Cargue reglamentos, protocolos y manuales del colegio seleccionado. Máximo 20 MB por
              archivo.
            </p>
          </div>
        </div>
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            upload.mutate();
          }}
        >
          <input
            aria-label="Título del documento"
            className={INPUT_CLASS}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título del documento"
          />
          <select
            aria-label="Categoría del documento"
            className={INPUT_CLASS}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Archivo institucional"
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.txt,.png,.jpg,.jpeg,.svg"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 file:text-xs hover:file:bg-brand-100 sm:col-span-2"
          />
          <Button
            type="submit"
            disabled={busy || !file}
            className="rounded-xl px-4 py-2.5 sm:col-span-2 sm:justify-self-start"
          >
            <Upload className="size-4" aria-hidden="true" /> Subir documento
          </Button>
        </form>
        {upload.isError ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-gravisima-50 px-4 py-3 text-gravisima-700 text-sm"
          >
            {upload.error instanceof Error
              ? upload.error.message
              : 'No fue posible cargar el documento.'}
          </p>
        ) : null}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-neutral-200/70 p-5 sm:p-6">
          <h3 className="font-bold text-neutral-900">Archivos del colegio</h3>
        </div>
        <div className="divide-y divide-neutral-100">
          {documentsQuery.isLoading ? (
            <p className="p-6 text-neutral-500 text-sm">Cargando documentos…</p>
          ) : documentsQuery.isError ? (
            <p role="alert" className="p-6 text-gravisima-700 text-sm">
              No fue posible cargar los documentos.
            </p>
          ) : (documentsQuery.data?.documents ?? []).length === 0 ? (
            <p className="p-6 text-neutral-500 text-sm">Aún no hay documentos institucionales.</p>
          ) : (
            documentsQuery.data?.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-800">{document.title}</p>
                    <p className="mt-1 text-neutral-500 text-xs">
                      {document.category} · {formatSize(document.size_bytes)} ·{' '}
                      {formatChileDateTime(document.uploaded_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {document.download_url ? (
                    <a
                      href={document.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 text-xs hover:bg-neutral-50"
                    >
                      Ver archivo
                    </a>
                  ) : null}
                  {document.status === 'active' ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => archive.mutate(document.id)}
                      className="rounded-lg px-3 py-2 text-xs"
                    >
                      <Archive className="size-4" aria-hidden="true" /> Archivar
                    </Button>
                  ) : (
                    <span className="rounded-lg bg-neutral-100 px-3 py-2 font-semibold text-neutral-500 text-xs">
                      Archivado
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
