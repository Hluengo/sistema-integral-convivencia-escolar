/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router, type Request } from 'express';
import multer from 'multer';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireTenant } from '../middleware/requireTenant.js';
import type { AuthenticatedRequest, ProfileRole } from '../../types.js';

const router = Router();
const ownUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const ADMIN_ROLES: readonly ProfileRole[] = ['admin', 'direccion'];
const APPLICATION_CODE = 'convivencia';
const VALID_ROLES: readonly ProfileRole[] = [
  'admin',
  'direccion',
  'convivencia',
  'inspectoria',
  'profesor_jefe',
  'teacher',
  'inspector',
  'user',
  'staff',
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileRow {
  user_id: string;
  tenant_id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole;
  course_ids: string[] | null;
  is_active: boolean;
  updated_at: string | null;
}

interface MembershipRow {
  user_id: string;
  role: ProfileRole;
  is_active: boolean;
  application_code: string;
}

interface InvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  role: ProfileRole;
  application_code: string;
  auth_user_id: string | null;
  invited_by: string;
  status: 'pending' | 'accepted' | 'cancelled';
  created_at: string;
  updated_at: string;
  last_sent_at: string;
  cancelled_at: string | null;
  accepted_at: string | null;
}

interface AuditRow {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  occurred_at: string;
}

function getAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase administrativo no configurado.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function getRequest(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

function isRole(value: unknown): value is ProfileRole {
  return typeof value === 'string' && VALID_ROLES.includes(value as ProfileRole);
}

async function assertFreshAdmin(
  client: SupabaseClient,
  request: AuthenticatedRequest,
): Promise<ProfileRow> {
  if (!request.user?.sub || !request.tenantId) throw new Error('Contexto administrativo inválido.');
  const { data, error } = await client
    .from('profiles')
    .select('user_id,tenant_id,email,full_name,role,course_ids,is_active,updated_at')
    .eq('user_id', request.user.sub)
    .eq('tenant_id', request.tenantId)
    .maybeSingle();
  if (error || !data) throw new Error('No fue posible validar al administrador.');
  const profile = data as unknown as ProfileRow;
  if (!profile.is_active || !ADMIN_ROLES.includes(profile.role)) {
    throw new Error('La cuenta no tiene permisos administrativos activos.');
  }
  return profile;
}

async function recordAudit(
  client: SupabaseClient,
  request: AuthenticatedRequest,
  action: string,
  entityId: string,
  previousValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await client.from('audit_events').insert({
    tenant_id: request.tenantId,
    actor_user_id: request.user?.sub,
    action,
    entity_type: 'membership',
    entity_id: entityId,
    previous_values: previousValues,
    new_values: newValues,
  });
  if (error) throw error;
}

async function listAuthUsers(client: SupabaseClient): Promise<Map<string, User>> {
  const result = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (result.error) throw result.error;
  return new Map(result.data.users.map((user) => [user.id, user]));
}

router.use(requireAuth, requireTenant, requireRole(ADMIN_ROLES));

router.get('/admin/members', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const [profilesResult, membershipsResult, invitationsResult, auditResult, users] =
      await Promise.all([
        client
          .from('profiles')
          .select('user_id,tenant_id,email,full_name,role,course_ids,is_active,updated_at')
          .eq('tenant_id', request.tenantId)
          .order('full_name', { ascending: true }),
        client
          .from('app_memberships')
          .select('user_id,role,is_active,application_code')
          .eq('tenant_id', request.tenantId)
          .eq('application_code', APPLICATION_CODE),
        client
          .from('membership_invitations')
          .select(
            'id,tenant_id,email,role,application_code,auth_user_id,invited_by,status,created_at,updated_at,last_sent_at,cancelled_at,accepted_at',
          )
          .eq('tenant_id', request.tenantId)
          .order('created_at', { ascending: false }),
        client
          .from('audit_events')
          .select(
            'id,actor_user_id,action,entity_type,entity_id,previous_values,new_values,occurred_at',
          )
          .eq('tenant_id', request.tenantId)
          .eq('entity_type', 'membership')
          .order('occurred_at', { ascending: false })
          .limit(200),
        listAuthUsers(client),
      ]);
    if (profilesResult.error) throw profilesResult.error;
    if (membershipsResult.error) throw membershipsResult.error;
    if (invitationsResult.error) throw invitationsResult.error;
    if (auditResult.error) throw auditResult.error;

    const profiles = (profilesResult.data ?? []) as unknown as ProfileRow[];
    const memberships = (membershipsResult.data ?? []) as unknown as MembershipRow[];
    const membershipByUser = new Map(
      memberships.map((membership) => [membership.user_id, membership]),
    );
    const invitations = (invitationsResult.data ?? []) as unknown as InvitationRow[];
    const audits = (auditResult.data ?? []) as unknown as AuditRow[];
    const actorEmails = new Map(profiles.map((profile) => [profile.user_id, profile.email ?? '']));
    const currentInvitations = invitations.map((invitation) => {
      const user = invitation.auth_user_id ? users.get(invitation.auth_user_id) : undefined;
      if (invitation.status === 'pending' && user?.confirmed_at) {
        return { ...invitation, status: 'accepted' as const, accepted_at: user.confirmed_at };
      }
      return invitation;
    });

    res.json({
      members: profiles.map((profile) => {
        const membership = membershipByUser.get(profile.user_id);
        const user = users.get(profile.user_id);
        return {
          ...profile,
          membershipRole: membership?.role ?? profile.role,
          membershipActive: membership?.is_active ?? profile.is_active,
          confirmed: Boolean(user?.confirmed_at),
          lastSignInAt: user?.last_sign_in_at ?? null,
        };
      }),
      invitations: currentInvitations,
      history: audits.map((audit) => ({
        ...audit,
        actorEmail: actorEmails.get(audit.actor_user_id) ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar la administración.';
    res.status(message.includes('permisos') ? 403 : 500).json({ error: message });
  }
});

router.patch('/admin/members/:userId', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const userId = req.params.userId;
    const role = req.body?.role;
    const accessEnabled = req.body?.accessEnabled;
    if (!userId || !isRole(role) || typeof accessEnabled !== 'boolean') {
      res.status(400).json({ error: 'userId, role y accessEnabled son obligatorios.' });
      return;
    }

    const { data: targetData, error: targetError } = await client
      .from('profiles')
      .select('user_id,tenant_id,email,full_name,role,course_ids,is_active,updated_at')
      .eq('user_id', userId)
      .eq('tenant_id', request.tenantId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetData) {
      res.status(404).json({ error: 'Usuario no encontrado en este establecimiento.' });
      return;
    }
    const target = targetData as unknown as ProfileRow;
    if (target.role === 'admin' && (!accessEnabled || role !== 'admin')) {
      const { count, error: countError } = await client
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', request.tenantId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('user_id', userId);
      if (countError) throw countError;
      if ((count ?? 0) < 1) {
        res
          .status(409)
          .json({ error: 'No puede dejar al establecimiento sin un administrador activo.' });
        return;
      }
    }

    const { error: profileError } = await client
      .from('profiles')
      .update({ role, is_active: accessEnabled, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_id', request.tenantId);
    if (profileError) throw profileError;
    const { error: membershipError } = await client.from('app_memberships').upsert(
      {
        tenant_id: request.tenantId,
        user_id: userId,
        application_code: APPLICATION_CODE,
        role,
        is_active: accessEnabled,
      },
      { onConflict: 'tenant_id,user_id,application_code' },
    );
    if (membershipError) throw membershipError;
    await recordAudit(
      client,
      request,
      'member_updated',
      userId,
      {
        role: target.role,
        is_active: target.is_active,
      },
      { role, is_active: accessEnabled },
    );
    res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No fue posible actualizar al usuario.';
    res.status(message.includes('administrador') ? 409 : 500).json({ error: message });
  }
});

router.post('/admin/invitations', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body?.role;
    if (!EMAIL_RE.test(email) || !isRole(role)) {
      res.status(400).json({ error: 'Ingrese un correo válido y un rol existente.' });
      return;
    }
    const { data: existingProfile, error: profileError } = await client
      .from('profiles')
      .select('user_id,email')
      .eq('tenant_id', request.tenantId)
      .ilike('email', email)
      .maybeSingle();
    if (profileError) throw profileError;
    if (existingProfile) {
      res.status(409).json({ error: 'Ese correo ya pertenece a un usuario del establecimiento.' });
      return;
    }
    const { data: existingInvitation, error: invitationError } = await client
      .from('membership_invitations')
      .select('id')
      .eq('tenant_id', request.tenantId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();
    if (invitationError) throw invitationError;
    if (existingInvitation) {
      res.status(409).json({ error: 'Ya existe una invitación pendiente para ese correo.' });
      return;
    }

    const invitation = await client.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: request.tenantId, role },
    });
    if (invitation.error || !invitation.data.user)
      throw invitation.error ?? new Error('No se creó el usuario invitado.');
    const invitedUser = invitation.data.user;
    const { data: invitationRow, error: insertError } = await client
      .from('membership_invitations')
      .insert({
        tenant_id: request.tenantId,
        email,
        role,
        application_code: APPLICATION_CODE,
        auth_user_id: invitedUser.id,
        invited_by: request.user?.sub,
      })
      .select('id,email,role,status,created_at,last_sent_at')
      .single();
    if (insertError) throw insertError;
    await client
      .from('profiles')
      .update({ role, is_active: true })
      .eq('user_id', invitedUser.id)
      .eq('tenant_id', request.tenantId);
    await client.from('app_memberships').upsert(
      {
        tenant_id: request.tenantId,
        user_id: invitedUser.id,
        application_code: APPLICATION_CODE,
        role,
        is_active: true,
      },
      { onConflict: 'tenant_id,user_id,application_code' },
    );
    await recordAudit(client, request, 'invitation_created', invitedUser.id, null, { email, role });
    res.status(201).json({ invitation: invitationRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible enviar la invitación.';
    res.status(500).json({ error: message });
  }
});

router.post('/admin/invitations/:invitationId/resend', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const { data, error } = await client
      .from('membership_invitations')
      .select('id,tenant_id,email,role,auth_user_id,status')
      .eq('id', req.params.invitationId)
      .eq('tenant_id', request.tenantId)
      .maybeSingle();
    if (error) throw error;
    const invitation = data as unknown as Pick<
      InvitationRow,
      'id' | 'tenant_id' | 'email' | 'role' | 'auth_user_id' | 'status'
    > | null;
    if (!invitation || invitation.status !== 'pending') {
      res.status(404).json({ error: 'Invitación pendiente no encontrada.' });
      return;
    }
    const resend = await client.auth.admin.inviteUserByEmail(invitation.email, {
      data: { tenant_id: request.tenantId, role: invitation.role },
    });
    if (resend.error) throw resend.error;
    const now = new Date().toISOString();
    await client
      .from('membership_invitations')
      .update({ last_sent_at: now, updated_at: now })
      .eq('id', invitation.id)
      .eq('tenant_id', request.tenantId);
    await recordAudit(
      client,
      request,
      'invitation_resent',
      invitation.auth_user_id ?? invitation.id,
      null,
      { email: invitation.email },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'No fue posible reenviar la invitación.',
    });
  }
});

