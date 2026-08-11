/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  Building2,
  Download,
  FileText,
  Mail,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import TemplateEditor from '../document-templates/TemplateEditor';
import ErrorBoundary from '../../shared/ui/ErrorBoundary';
import InstitutionSettingsPanel from './InstitutionSettingsPanel';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import PageHeader from '../../shared/ui/PageHeader';
import Select from '../../shared/ui/Select';
import SummaryCard from '../../shared/ui/SummaryCard';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import { useCoursesQuery } from '../../shared/lib/hooks/useCoursesQuery';
import {
  ADMIN_ROLES,
  cancelAdminInvitation,
  fetchAdminMembers,
  fetchUsageStats,
  importOwnTenantBase,
  inviteAdminMember,
  resendAdminInvitation,
  updateAdminMember,
  type AdminMember,
  type AdminMemberRole,
  type AdminRole,
} from '../../shared/api/services/admin.service';

type AdminTab = 'overview' | 'users' | 'institution' | 'templates' | 'import';

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Users }> = [
  { id: 'overview', label: 'Resumen', icon: BarChart3 },
  { id: 'users', label: 'Usuarios y acceso', icon: Users },
  { id: 'institution', label: 'Perfil y reglamento', icon: Building2 },
  { id: 'templates', label: 'Plantillas', icon: FileText },
  { id: 'import', label: 'Importar base', icon: Upload },
];

const roleLabels: Record<AdminMemberRole, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  direccion: 'Dirección',
  convivencia: 'Convivencia escolar',
  inspectoria: 'Inspectoría',
  profesor_jefe: 'Profesor jefe',
  teacher: 'Docente',
  inspector: 'Inspector',
  user: 'Usuario',
  staff: 'Equipo',
};

