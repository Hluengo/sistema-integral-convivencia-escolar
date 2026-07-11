/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
    if (!selectedId) return;
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
        <span className="ml-2 text-xs text-neutral-500">Cargando plantillas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200/60 bg-white">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          aria-label="Volver al asesor"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-600" />
          <h3 className="text-xs font-semibold text-neutral-900">Plantillas de Documentos</h3>
        </div>
        <span className="text-[9px] text-neutral-400 ml-auto">Edite los prompts usados por la IA</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar - template list */}
        <div className="w-48 border-r border-neutral-200/60 bg-neutral-50 overflow-y-auto shrink-0">
          {templates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => handleSelect(tpl)}
              className={`w-full text-left px-3 py-2.5 text-[10px] font-medium border-b border-neutral-100 transition-colors ${
                selectedId === tpl.id
                  ? 'bg-brand-50 text-brand-700 border-l-2 border-l-brand-600'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {DOC_TYPE_LABELS[tpl.doc_type] || tpl.doc_type}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedId ? (
            <>
              <div className="px-4 py-2 border-b border-neutral-100 bg-white flex items-center justify-between">
                <span className="text-[10px] font-medium text-neutral-500">
                  {templates.find(t => t.id === selectedId)?.label || selectedId}
                </span>
                <div className="flex items-center gap-2">
                  {saveSuccess === selectedId && (
                    <span className="flex items-center gap-1 text-[9px] text-green-600 font-medium animate-fade-in">
                      <CheckCircle className="h-3 w-3" /> Guardado
                    </span>
                  )}
                  {saveError && (
                    <span className="flex items-center gap-1 text-[9px] text-red-600 font-medium">
                      <AlertCircle className="h-3 w-3" /> {saveError}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-300 text-white text-[10px] font-semibold rounded-lg transition-colors"
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
                className="flex-1 w-full p-4 text-[11px] leading-relaxed font-mono text-neutral-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-200"
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
              Seleccione una plantilla para editar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
