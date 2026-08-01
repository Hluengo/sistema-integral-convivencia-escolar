/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ImageUp, Plus, RefreshCw, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../shared/ui/Button';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import {
  createInstitutionRule,
  fetchInstitutionRules,
  fetchInstitutionSettings,
  publishInstitutionRule,
  updateInstitutionSettings,
  uploadInstitutionLogo,
  type InstitutionSettings,
} from '../../shared/api/services/institution.service';

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

type SettingsForm = Omit<
  InstitutionSettings,
  'tenant_id' | 'logo_path' | 'logo_url' | 'updated_at' | 'updated_by'
>;

const emptyForm: SettingsForm = {
  official_name: '',
  institution_rut: '',
  address: '',
  commune: '',
  region: '',
  phone: '',
  institutional_email: '',
  proprietor: '',
  director_name: '',
  education_levels: [],
};

export default function InstitutionSettingsPanel() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['institution-settings', tenantId],
    queryFn: fetchInstitutionSettings,
    enabled: Boolean(tenantId),
  });
  const rulesQuery = useQuery({
    queryKey: ['institution-rules', tenantId],
    queryFn: fetchInstitutionRules,
    enabled: Boolean(tenantId),
  });
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [ruleTitle, setRuleTitle] = useState('Reglamento Interno de Convivencia Escolar');
  const [ruleVersion, setRuleVersion] = useState('2026.1');
  const [ruleContent, setRuleContent] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const {
      tenant_id: _tenant,
      logo_path: _path,
      logo_url: _url,
      updated_at: _updated,
      updated_by: _by,
      ...values
    } = settingsQuery.data;
    setForm(values);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateInstitutionSettings(form),
    onSuccess: () => {
      setMessage('Perfil institucional guardado.');
      void queryClient.invalidateQueries({ queryKey: ['institution-settings', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const logoMutation = useMutation({
    mutationFn: uploadInstitutionLogo,
    onSuccess: () => {
      setMessage('Logo actualizado.');
      void queryClient.invalidateQueries({ queryKey: ['institution-settings', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const ruleMutation = useMutation({
    mutationFn: () =>
      createInstitutionRule({ title: ruleTitle, version: ruleVersion, content: ruleContent }),
    onSuccess: () => {
      setRuleContent('');
      setMessage('Borrador de reglamento creado.');
      void queryClient.invalidateQueries({ queryKey: ['institution-rules', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const publishMutation = useMutation({
    mutationFn: publishInstitutionRule,
    onSuccess: () => {
      setMessage('Versión publicada como vigente.');
      void queryClient.invalidateQueries({ queryKey: ['institution-rules', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const busy =
    saveMutation.isPending ||
    logoMutation.isPending ||
    ruleMutation.isPending ||
    publishMutation.isPending;

  if (settingsQuery.isError || rulesQuery.isError) {
    return (
      <div className="card p-6 text-center text-neutral-600">
        <p>No fue posible cargar la configuración institucional.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            void settingsQuery.refetch();
            void rulesQuery.refetch();
          }}
        >
          <RefreshCw className="size-4" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="flex items-start gap-3 border-b border-neutral-200/70 p-5 sm:p-6">
          <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
            <Building2 className="size-5" />
          </span>
          <div>
            <h3 className="font-bold text-neutral-900">Perfil institucional</h3>
            <p className="mt-1 text-neutral-500 text-xs">
              Estos datos se usarán en cartas, reportes y documentos del colegio.
            </p>
          </div>
        </div>
        <form
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          {(
            [
              ['official_name', 'Nombre oficial', 'text'],
              ['institution_rut', 'RUT institucional', 'text'],
              ['address', 'Dirección', 'text'],
              ['commune', 'Comuna', 'text'],
              ['region', 'Región', 'text'],
              ['phone', 'Teléfono', 'tel'],
              ['institutional_email', 'Correo institucional', 'email'],
              ['proprietor', 'Sostenedor', 'text'],
              ['director_name', 'Director/a', 'text'],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="space-y-1.5 text-xs font-semibold text-neutral-700">
              {label}
              <input
                aria-label={label}
                type={type}
                className={inputClass}
                value={form[key] ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </label>
          ))}
          <label className="space-y-1.5 text-xs font-semibold text-neutral-700 sm:col-span-2">
            Niveles educativos
            <select
              aria-label="Niveles educativos"
              multiple
              className={`${inputClass} min-h-28`}
              value={form.education_levels}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  education_levels: Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                }))
              }
            >
              <option value="BASICA">Educación Básica</option>
              <option value="MEDIA">Educación Media</option>
              <option value="PARVULARIA">Educación Parvularia</option>
              <option value="ADULTOS">Educación de Adultos</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              <Save className="size-4" /> Guardar perfil
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 font-semibold text-neutral-700 text-sm hover:bg-neutral-50">
              <ImageUp className="size-4" /> {logoMutation.isPending ? 'Cargando…' : 'Cargar logo'}
              <input
                aria-label="Cargar logo institucional"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) logoMutation.mutate(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {settingsQuery.data?.logo_url ? (
              <img
                src={settingsQuery.data.logo_url}
                alt="Logo institucional"
                className="h-10 max-w-36 rounded border border-neutral-200 object-contain p-1"
              />
            ) : (
              <span className="text-neutral-500 text-xs">No hay logo cargado.</span>
            )}
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-neutral-200/70 p-5 sm:p-6">
          <h3 className="font-bold text-neutral-900">Reglamento y reglas de convivencia</h3>
          <p className="mt-1 text-neutral-500 text-xs">
            Administra versiones sin alterar los umbrales operativos de anotaciones.
          </p>
        </div>
        <form
          className="grid gap-3 p-5 sm:grid-cols-[1fr_140px] sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            ruleMutation.mutate();
          }}
        >
          <input
            aria-label="Título del reglamento"
            className={inputClass}
            placeholder="Título del reglamento"
            value={ruleTitle}
            onChange={(event) => setRuleTitle(event.target.value)}
          />
          <input
            aria-label="Versión del reglamento"
            className={inputClass}
            placeholder="Versión"
            value={ruleVersion}
            onChange={(event) => setRuleVersion(event.target.value)}
          />
          <textarea
            aria-label="Contenido del reglamento"
            className={`${inputClass} min-h-40 sm:col-span-2`}
            placeholder="Contenido o resumen institucional del reglamento…"
            value={ruleContent}
            onChange={(event) => setRuleContent(event.target.value)}
            maxLength={200000}
          />
          <Button
            type="submit"
            disabled={busy || !ruleContent.trim()}
            className="sm:col-span-2 sm:justify-self-start"
          >
            <Plus className="size-4" /> Crear borrador
          </Button>
        </form>
        <div className="divide-y divide-neutral-100 border-t border-neutral-200/70">
          {(rulesQuery.data?.rules ?? []).length === 0 ? (
            <p className="p-5 text-neutral-500 text-sm">Aún no hay versiones del reglamento.</p>
          ) : (
            rulesQuery.data?.rules.map((rule) => (
              <article
                key={rule.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-neutral-800">
                    {rule.title} · v{rule.version}
                  </p>
                  <p className="mt-1 text-neutral-500 text-xs">
                    {rule.status === 'active'
                      ? 'Vigente'
                      : rule.status === 'draft'
                        ? 'Borrador'
                        : 'Archivado'}{' '}
                    · {rule.content.length.toLocaleString('es-CL')} caracteres
                  </p>
                </div>
                {rule.status !== 'active' ? (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => publishMutation.mutate(rule.id)}
                    className="rounded-lg px-3 py-2 text-xs"
                  >
                    <CheckCircle2 className="size-4" /> Publicar
                  </Button>
                ) : (
                  <span className="rounded-full bg-leve-50 px-3 py-1.5 font-semibold text-leve-700 text-xs">
                    Vigente
                  </span>
                )}
              </article>
            ))
          )}
        </div>
      </section>
      {message ? (
        <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-brand-800 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