function AdminError({ onRetry, message }: { onRetry: () => void; message?: string }) {
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

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('convivencia');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLevel, setImportLevel] = useState<'BASICA' | 'MEDIA'>('BASICA');
  const [importResult, setImportResult] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.tenantId);
  const membersQuery = useQuery({
    queryKey: ['admin', 'members', tenantId],
    queryFn: fetchAdminMembers,
    enabled: Boolean(tenantId) && (activeTab === 'overview' || activeTab === 'users'),
  });
  const usageQuery = useQuery({
    queryKey: ['admin', 'usage', tenantId],
    queryFn: fetchUsageStats,
    enabled: Boolean(tenantId) && activeTab === 'overview',
  });
  const { data: courses = [], isLoading: coursesLoading } = useCoursesQuery();
  const refresh = () => void membersQuery.refetch();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin', 'members', tenantId] });

  const inviteMutation = useMutation({
    mutationFn: () => inviteAdminMember(email, role),
    onSuccess: () => {
      setEmail('');
      setOperationError(null);
      invalidate();
    },
    onError: (error: Error) => setOperationError(error.message),
  });
  const memberMutation = useMutation({
    mutationFn: ({
      userId,
      values,
    }: {
      userId: string;
      values: { role: AdminRole; accessEnabled: boolean };
    }) => updateAdminMember(userId, values),
    onSuccess: () => {
      setOperationError(null);
      invalidate();
    },
    onError: (error: Error) => setOperationError(error.message),
  });
  const resendMutation = useMutation({
    mutationFn: resendAdminInvitation,
    onSuccess: () => invalidate(),
    onError: (error: Error) => setOperationError(error.message),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelAdminInvitation,
    onSuccess: () => invalidate(),
    onError: (error: Error) => setOperationError(error.message),
  });

  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data?.members]);
  const roleCounts = useMemo(() => {
    const counts = new Map<AdminMemberRole, number>();
    for (const member of members) counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [members]);
  const pendingInvitations = (membersQuery.data?.invitations ?? []).filter(
    (item) => item.status === 'pending',
  );
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error('Seleccione un archivo .xlsx.');
      return importOwnTenantBase(importFile, importLevel);
    },
    onSuccess: (data) => {
      setImportResult(
        `${data.coursesInserted} cursos y ${data.studentsInserted} estudiantes importados. ` +
          `Duplicados omitidos: ${data.duplicates}.` +
          (data.errors.length > 0 ? ` Advertencias: ${data.errors.length}.` : ''),
      );
      setImportFile(null);
      void queryClient.invalidateQueries({ queryKey: ['courses', tenantId] });
    },
    onError: (error: unknown) =>
      setImportResult(error instanceof Error ? error.message : 'No fue posible importar la base.'),
  });
  const isBusy =
    inviteMutation.isPending ||
    memberMutation.isPending ||
    resendMutation.isPending ||
    cancelMutation.isPending ||
    importMutation.isPending;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Administración · Colegio"
        title="Centro del establecimiento"
        description="Gestiona personas, roles, invitaciones y recursos institucionales del colegio."
        action={
          <div className="flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 font-semibold text-brand-700 text-xs ring-1 ring-brand-100">
            <ShieldCheck className="size-4" aria-hidden="true" /> Acceso protegido
          </div>
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-xs transition-colors sm:px-4 ${activeTab === id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'}`}
            aria-pressed={activeTab === id}
          >
            <Icon className="size-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {activeTab !== 'templates' && activeTab !== 'institution' && membersQuery.isError ? (
        <AdminError onRetry={refresh} />
      ) : null}
      {operationError ? (
        <AdminError message={operationError} onRetry={() => setOperationError(null)} />
      ) : null}

      {activeTab === 'overview' && !membersQuery.isError && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={Users}
              label="Usuarios del tenant"
              value={membersQuery.isLoading ? '—' : String(members.length)}
            />
            <SummaryCard
              icon={BookOpen}
              label="Cursos disponibles"
              value={coursesLoading ? '—' : String(courses.length)}
            />
            <SummaryCard
              icon={BarChart3}
              label="Eventos registrados"
              value={
                usageQuery.isLoading
                  ? '—'
                  : String(
                      usageQuery.data?.events.reduce(
                        (total, event) => total + event.total_count,
                        0,
                      ) ?? 0,
                    )
              }
            />
          </div>
          <section className="card p-5 sm:p-6">
            <h3 className="font-bold text-neutral-900">Distribución de roles</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {roleCounts.length === 0 && !membersQuery.isLoading ? (
                <span className="text-neutral-500 text-sm">No hay perfiles disponibles.</span>
              ) : null}
              {roleCounts.map(([memberRole, count]) => (
                <span
                  key={memberRole}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-700 text-xs"
                >
                  {roleLabels[memberRole]}: {count}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'users' && !membersQuery.isError && (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                <Mail className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-neutral-900">Invitar a una persona</h3>
                <p className="mt-1 text-neutral-500 text-xs">
                  Supabase enviará el correo de invitación y el acceso quedará asociado a este
                  establecimiento.
                </p>
              </div>
            </div>
            <form
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                inviteMutation.mutate();
              }}
            >
              <label className="sr-only" htmlFor="member-email">
                Correo electrónico
              </label>
              <Input
                id="member-email"
                aria-label="Correo electrónico de la persona invitada"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="persona@establecimiento.cl"
              />
              <label className="sr-only" htmlFor="member-role">
                Rol
              </label>
              <Select
                id="member-role"
                value={role}
                onChange={(event) => setRole(event.target.value as AdminRole)}
              >
                {ADMIN_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </Select>
              <Button type="submit" disabled={isBusy} className="rounded-xl px-4 py-2.5 text-sm">
                Enviar invitación
              </Button>
            </form>
          </section>

          <section className="card overflow-hidden">
            <div className="border-neutral-200/70 border-b px-5 py-4">
              <h3 className="font-bold text-neutral-900">Usuarios del tenant</h3>
              <p className="mt-1 text-neutral-500 text-xs">
                El sistema impide desactivar o degradar al último administrador activo.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Último acceso</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {membersQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">
                        Cargando usuarios…
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <MemberRow
                        key={member.user_id}
                        member={member}
                        disabled={isBusy}
                        onSave={(values) =>
                          memberMutation.mutate({ userId: member.user_id, values })
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-neutral-200/70 border-b px-5 py-4">
              <h3 className="font-bold text-neutral-900">Invitaciones</h3>
              <p className="mt-1 text-neutral-500 text-xs">
                Reenvía invitaciones pendientes o cancela accesos que ya no correspondan.
              </p>
            </div>
            <div className="divide-y divide-neutral-100">
              {pendingInvitations.length === 0 ? (
                <p className="p-5 text-neutral-500 text-sm">No hay invitaciones pendientes.</p>
              ) : (
                pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-neutral-800">{invitation.email}</p>
                      <p className="text-neutral-500 text-xs">
                        {roleLabels[invitation.role]} · último envío{' '}
                        {formatDate(invitation.last_sent_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => resendMutation.mutate(invitation.id)}
                        className="rounded-lg px-3 py-2 text-xs"
                      >
                        Reenviar
                      </Button>
                      <Button
                        variant="danger"
                        disabled={isBusy}
                        onClick={() => cancelMutation.mutate(invitation.id)}
                        className="rounded-lg px-3 py-2 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-neutral-200/70 border-b px-5 py-4">
              <h3 className="font-bold text-neutral-900">Historial de cambios</h3>
              <p className="mt-1 text-neutral-500 text-xs">
                Registro técnico inmutable de roles, accesos e invitaciones.
              </p>
            </div>
            <div className="divide-y divide-neutral-100">
              {(membersQuery.data?.history ?? []).length === 0 ? (
                <p className="p-5 text-neutral-500 text-sm">Aún no hay cambios registrados.</p>
              ) : (
                (membersQuery.data?.history ?? []).map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-neutral-800">{historyLabel(event.action)}</p>
                      <p className="text-neutral-500 text-xs">
                        {event.actorEmail ?? 'Usuario administrativo'} · registro {event.entity_id}
                      </p>
                    </div>
                    <time className="text-neutral-400 text-xs" dateTime={event.occurred_at}>
                      {formatDate(event.occurred_at)}
                    </time>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'templates' && (
        <ErrorBoundary>
          <TemplateEditor />
        </ErrorBoundary>
      )}

      {activeTab === 'institution' && <InstitutionSettingsPanel />}

      {activeTab === 'import' && (
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
              className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                importMutation.mutate();
              }}
            >
              <Select
                aria-label="Nivel por defecto"
                value={importLevel}
                onChange={(event) => setImportLevel(event.target.value as 'BASICA' | 'MEDIA')}
              >
                <option value="BASICA">Básica</option>
                <option value="MEDIA">Media</option>
              </Select>
              <Input
                aria-label="Archivo Excel"
                type="file"
                accept=".xlsx"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 file:text-xs hover:file:bg-brand-100"
              />
              <Button
                type="submit"
                disabled={isBusy || !importFile}
                className="rounded-xl px-4 py-2.5 text-sm sm:self-end"
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
                  Descargue una plantilla .xlsx con las hojas y encabezados esperados.
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
    </div>
  );
}

function MemberRow({
  member,
  disabled,
  onSave,
}: {
  member: AdminMember;
  disabled: boolean;
  onSave: (values: { role: AdminRole; accessEnabled: boolean }) => void;
}) {
  const isPlatformAdmin = member.role === 'superadmin';
  const [selectedRole, setSelectedRole] = useState<AdminMemberRole>(member.role);
  const [enabled, setEnabled] = useState(member.is_active && member.membershipActive);
  const changed =
    selectedRole !== member.role || enabled !== (member.is_active && member.membershipActive);
  return (
    <tr className="align-middle hover:bg-neutral-50">
      <td className="px-5 py-3">
        <div className="font-semibold text-neutral-800">{member.full_name || 'Sin nombre'}</div>
        <div className="text-neutral-500 text-xs">{member.email || 'Sin correo'}</div>
      </td>
      <td className="px-5 py-3">
        <Select
          aria-label={`Rol de ${member.email ?? member.user_id}`}
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value as AdminRole)}
          disabled={isPlatformAdmin || disabled}
          className="px-2.5 py-2 text-xs"
        >
          {isPlatformAdmin ? <option value="superadmin">Superadministrador</option> : null}
          <option value="admin">Administrador</option>
          {ADMIN_ROLES.filter((item) => item !== 'admin').map((item) => (
            <option key={item} value={item}>
              {roleLabels[item]}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-5 py-3">
        <button
          type="button"
          aria-label={`${enabled ? 'Desactivar' : 'Activar'} acceso de ${member.email ?? member.user_id}`}
          disabled={disabled || isPlatformAdmin}
          onClick={() => setEnabled((value) => !value)}
          className={`rounded-full px-3 py-1.5 font-semibold text-xs ${enabled ? 'bg-leve-100 text-leve-800' : 'bg-neutral-100 text-neutral-500'}`}
        >
          {enabled ? 'Activo' : 'Desactivado'}
        </button>
        {!member.confirmed ? (
          <span className="ml-2 rounded-full bg-grave-100 px-2 py-1 text-grave-700 text-11px">
            Invitado
          </span>
        ) : null}
      </td>
      <td className="px-5 py-3 text-neutral-500 text-xs">
        {member.lastSignInAt ? formatDate(member.lastSignInAt) : 'Sin acceso'}
      </td>
      <td className="px-5 py-3 text-right">
        <Button
          disabled={!changed || disabled || isPlatformAdmin || selectedRole === 'superadmin'}
          onClick={() => {
            if (selectedRole !== 'superadmin')
              onSave({ role: selectedRole, accessEnabled: enabled });
          }}
          className="rounded-lg px-3 py-2 text-xs"
        >
          {isPlatformAdmin ? 'Gestionar en plataforma' : 'Guardar'}
        </Button>
      </td>
    </tr>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function historyLabel(action: string): string {
  const labels: Record<string, string> = {
    member_updated: 'Usuario actualizado',
    invitation_created: 'Invitación creada',
    invitation_resent: 'Invitación reenviada',
    invitation_cancelled: 'Invitación cancelada',
  };
  return labels[action] ?? 'Cambio administrativo';
}
