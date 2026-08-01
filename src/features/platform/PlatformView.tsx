/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Download, RefreshCw, ShieldCheck, Upload, Users } from 'lucide-react';
import Button from '../../shared/ui/Button';
import SummaryCard from '../../shared/ui/SummaryCard';
import PageHero from '../../shared/ui/PageHero';
import PlatformInstitutionPanel from './PlatformInstitutionPanel';
import { formatChileDateTime } from '../../shared/lib/dateTime';
import {
  fetchPlatformTenants,
  importTenantBase,
  provisionTenant,
  resendTenantAdminInvitation,
  type PlatformTenant,
} from '../../shared/api/services/platform.service';

type PlatformTab = 'colegios' | 'institucional' | 'importar' | 'plan';

const tabs: Array<{ id: PlatformTab; label: string; icon: typeof Users }> = [
  { id: 'colegios', label: 'Colegios', icon: Building2 },
  { id: 'institucional', label: 'Configuración institucional', icon: Building2 },
  { id: 'importar', label: 'Importar base', icon: Upload },
  { id: 'plan', label: 'Plan y límites', icon: ShieldCheck },
];

const SELECT_CLASS =
  'rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const INPUT_CLASS =
  'rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function PlatformError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="rounded-2xl border border-gravisima-200 bg-gravisima-50 p-6 text-center">
      <p className="font-semibold text-gravisima-800">
        {message ?? 'No fue posible cargar esta información.'}
      </p>
      <Button variant="secondary" onClick={onRetry} className="mt-4 rounded-lg px-3 py-2 text-xs">
        <RefreshCw className="size-3.5" aria-hidden="true" /> Reintentar
      </Button>
    </div>
  );
}

