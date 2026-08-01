/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ImageUp, Plus, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../shared/ui/Button';
import {
  createPlatformInstitutionRule,
  fetchPlatformInstitutionRules,
  fetchPlatformInstitutionSettings,
  publishPlatformInstitutionRule,
  updatePlatformInstitutionSettings,
  uploadPlatformInstitutionLogo,
  type InstitutionSettings,
} from '../../shared/api/services/institution.service';
import type { PlatformTenant } from '../../shared/api/services/platform.service';

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

interface Props {
  tenants: PlatformTenant[];
}

export default function PlatformInstitutionPanel({ tenants }: Props) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? '');
  const [form, setForm] = useState<Partial<InstitutionSettings>>({});
  const [rule, setRule] = useState({
    title: 'Reglamento Interno de Convivencia Escolar',
    version: '2026.1',
    content: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!tenantId && tenants[0]) setTenantId(tenants[0].id);
  }, [tenantId, tenants]);
  const settingsQuery = useQuery({
    queryKey: ['platform-institution', tenantId],
    queryFn: () => fetchPlatformInstitutionSettings(tenantId),
    enabled: Boolean(tenantId),
  });
  const rulesQuery = useQuery({
    queryKey: ['platform-rules', tenantId],
    queryFn: () => fetchPlatformInstitutionRules(tenantId),
    enabled: Boolean(tenantId),
  });
  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);
  const save = useMutation({
    mutationFn: () => updatePlatformInstitutionSettings(tenantId, form),
    onSuccess: () => {
      setMessage('Configuración del colegio guardada.');
      void queryClient.invalidateQueries({ queryKey: ['platform-institution', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const logo = useMutation({
    mutationFn: (file: File) => uploadPlatformInstitutionLogo(tenantId, file),
    onSuccess: () => {
      setMessage('Logo actualizado.');
      void queryClient.invalidateQueries({ queryKey: ['platform-institution', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const createRule = useMutation({
    mutationFn: () => createPlatformInstitutionRule(tenantId, rule),
    onSuccess: () => {
      setRule((current) => ({ ...current, content: '' }));
      setMessage('Borrador creado.');
      void queryClient.invalidateQueries({ queryKey: ['platform-rules', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const publish = useMutation({
    mutationFn: (id: string) => publishPlatformInstitutionRule(tenantId, id),
    onSuccess: () => {
      setMessage('Reglamento publicado.');
      void queryClient.invalidateQueries({ queryKey: ['platform-rules', tenantId] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const busy = save.isPending || logo.isPending || createRule.isPending || publish.isPending;
  const setField = (key: keyof InstitutionSettings, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
            <Building2 className="size-5" />
          </span>
          <div>
            <h3 className="font-bold text-neutral-900">Administración institucional global</h3>
            <p className="mt-1 text-neutral-500 text-xs">
              El superadministrador puede configurar cualquier colegio sin cambiar de sesión.
            </p>
          </div>
        </div>
        <label className="mt-5 block space-y-1.5 text-xs font-semibold text-neutral-700">
          Colegio seleccionado
          <select
            aria-label="Colegio seleccionado"
            className={inputClass}
            value={tenantId}
            onChange={(event) => {
              setTenantId(event.target.value);
              setForm({});
            }}
          >
            <option value="">Seleccione un colegio</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      {tenantId ? (
        <>
          <section className="card p-5 sm:p-6">
            <h3 className="font-bold text-neutral-900">Perfil institucional</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['official_name', 'Nombre oficial'],
                  ['institution_rut', 'RUT institucional'],
                  ['address', 'Dirección'],
                  ['commune', 'Comuna'],
                  ['region', 'Región'],
                  ['phone', 'Teléfono'],
                  ['institutional_email', 'Correo institucional'],
                  ['proprietor', 'Sostenedor'],
                  ['director_name', 'Director/a'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="space-y-1.5 text-xs font-semibold text-neutral-700">
                  {label}
                  <input
                    aria-label={label}
                    className={inputClass}
                    value={(form[key] as string) ?? ''}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button disabled={busy} onClick={() => save.mutate()}>
                <Save className="size-4" /> Guardar configuración
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 font-semibold text-neutral-700 text-sm">
                <ImageUp className="size-4" /> Cargar logo
                <input
                  aria-label="Cargar logo institucional"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) logo.mutate(file);
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
              ) : null}
            </div>
          </section>
          <section className="card overflow-hidden">
            <div className="border-b border-neutral-200/70 p-5 sm:p-6">
              <h3 className="font-bold text-neutral-900">Reglamento y reglas</h3>
            </div>
            <form
              className="grid gap-3 p-5 sm:grid-cols-[1fr_140px] sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                createRule.mutate();
              }}
            >
              <input
                aria-label="Título del reglamento"
                className={inputClass}
                value={rule.title}
                onChange={(event) =>
                  setRule((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Título"
              />
              <input
                aria-label="Versión del reglamento"
                className={inputClass}
                value={rule.version}
                onChange={(event) =>
                  setRule((current) => ({ ...current, version: event.target.value }))
                }
                placeholder="Versión"
              />
              <textarea
                aria-label="Contenido del reglamento"
                className={`${inputClass} min-h-36 sm:col-span-2`}
                value={rule.content}
                onChange={(event) =>
                  setRule((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Contenido del reglamento…"
              />
              <Button
                type="submit"
                disabled={busy || !rule.content.trim()}
                className="sm:col-span-2 sm:justify-self-start"
              >
                <Plus className="size-4" /> Crear borrador
              </Button>
            </form>
            <div className="divide-y divide-neutral-100 border-t border-neutral-200/70">
              {(rulesQuery.data?.rules ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold text-neutral-800">
                      {item.title} · v{item.version}
                    </p>
                    <p className="text-neutral-500 text-xs">
                      {item.status === 'active'
                        ? 'Vigente'
                        : item.status === 'draft'
                          ? 'Borrador'
                          : 'Archivado'}
                    </p>
                  </div>
                  {item.status === 'active' ? (
                    <span className="rounded-full bg-leve-50 px-3 py-1.5 font-semibold text-leve-700 text-xs">
                      Vigente
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => publish.mutate(item.id)}
                      className="rounded-lg px-3 py-2 text-xs"
                    >
                      <CheckCircle2 className="size-4" /> Publicar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="card p-6 text-neutral-500 text-sm">
          Seleccione un colegio para administrar su configuración.
        </p>
      )}
      {message ? (
        <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-brand-800 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
