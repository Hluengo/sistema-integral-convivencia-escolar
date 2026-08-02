/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router, type Request } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAuth } from '../../middleware/auth.js';
import { requireSuperAdmin } from '../../middleware/requireSuperAdmin.js';
import type { AuthenticatedRequest } from '../../types.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const APPLICATION_CODE = 'convivencia';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface TemplateRow {
  id: string;
  doc_type: string;
  label: string;
  system_prompt: string;
}

interface TenantSummary {
  tenant_id: string;
  users: number;
  courses: number;
  students: number;
  cases: number;
  templates: number;
  institution_documents: number;
}

function getRequest(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

function getAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase administrativo no configurado.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(client: SupabaseClient, base: string): Promise<string> {
  const slug = slugify(base) || 'colegio';
  const { data } = await client.from('tenants').select('slug').ilike('slug', `${slug}%`);
  const existing = new Set((data ?? []).map((row: { slug: string }) => row.slug));
  if (!existing.has(slug)) return slug;
  let n = 2;
  while (existing.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

async function assertFreshSuperAdmin(
  client: SupabaseClient,
  request: AuthenticatedRequest,
): Promise<void> {
  if (!request.user?.sub) throw new Error('Contexto de plataforma inválido.');
  const { data, error } = await client
    .from('profiles')
    .select('user_id,role,is_active,tenant_id')
    .eq('user_id', request.user.sub)
    .maybeSingle();
  if (error || !data) throw new Error('No fue posible validar al superadministrador.');
  const profile = data as { user_id: string; role: string; is_active: boolean; tenant_id: string };
  if (!profile.is_active || profile.role !== 'superadmin') {
    throw new Error('La cuenta no tiene permisos de superadministrador activos.');
  }
}

async function copyDefaultTemplates(client: SupabaseClient, tenantId: string): Promise<void> {
  const { data, error } = await client
    .from('document_templates')
    .select('id,doc_type,label,system_prompt')
    .eq('tenant_id', DEFAULT_TENANT_ID);
  if (error) throw error;
  const templates = (data ?? []) as unknown as TemplateRow[];
  if (templates.length === 0) return;
  const copies = templates.map((tpl) => ({
    id: randomUUID(),
    doc_type: tpl.doc_type,
    label: tpl.label,
    system_prompt: tpl.system_prompt,
    tenant_id: tenantId,
  }));
  const { error: insertError } = await client
    .from('document_templates')
    .upsert(copies, { onConflict: 'tenant_id,doc_type' });
  if (insertError) throw insertError;
}

async function recordAudit(
  client: SupabaseClient,
  tenantId: string,
  actorUserId: string | undefined,
  action: string,
  entityId: string,
  newValues: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await client.from('audit_events').insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    action,
    entity_type: 'tenant',
    entity_id: entityId,
    previous_values: null,
    new_values: newValues,
  });
  if (error) throw error;
}

// Guard acotado al prefijo propio para no interceptar otras rutas /api/*.
router.use('/platform', requireAuth, requireSuperAdmin);

// ============================================================
// GET /api/platform/tenants — listado de colegios
// ============================================================
router.get('/platform/tenants', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshSuperAdmin(client, request);
    const { data, error } = await client
      .from('tenants')
      .select('id,name,slug,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const tenants = (data ?? []) as unknown as TenantRow[];
    const withCounts = await Promise.all(
      tenants.map(async (tenant) => {
        const { count, error: countError } = await client
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);
        return { ...tenant, user_count: countError ? 0 : (count ?? 0) };
      }),
    );
    res.json({ tenants: withCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar los colegios.';
    res.status(message.includes('superadministrador') ? 403 : 500).json({ error: message });
  }
});

router.get('/platform/tenants/:id/summary', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshSuperAdmin(client, request);
    const tenantId = req.params.id;
    const tenant = await client.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (tenant.error) throw tenant.error;
    if (!tenant.data) {
      res.status(404).json({ error: 'Colegio no encontrado.' });
      return;
    }
    const [users, courses, students, cases, templates, documents] = await Promise.all([
      client
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      client.from('courses').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      client.from('causas').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client
        .from('document_templates')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      client
        .from('institution_documents')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
    ]);
    const failed = [users, courses, students, cases, templates, documents].find(
      (result) => result.error,
    );
    if (failed?.error) throw failed.error;
    const summary: TenantSummary = {
      tenant_id: tenantId,
      users: users.count ?? 0,
      courses: courses.count ?? 0,
      students: students.count ?? 0,
      cases: cases.count ?? 0,
      templates: templates.count ?? 0,
      institution_documents: documents.count ?? 0,
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'No fue posible cargar el resumen del colegio.',
    });
  }
});

