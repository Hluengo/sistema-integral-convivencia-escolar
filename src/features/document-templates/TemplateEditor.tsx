/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { TextBlockSkeleton } from '../../shared/Skeleton';
import Button from '../../shared/ui/Button';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import {
  fetchAdminDocumentTemplates,
  type DocumentTemplate,
  updateDocumentTemplate,
} from '../../shared/api/services/documentTemplates.service';

const DOC_TYPE_LABELS: Record<string, string> = {
  notificacion_apertura: 'Notificación de Apertura de Indagación',
  citacion_entrevista: 'Citación para entrega de notificación',
  informe_cierre_indagacion: 'Informe de Cierre',
  informe_concluyente: 'Informe Concluyente',
};

export default function TemplateEditor() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedIdRef = useRef<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['document-templates', tenantId],
    queryFn: fetchAdminDocumentTemplates,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!templatesQuery.data) return;
    setTemplates(templatesQuery.data);
    const selected =
      templatesQuery.data.find((template) => template.id === selectedIdRef.current) ??
      templatesQuery.data[0];
    selectedIdRef.current = selected?.id ?? null;
    setSelectedId(selected?.id ?? null);
    setEditPrompt(selected?.system_prompt ?? '');
    return () => clearTimeout(saveSuccessTimer.current);
  }, [templatesQuery.data]);

  const loading = templatesQuery.isLoading;
  const loadError = templatesQuery.error instanceof Error ? templatesQuery.error.message : null;

  const handleSelect = (tpl: DocumentTemplate) => {
    selectedIdRef.current = tpl.id;
    setSelectedId(tpl.id);
    setEditPrompt(tpl.system_prompt);
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!selectedId || saving) {
      return;
    }
    setSaving(selectedId);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      await updateDocumentTemplate({ id: selectedId, systemPrompt: editPrompt });
      setSaveSuccess(selectedId);
      queryClient.setQueryData<DocumentTemplate[]>(['document-templates', tenantId], (current) =>
        current?.map((template) =>
          template.id === selectedId ? { ...template, system_prompt: editPrompt } : template,
        ),
      );
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === selectedId ? { ...template, system_prompt: editPrompt } : template,
        ),
      );
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(null), 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Error de conexión al guardar.');
    } finally {
      setSaving(null);
    }
  };

  const header = (
    <div className="flex items-start gap-3 border-neutral-200/60 border-b bg-white px-4 py-3 sm:px-5">
      <span className="rounded-lg bg-brand-50 p-2 text-brand-700" aria-hidden="true">
        <FileText className="h-4 w-4" />
      </span>
      <div>
        <h3 className="font-semibold text-neutral-900 text-sm">Plantillas institucionales</h3>
        <p className="mt-0.5 text-10px text-neutral-500">
          Administración de instrucciones para futuras generaciones de documentos.
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[280px] bg-white">
        {header}
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <TextBlockSkeleton lines={2} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[280px] bg-white">
        {header}
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <span className="rounded-xl bg-grave-50 p-3 text-grave-700" aria-hidden="true">
            <LockKeyhole className="size-5" />
          </span>
          <h4 className="mt-3 font-semibold text-neutral-900 text-sm">Acceso a plantillas</h4>
          <p className="mt-1 max-w-md text-neutral-500 text-sm">{loadError}</p>
          {loadError.includes('conexión') || loadError.includes('cargar las plantillas') ? (
            <Button
              variant="secondary"
              onClick={() => void templatesQuery.refetch()}
              className="mt-4 rounded-lg px-3 py-2 text-xs"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="min-h-[280px] bg-white">
        {header}
        <div className="px-5 py-14 text-center">
          <FileText className="mx-auto size-6 text-neutral-300" aria-hidden="true" />
          <h4 className="mt-3 font-semibold text-neutral-900 text-sm">
            No hay plantillas institucionales disponibles
          </h4>
          <p className="mx-auto mt-1 max-w-md text-neutral-500 text-sm">
            Un perfil autorizado debe cargar las cuatro plantillas iniciales para habilitar su
            edición.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[440px] flex-col bg-white">
      {header}

      <div className="flex min-h-0 flex-1">
        {/* Sidebar - template list */}
        <div className="w-48 shrink-0 overflow-y-auto border-neutral-200/60 border-r bg-neutral-50">
          {templates.map((tpl) => (
            <button
              type="button"
              key={tpl.id}
              onClick={() => handleSelect(tpl)}
              className={`w-full border-neutral-100 border-b px-3 py-2.5 text-left font-medium text-10px transition-colors ${
                selectedId === tpl.id
                  ? 'border-l-2 border-l-brand-600 bg-brand-50 text-brand-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {DOC_TYPE_LABELS[tpl.doc_type] || tpl.doc_type}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selectedId ? (
            <>
              <div className="flex items-center justify-between border-neutral-100 border-b bg-white px-4 py-2">
                <span className="font-medium text-10px text-neutral-500">
                  {templates.find((t) => t.id === selectedId)?.label || selectedId}
                </span>
                <div className="flex items-center gap-2">
                  {saveSuccess === selectedId && (
                    <span className="flex animate-fade-in items-center gap-1 font-medium text-9px text-leve-600">
                      <CheckCircle className="h-3 w-3" /> Guardado
                    </span>
                  )}
                  {saveError && (
                    <span className="flex items-center gap-1 font-medium text-9px text-gravisima-600">
                      <AlertCircle className="h-3 w-3" /> {saveError}
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving !== null}
                    className="rounded-lg px-3 py-1.5 text-10px disabled:bg-neutral-300"
                  >
                    {saving === selectedId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Guardar
                  </Button>
                </div>
              </div>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="min-h-[330px] w-full flex-1 resize-none bg-white p-4 font-mono text-11px text-neutral-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-200"
                spellCheck={false}
                aria-label="Contenido del prompt"
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-neutral-400 text-xs">
              Seleccione una plantilla para editar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