router.post('/admin/invitations/:invitationId/cancel', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const { data, error } = await client
      .from('membership_invitations')
      .select('id,email,role,auth_user_id,status')
      .eq('id', req.params.invitationId)
      .eq('tenant_id', request.tenantId)
      .maybeSingle();
    if (error) throw error;
    const invitation = data as unknown as Pick<
      InvitationRow,
      'id' | 'email' | 'role' | 'auth_user_id' | 'status'
    > | null;
    if (!invitation || invitation.status !== 'pending') {
      res.status(404).json({ error: 'Invitación pendiente no encontrada.' });
      return;
    }
    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from('membership_invitations')
      .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
      .eq('id', invitation.id)
      .eq('tenant_id', request.tenantId);
    if (updateError) throw updateError;
    if (invitation.auth_user_id) {
      await client
        .from('profiles')
        .update({ is_active: false, updated_at: now })
        .eq('user_id', invitation.auth_user_id)
        .eq('tenant_id', request.tenantId);
      await client
        .from('app_memberships')
        .update({ is_active: false, updated_at: now })
        .eq('user_id', invitation.auth_user_id)
        .eq('tenant_id', request.tenantId)
        .eq('application_code', APPLICATION_CODE);
    }
    await recordAudit(
      client,
      request,
      'invitation_cancelled',
      invitation.auth_user_id ?? invitation.id,
      { email: invitation.email, role: invitation.role },
      null,
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'No fue posible cancelar la invitación.',
    });
  }
});

router.post('/admin/import', ownUpload.single('file'), async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    if (!request.tenantId) throw new Error('No fue posible determinar el establecimiento.');
    if (!req.file?.buffer) {
      res.status(400).json({ error: 'Adjunte un archivo .xlsx válido.' });
      return;
    }
    const defaultLevel = req.body?.defaultLevel === 'MEDIA' ? 'MEDIA' : 'BASICA';
    const { parseImportWorkbook, runImport } = await import('../services/excelImport.js');
    const parsed = await parseImportWorkbook(req.file.buffer, defaultLevel);
    const result = await runImport(client, request.tenantId, parsed);
    await recordAudit(client, request, 'tenant_base_imported', request.tenantId, null, {
      courses: result.coursesInserted,
      students: result.studentsInserted,
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible importar la base.';
    res.status(message.includes('permisos') ? 403 : 500).json({ error: message });
  }
});

export default router;