// ============================================================
// POST /api/platform/tenants — alta de colegio + admin + plantillas
// ============================================================
router.post('/platform/tenants', async (req, res) => {
  let client: SupabaseClient | null = null;
  let createdTenantId: string | null = null;
  let createdAuthUserId: string | null = null;
  try {
    const request = getRequest(req);
    client = getAdminClient();
    await assertFreshSuperAdmin(client, request);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const adminEmail =
      typeof req.body?.adminEmail === 'string' ? req.body.adminEmail.trim().toLowerCase() : '';
    const providedSlug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : '';
    if (!name || !EMAIL_RE.test(adminEmail)) {
      res.status(400).json({ error: 'Ingrese un nombre válido y un correo de administrador.' });
      return;
    }

    const tenantId = randomUUID();
    createdTenantId = tenantId;
    const slug = providedSlug
      ? slugify(providedSlug) || slugify(name)
      : await generateUniqueSlug(client, name);

    const { error: tenantError } = await client
      .from('tenants')
      .insert({ id: tenantId, name, slug });
    if (tenantError) throw tenantError;

    const { error: settingsError } = await client.from('institution_settings').insert({
      tenant_id: tenantId,
      official_name: name,
      education_levels: [],
    });
    if (settingsError) throw settingsError;

    const invitation = await client.auth.admin.inviteUserByEmail(adminEmail, {
      data: { tenant_id: tenantId, role: 'admin' },
    });
    if (invitation.error || !invitation.data.user) {
      throw invitation.error ?? new Error('No se creó el usuario administrador invitado.');
    }
    const adminUser = invitation.data.user;
    createdAuthUserId = adminUser.id;

    const { error: profileError } = await client
      .from('profiles')
      .update({ role: 'admin', is_active: true, updated_at: new Date().toISOString() })
      .eq('user_id', adminUser.id)
      .eq('tenant_id', tenantId);
    if (profileError) throw profileError;

    const { error: membershipError } = await client.from('app_memberships').upsert(
      {
        tenant_id: tenantId,
        user_id: adminUser.id,
        application_code: APPLICATION_CODE,
        role: 'admin',
        is_active: true,
      },
      { onConflict: 'tenant_id,user_id,application_code' },
    );
    if (membershipError) throw membershipError;

    await copyDefaultTemplates(client, tenantId);

    await recordAudit(client, tenantId, request.user?.sub, 'tenant_provisioned', tenantId, {
      name,
      slug,
      admin_email: adminEmail,
    });

    res.status(201).json({
      tenant: { id: tenantId, name, slug },
      invitation: { email: adminEmail, status: 'pending' },
    });
  } catch (error) {
    if (client) {
      if (createdAuthUserId) {
        await client.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
      }
      if (createdTenantId) {
        try {
          await client.from('tenants').delete().eq('id', createdTenantId);
        } catch {
          // La limpieza es compensatoria; conservar el error original para la respuesta.
        }
      }
    }
    const message = error instanceof Error ? error.message : '';
    const isSuperAdminError = message.includes('superadministrador');
    const isRateLimit = /rate limit|too many requests|email rate/i.test(message);
    const responseMessage = isRateLimit
      ? 'Supabase limitó temporalmente el envío de invitaciones. Espere unos minutos antes de reintentar.'
      : isSuperAdminError
        ? message
        : 'No fue posible crear el colegio. No se guardaron datos incompletos.';
    res.status(isSuperAdminError ? 403 : isRateLimit ? 429 : 500).json({ error: responseMessage });
  }
});

// ============================================================
// POST /api/platform/tenants/:id/invite — reenviar invitación al admin
// ============================================================
router.post('/platform/tenants/:id/invite', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshSuperAdmin(client, request);
    const tenantId = req.params.id;
    const { data, error } = await client
      .from('profiles')
      .select('user_id,email')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .maybeSingle();
    if (error) throw error;
    const admin = data as unknown as { user_id: string; email: string } | null;
    if (!admin?.email) {
      res.status(404).json({ error: 'No se encontró un administrador para este colegio.' });
      return;
    }
    const resend = await client.auth.admin.inviteUserByEmail(admin.email, {
      data: { tenant_id: tenantId, role: 'admin' },
    });
    if (resend.error) throw resend.error;
    await recordAudit(
      client,
      tenantId,
      request.user?.sub,
      'tenant_admin_reinvited',
      admin.user_id,
      {
        email: admin.email,
      },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'No fue posible reenviar la invitación.',
    });
  }
});

// ============================================================
// POST /api/platform/tenants/:id/import — importar cursos y estudiantes
// ============================================================
router.post('/platform/tenants/:id/import', upload.single('file'), async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshSuperAdmin(client, request);
    const tenantId = req.params.id;
    if (!req.file?.buffer) {
      res.status(400).json({ error: 'Adjunte un archivo .xlsx válido.' });
      return;
    }
    const defaultLevel = req.body?.defaultLevel === 'MEDIA' ? 'MEDIA' : 'BASICA';
    const { parseImportWorkbook, runImport } = await import('../services/excelImport.js');
    const parsed = await parseImportWorkbook(req.file.buffer, defaultLevel);
    const result = await runImport(client, tenantId, parsed);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'No fue posible importar la base.',
    });
  }
});

export default router;
