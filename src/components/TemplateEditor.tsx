/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { TextBlockSkeleton } from './Skeleton';
import Button from '../shared/ui/Button';

interface Template {
  id: string;
  doc_type: string;
  label: string;
  system_prompt: string;
  updated_at?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  notificacion_apertura: 'Notificación de Apertura de Indagación',
  citacion_entrevista: 'Citación para entrega de notificación',
  informe_cierre_indagacion: 'Informe de Cierre',
  informe_concluyente: 'Informe Concluyente',
};

export default function TemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedIdRef = useRef<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { supabase } = await import('../lib/supabase');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/document-templates/admin', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.status === 401) {
        setLoadError('Sesión no válida. Inicie sesión nuevamente.');
        return;
      }
      if (res.status === 403) {
        setLoadError('Esta sección está disponible solo para Dirección y Administración.');
        return;
      }
      if (!res.ok) {
        setLoadError('No fue posible cargar las plantillas institucionales.');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
        const selected = data.find((template) => template.id === selectedIdRef.current) ?? data[0];
        selectedIdRef.current = selected?.id ?? null;
        setSelectedId(selected?.id ?? null);
        setEditPrompt(selected?.system_prompt ?? '');
      } else {
        setLoadError('La respuesta de plantillas no tiene un formato válido.');
      }
    } catch {
      setLoadError('Error de conexión al cargar las plantillas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    return () => clearTimeout(saveSuccessTimer.current);
  }, [fetchTemplates]);

  const handleSelect = (tpl: Template) => {
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
      const { supabase } = await import('../lib/supabase');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/document-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: selectedId, system_prompt: editPrompt }),
      });

      const result = await res.json();
      if (result.success) {
        setSaveSuccess(selectedId);
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedId ? { ...t, system_prompt: editPrompt } : t)),
        );
        saveSuccessTimer.current = setTimeout(() => setSaveSuccess(null), 2000);
      } else {
        setSaveError(result.error || 'Error al guardar.');
      }
    } catch {
      setSaveError('Error de conexión al guardar.');
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
        <p className="mt-0.5 text-[10px] text-neutral-500">
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
              onClick={() => void fetchTemplates()}
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
              className={`w-full border-neutral-100 border-b px-3 py-2.5 text-left font-medium text-[10px] transition-colors ${
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
                <span className="font-medium text-[10px] text-neutral-500">
                  {templates.find((t) => t.id === selectedId)?.label || selectedId}
                </span>
                <div className="flex items-center gap-2">
                  {saveSuccess === selectedId && (
                    <span className="flex animate-fade-in items-center gap-1 font-medium text-[9px] text-leve-600">
                      <CheckCircle className="h-3 w-3" /> Guardado
                    </span>
                  )}
                  {saveError && (
                    <span className="flex items-center gap-1 font-medium text-[9px] text-gravisima-600">
                      <AlertCircle className="h-3 w-3" /> {saveError}
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving !== null}
                    className="rounded-lg px-3 py-1.5 text-[10px] disabled:bg-neutral-300"
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
                className="min-h-[330px] w-full flex-1 resize-none bg-white p-4 font-mono text-[11px] text-neutral-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-200"
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