export default function PlatformView() {
  const [activeTab, setActiveTab] = useState<PlatformTab>('colegios');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [importTenantId, setImportTenantId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLevel, setImportLevel] = useState<'BASICA' | 'MEDIA'>('BASICA');
  const [importResult, setImportResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: fetchPlatformTenants,
    retry: false,
  });

  const tenants = useMemo(() => tenantsQuery.data?.tenants ?? [], [tenantsQuery.data]);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });

  const createMutation = useMutation({
    mutationFn: () =>
      provisionTenant({
        name: name.trim(),
        adminEmail: adminEmail.trim(),
        slug: slug.trim() || undefined,
      }),
    onSuccess: () => {
      setName('');
      setAdminEmail('');
      setSlug('');
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (error: unknown) =>
      setOperationError(
        error instanceof Error ? error.message : 'No fue posible crear el colegio.',
      ),
  });

  const resendMutation = useMutation({
    mutationFn: (tenantId: string) => resendTenantAdminInvitation(tenantId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
    onError: (error: unknown) =>
      setOperationError(
        error instanceof Error ? error.message : 'No fue posible reenviar la invitación.',
      ),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile || !importTenantId)
        throw new Error('Seleccione un colegio y un archivo .xlsx.');
      return importTenantBase(importTenantId, importFile, importLevel);
    },
    onSuccess: (data) => {
      setImportResult(
        `${data.coursesInserted} cursos y ${data.studentsInserted} estudiantes importados. ` +
          `Duplicados omitidos: ${data.duplicates}.` +
          (data.errors.length > 0 ? ` Advertencias: ${data.errors.length}.` : ''),
      );
      setImportFile(null);
    },
    onError: (error: unknown) =>
      setImportResult(error instanceof Error ? error.message : 'No fue posible importar la base.'),
  });

  const totalUsers = useMemo(
    () => tenants.reduce((sum, t) => sum + (t.user_count ?? 0), 0),
    [tenants],
  );
  const isBusy = createMutation.isPending || resendMutation.isPending || importMutation.isPending;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHero
        eyebrow="Plataforma · Superadministración"
        title="Gestión de colegios"
        description="Crea establecimientos, invita administradores y carga cursos y estudiantes."
        action={
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-blue-50 text-xs ring-1 ring-white/20 backdrop-blur-sm">
            <ShieldCheck className="size-4" aria-hidden="true" /> Acceso superadministrador
          </div>
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-xs transition-colors sm:px-4 ${
              activeTab === id
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
            }`}
            aria-pressed={activeTab === id}
          >
            <Icon className="size-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {tenantsQuery.isError ? <PlatformError onRetry={refresh} /> : null}
      {operationError ? (
        <PlatformError message={operationError} onRetry={() => setOperationError(null)} />
      ) : null}

      {activeTab === 'colegios' && !tenantsQuery.isError && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={Building2}
              label="Colegios"
              value={tenantsQuery.isLoading ? '—' : String(tenants.length)}
            />
            <SummaryCard
              icon={Users}
              label="Usuarios totales"
              value={tenantsQuery.isLoading ? '—' : String(totalUsers)}
            />
            <SummaryCard icon={ShieldCheck} label="Rol activo" value="Superadmin" />
          </div>

          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-neutral-900">Crear un colegio</h3>
                <p className="mt-1 text-neutral-500 text-xs">
                  Se invitará al administrador por correo y se precargarán las plantillas por
                  defecto. El slug se autogenera desde el nombre si se deja en blanco.
                </p>
              </div>
            </div>
            <form
              className="mt-5 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <input
                aria-label="Nombre del colegio"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre del establecimiento"
                className={INPUT_CLASS}
              />
              <input
                aria-label="Correo del administrador"
                type="email"
                required
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="admin@establecimiento.cl"
                className={INPUT_CLASS}
              />
              <input
                aria-label="Slug (opcional)"
                type="text"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="colegio-san-jose (opcional)"
                className={INPUT_CLASS}
              />
              <Button
                type="submit"
                disabled={isBusy}
                className="rounded-xl px-4 py-2.5 text-sm sm:self-end"
              >
                Crear colegio
              </Button>
            </form>
          </section>

          <section className="card overflow-hidden">
            <div className="border-neutral-200/70 border-b px-5 py-4">
              <h3 className="font-bold text-neutral-900">Colegios registrados</h3>
              <p className="mt-1 text-neutral-500 text-xs">
                Cada colegio opera con su tenant aislado.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Slug</th>
                    <th className="px-5 py-3">Usuarios</th>
                    <th className="px-5 py-3">Creado</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {tenantsQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">
                        Cargando colegios…
                      </td>
                    </tr>
                  ) : tenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">
                        Aún no hay colegios registrados.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((tenant: PlatformTenant) => (
                      <tr key={tenant.id} className="align-middle hover:bg-neutral-50">
                        <td className="px-5 py-3 font-semibold text-neutral-800">{tenant.name}</td>
                        <td className="px-5 py-3 text-neutral-500">{tenant.slug}</td>
                        <td className="px-5 py-3 text-neutral-500">{tenant.user_count}</td>
                        <td className="px-5 py-3 text-neutral-500 text-xs">
                          {formatChileDateTime(tenant.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => resendMutation.mutate(tenant.id)}
                            className="rounded-lg px-3 py-2 text-xs"
                          >
                            Reenviar invitación
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'importar' && !tenantsQuery.isError && (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                <Upload className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-neutral-900">Importar cursos y estudiantes</h3>
                <p className="mt-1 text-neutral-500 text-xs">
                  Formato: dos hojas — «Cursos» (name, level, position) y «Estudiantes» (full_name,
                  rut, curso). Si solo viene «Estudiantes», los cursos se derivan de la columna
                  «curso».
                </p>
              </div>
            </div>
            <form
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                importMutation.mutate();
              }}
            >
              <select
                aria-label="Colegio destino"
                value={importTenantId}
                onChange={(event) => setImportTenantId(event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Seleccione un colegio</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Nivel por defecto"
                value={importLevel}
                onChange={(event) => setImportLevel(event.target.value as 'BASICA' | 'MEDIA')}
                className={SELECT_CLASS}
              >
                <option value="BASICA">Básica</option>
                <option value="MEDIA">Media</option>
              </select>
              <input
                aria-label="Archivo Excel"
                type="file"
                accept=".xlsx"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 file:text-xs hover:file:bg-brand-100"
              />
              <Button
                type="submit"
                disabled={isBusy || !importFile || !importTenantId}
                className="rounded-xl px-4 py-2.5 text-sm sm:col-span-3 sm:self-end"
              >
                <Upload className="size-4" aria-hidden="true" /> Subir base
              </Button>
            </form>
            {importResult ? (
              <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-neutral-700 text-xs">
                {importResult}
              </p>
            ) : null}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                <Download className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-neutral-900">Plantilla vacía</h3>
                <p className="mt-1 text-neutral-500 text-xs">
                  Descargue una plantilla .xlsx con las hojas y encabezados esperados para cargarla
                  luego.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                const { default: writeExcelFile } = await import('write-excel-file/browser');
                const cursos = [[{ value: 'name' }, { value: 'level' }, { value: 'position' }]];
                const estudiantes = [
                  [{ value: 'full_name' }, { value: 'rut' }, { value: 'curso' }],
                ];
                await writeExcelFile([
                  { sheet: 'Cursos', data: cursos },
                  { sheet: 'Estudiantes', data: estudiantes },
                ]).toFile('plantilla-base-colegio.xlsx');
              }}
              className="mt-4 rounded-xl px-4 py-2.5 text-sm"
            >
              <Download className="size-4" aria-hidden="true" /> Descargar plantilla
            </Button>
          </section>
        </div>
      )}

      {activeTab === 'institucional' && !tenantsQuery.isError && (
        <PlatformInstitutionPanel tenants={tenants} />
      )}

      {activeTab === 'plan' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard icon={ShieldCheck} label="Plan actual" value="Operativo" />
            <SummaryCard icon={Building2} label="Colegios" value={String(tenants.length)} />
            <SummaryCard icon={Users} label="Usuarios totales" value={String(totalUsers)} />
          </div>
          <section className="card p-5 sm:p-6">
            <h3 className="font-bold text-neutral-900">Facturación</h3>
            <p className="mt-1 text-neutral-500 text-xs">
              Sin integración de pago en esta iteración. Cada colegio opera con su tenant aislado
              sin límites bloqueantes.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
