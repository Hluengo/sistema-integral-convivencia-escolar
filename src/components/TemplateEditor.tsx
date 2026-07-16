/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle, FileText, ArrowLeft } from 'lucide-react';

interface Template {
  id: string;
  doc_type: string;
  label: string;
  system_prompt: string;
  updated_at?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  notificacion_apertura: 'Notificación de Apertura',
  citacion_entrevista: 'Citación a Entrevista',
  informe_cierre_indagacion: 'Informe de Cierre',
  informe_concluyente: 'Informe Concluyente',
};

export default function TemplateEditor({ onBack }: { onBack: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/document-templates');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
        if (!selectedId && data.length > 0) {
          setSelectedId(data[0].id);
          setEditPrompt(data[0].system_prompt);
        }
      }
    } catch {
      setSaveError('Error al cargar plantillas.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelect = (tpl: Template) => {
    setSelectedId(tpl.id);
    setEditPrompt(tpl.system_prompt);
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!selectedId) { return; }
    setSaving(selectedId);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
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
        setTemplates(prev =>
          prev.map(t => t.id === selectedId ? { ...t, system_prompt: editPrompt } : t)
        );
        setTimeout(() => setSaveSuccess(null), 2000);
      } else {
        setSaveError(result.error || 'Error al guardar.');
      }
    } catch {
      setSaveError('Error de conexión al guardar.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        <span className="ml-2 text-neutral-500 text-xs">Cargando plantillas...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-neutral-200/60 border-b bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Volver al asesor"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-600" />
          <h3 className="font-semibold text-neutral-900 text-xs">Plantillas de Documentos</h3>
        </div>
        <span className="ml-auto text-[9px] text-neutral-400">Edite los prompts usados por la IA</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar - template list */}
        <div className="w-48 shrink-0 overflow-y-auto border-neutral-200/60 border-r bg-neutral-50">
          {templates.map(tpl => (
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
                  {templates.find(t => t.id === selectedId)?.label || selectedId}
                </span>
                <div className="flex items-center gap-2">
                  {saveSuccess === selectedId && (
                    <span className="flex animate-fade-in items-center gap-1 font-medium text-[9px] text-green-600">
                      <CheckCircle className="h-3 w-3" /> Guardado
                    </span>
                  )}
                  {saveError && (
                    <span className="flex items-center gap-1 font-medium text-[9px] text-red-600">
                      <AlertCircle className="h-3 w-3" /> {saveError}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-[10px] text-white transition-colors hover:bg-brand-700 disabled:bg-neutral-300"
                  >
                    {saving === selectedId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="w-full flex-1 resize-none bg-white p-4 font-mono text-[11px] text-neutral-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-200"
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
