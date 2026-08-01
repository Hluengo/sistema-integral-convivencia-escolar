/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/requireTenant.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import type { AuthenticatedRequest, ProfileRole } from '../../types.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});
const ADMIN_ROLES: readonly ProfileRole[] = ['superadmin', 'admin', 'direccion'];
const CONTENT_LIMIT = 200_000;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};
const DOCUMENT_MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};
const INSTITUTION_SETTINGS_COLUMNS =
  'tenant_id,official_name,institution_rut,address,commune,region,phone,institutional_email,proprietor,director_name,education_levels,logo_path,updated_at,updated_by';
const RULE_VERSION_COLUMNS =
  'id,tenant_id,title,version,content,status,effective_at,created_at,updated_at,created_by,published_by';
const INSTITUTION_DOCUMENT_COLUMNS =
  'id,tenant_id,title,category,original_name,storage_path,mime_type,size_bytes,status,uploaded_at,archived_at,uploaded_by,archived_by';

interface InstitutionSettings {
  tenant_id: string;
  official_name: string;
  institution_rut: string | null;
  address: string | null;
  commune: string | null;
  region: string | null;
  phone: string | null;
  institutional_email: string | null;
  proprietor: string | null;
  director_name: string | null;
  education_levels: string[];
  logo_path: string | null;
  logo_url?: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface RuleVersion {
  id: string;
  tenant_id: string;
  title: string;
  version: string;
  content: string;
  status: 'draft' | 'active' | 'archived';
  effective_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  published_by: string | null;
}

interface InstitutionDocument {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  status: 'active' | 'archived';
  uploaded_at: string;
  archived_at: string | null;
  uploaded_by: string | null;
  archived_by: string | null;
  download_url?: string | null;
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

export function cleanText(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export function parseLevels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20);
}

async function getSignedLogoUrl(
  client: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await client.storage.from('institution-assets').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function withDocumentUrl(
  client: SupabaseClient,
  document: InstitutionDocument,
): Promise<InstitutionDocument> {
  const { data } = await client.storage
    .from('institution-assets')
    .createSignedUrl(document.storage_path, 3600);
  return { ...document, download_url: data?.signedUrl ?? null };
}

function safeDocumentName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(-120) || 'documento';
}

async function listDocuments(
  client: SupabaseClient,
  tenantId: string,
): Promise<InstitutionDocument[]> {
  const { data, error } = await client
    .from('institution_documents')
    .select(INSTITUTION_DOCUMENT_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return Promise.all(
    (data ?? []).map((item) => withDocumentUrl(client, item as InstitutionDocument)),
  );
}

async function createDocument(
  client: SupabaseClient,
  tenantId: string,
  actorUserId: string | undefined,
  file: Express.Multer.File,
  body: Record<string, unknown>,
): Promise<InstitutionDocument> {
  const extension = DOCUMENT_MIME_EXTENSIONS[file.mimetype];
  if (!extension) throw new Error('Tipo de documento no permitido.');
  const title = cleanText(body.title, 200) ?? file.originalname.slice(0, 200);
  const category = cleanText(body.category, 50) ?? 'otro';
  const storagePath = `${tenantId}/documents/${randomUUID()}-${safeDocumentName(file.originalname)}`;
  const uploadResult = await client.storage
    .from('institution-assets')
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (uploadResult.error) throw uploadResult.error;
  const { data, error } = await client
    .from('institution_documents')
    .insert({
      tenant_id: tenantId,
      title,
      category,
      original_name: file.originalname.slice(0, 255),
      storage_path: storagePath,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: actorUserId ?? null,
    })
    .select(INSTITUTION_DOCUMENT_COLUMNS)
    .single();
  if (error) {
    await client.storage.from('institution-assets').remove([storagePath]);
    throw error;
  }
  await audit(client, tenantId, actorUserId, 'institution_document_uploaded', data.id, null, data);
  return withDocumentUrl(client, data as InstitutionDocument);
}

async function loadSettings(
  client: SupabaseClient,
  tenantId: string,
): Promise<InstitutionSettings> {
  const { data, error } = await client
    .from('institution_settings')
    .select(INSTITUTION_SETTINGS_COLUMNS)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      ...(data as InstitutionSettings),
      logo_url: await getSignedLogoUrl(client, data.logo_path),
    };
  }
  const tenant = await client.from('tenants').select('name').eq('id', tenantId).single();
  if (tenant.error) throw tenant.error;
  return {
    tenant_id: tenantId,
    official_name: tenant.data.name,
    institution_rut: null,
    address: null,
    commune: null,
    region: null,
    phone: null,
    institutional_email: null,
    proprietor: null,
    director_name: null,
    education_levels: [],
    logo_path: null,
    logo_url: null,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

async function audit(
  client: SupabaseClient,
  tenantId: string,
  actorUserId: string | undefined,
  action: string,
  entityId: string,
  previousValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await client.from('audit_events').insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    action,
    entity_type: 'institution',
    entity_id: entityId,
    previous_values: previousValues,
    new_values: newValues,
  });
  if (error) throw error;
}

async function assertTargetTenant(client: SupabaseClient, tenantId: string): Promise<void> {
  const { data, error } = await client
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Colegio no encontrado.');
}

async function getTenantFromRequest(
  client: SupabaseClient,
  request: AuthenticatedRequest,
  targetTenantId?: string,
): Promise<string> {
  if (targetTenantId) {
    if (request.profileRole !== 'superadmin')
      throw new Error('Solo el superadministrador puede cambiar de colegio.');
    await assertTargetTenant(client, targetTenantId);
    return targetTenantId;
  }
  if (!request.tenantId) throw new Error('No fue posible determinar el colegio.');
  return request.tenantId;
}

async function updateSettings(
  client: SupabaseClient,
  tenantId: string,
  actorUserId: string | undefined,
  body: Record<string, unknown>,
): Promise<InstitutionSettings> {
  const previous = await loadSettings(client, tenantId);
  const officialName =
    cleanText(body.official_name ?? body.officialName, 200) ?? previous.official_name;
  if (!officialName) throw new Error('El nombre oficial es obligatorio.');
  const values = {
    tenant_id: tenantId,
    official_name: officialName,
    institution_rut: cleanText(body.institution_rut ?? body.institutionRut, 30),
    address: cleanText(body.address, 250),
    commune: cleanText(body.commune, 100),
    region: cleanText(body.region, 100),
    phone: cleanText(body.phone, 40),
    institutional_email: cleanText(body.institutional_email ?? body.institutionalEmail, 180),
    proprietor: cleanText(body.proprietor, 200),
    director_name: cleanText(body.director_name ?? body.directorName, 200),
    education_levels: parseLevels(body.education_levels ?? body.educationLevels),
    updated_by: actorUserId ?? null,
  };
  const { error } = await client
    .from('institution_settings')
    .upsert(values, { onConflict: 'tenant_id' });
  if (error) throw error;
  await audit(
    client,
    tenantId,
    actorUserId,
    'institution_settings_updated',
    tenantId,
    previous as unknown as Record<string, unknown>,
    values as Record<string, unknown>,
  );
  return loadSettings(client, tenantId);
}

async function listRules(client: SupabaseClient, tenantId: string): Promise<RuleVersion[]> {
  const { data, error } = await client
    .from('institution_rule_versions')
    .select(RULE_VERSION_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RuleVersion[];
}

async function createRule(
  client: SupabaseClient,
  tenantId: string,
  actorUserId: string | undefined,
  body: Record<string, unknown>,
): Promise<RuleVersion> {
  const title = cleanText(body.title, 200);
  const version = cleanText(body.version, 50);
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!title || !version || !content)
    throw new Error('Título, versión y contenido son obligatorios.');
  if (content.length > CONTENT_LIMIT) throw new Error('El reglamento supera el límite permitido.');
  const { data, error } = await client
    .from('institution_rule_versions')
    .insert({ tenant_id: tenantId, title, version, content, created_by: actorUserId ?? null })
    .select(RULE_VERSION_COLUMNS)
    .single();
  if (error) throw error;
  await audit(client, tenantId, actorUserId, 'institution_rule_created', data.id, null, data);
  return data as unknown as RuleVersion;
}

async function publishRule(
  client: SupabaseClient,
  tenantId: string,
  ruleId: string,
  actorUserId: string | undefined,
): Promise<RuleVersion> {
  const selected = await client
    .from('institution_rule_versions')
    .select(RULE_VERSION_COLUMNS)
    .eq('id', ruleId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (selected.error) throw selected.error;
  if (!selected.data) throw new Error('Versión de reglamento no encontrada.');
  const archived = await client
    .from('institution_rule_versions')
    .update({ status: 'archived' })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');
  if (archived.error) throw archived.error;
  const now = new Date().toISOString();
  const active = await client
    .from('institution_rule_versions')
    .update({ status: 'active', effective_at: now, published_by: actorUserId ?? null })
    .eq('id', ruleId)
    .eq('tenant_id', tenantId)
    .select(RULE_VERSION_COLUMNS)
    .single();
  if (active.error) throw active.error;
  await audit(
    client,
    tenantId,
    actorUserId,
    'institution_rule_published',
    ruleId,
    selected.data,
    active.data,
  );
  return active.data as unknown as RuleVersion;
}

async function uploadLogo(
  client: SupabaseClient,
  tenantId: string,
  actorUserId: string | undefined,
  file: Express.Multer.File,
): Promise<InstitutionSettings> {
  const extension = MIME_EXTENSIONS[file.mimetype];
  if (!extension) throw new Error('El logo debe ser PNG, JPG o SVG.');
  const current = await loadSettings(client, tenantId);
  const path = `${tenantId}/logo.${extension}`;
  const uploadResult = await client.storage.from('institution-assets').upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });
  if (uploadResult.error) throw uploadResult.error;
  const { error } = await client.from('institution_settings').upsert(
    {
      tenant_id: tenantId,
      official_name: current.official_name,
      logo_path: path,
      updated_by: actorUserId ?? null,
    },
    { onConflict: 'tenant_id' },
  );
  if (error) throw error;
  await audit(
    client,
    tenantId,
    actorUserId,
    'institution_logo_updated',
    tenantId,
    { logo_path: current.logo_path },
    { logo_path: path },
  );
  return loadSettings(client, tenantId);
}

async function sendError(res: Response, error: unknown): Promise<void> {
  const message =
    error instanceof Error ? error.message : 'No fue posible actualizar la configuración.';
  res.status(message.includes('Solo el superadministrador') ? 403 : 500).json({ error: message });
}

// Administración del propio tenant.
router.use('/admin/institution', requireAuth, requireTenant, requireRole(ADMIN_ROLES));
router.use('/admin/rules', requireAuth, requireTenant, requireRole(ADMIN_ROLES));
router.get('/onboarding/status', requireAuth, requireTenant, async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = request.tenantId;
    if (!tenantId) throw new Error('No fue posible determinar el colegio.');
    const [settings, courses, templates, members, rules] = await Promise.all([
      client
        .from('institution_settings')
        .select('tenant_id')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      client.from('courses').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      client
        .from('document_templates')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      client
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      client
        .from('institution_rule_versions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
    ]);
    const queryError = [settings, courses, templates, members, rules].find(
      (result) => result.error,
    )?.error;
    if (queryError) throw queryError;
    res.json({
      profile: Boolean(settings.data),
      courses: (courses.count ?? 0) > 0,
      templates: (templates.count ?? 0) > 0,
      members: (members.count ?? 0) > 1,
      rules: (rules.count ?? 0) > 0,
    });
  } catch (error) {
    await sendError(res, error);
  }
});

router.get('/admin/institution', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    res.json(await loadSettings(client, tenantId));
  } catch (error) {
    await sendError(res, error);
  }
});

router.patch('/admin/institution', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    res.json(await updateSettings(client, tenantId, request.user?.sub, req.body ?? {}));
  } catch (error) {
    await sendError(res, error);
  }
});

router.post('/admin/institution/logo', upload.single('logo'), async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    if (!req.file) throw new Error('Seleccione un archivo de logo.');
    res.json(await uploadLogo(client, tenantId, request.user?.sub, req.file));
  } catch (error) {
    await sendError(res, error);
  }
});

router.get('/admin/rules', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    res.json({ rules: await listRules(client, tenantId) });
  } catch (error) {
    await sendError(res, error);
  }
});

router.post('/admin/rules', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    res.status(201).json(await createRule(client, tenantId, request.user?.sub, req.body ?? {}));
  } catch (error) {
    await sendError(res, error);
  }
});

router.patch('/admin/rules/:id', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    const updates = {
      title: cleanText(req.body?.title, 200),
      version: cleanText(req.body?.version, 50),
      content:
        typeof req.body?.content === 'string'
          ? req.body.content.trim().slice(0, CONTENT_LIMIT)
          : undefined,
    };
    const { data, error } = await client
      .from('institution_rule_versions')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId)
      .select(RULE_VERSION_COLUMNS)
      .single();
    if (error) throw error;
    await audit(
      client,
      tenantId,
      request.user?.sub,
      'institution_rule_updated',
      req.params.id,
      null,
      data,
    );
    res.json(data);
  } catch (error) {
    await sendError(res, error);
  }
});

router.post('/admin/rules/:id/publish', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = await getTenantFromRequest(client, request);
    res.json(await publishRule(client, tenantId, req.params.id, request.user?.sub));
  } catch (error) {
    await sendError(res, error);
  }
});

// El superadmin usa estas rutas para administrar cualquier tenant sin cambiar su sesión.
router.use('/platform/tenants/:tenantId/institution', requireAuth, requireSuperAdmin);
router.use('/platform/tenants/:tenantId/rules', requireAuth, requireSuperAdmin);

router.get('/platform/tenants/:tenantId/institution', async (req, res) => {
  try {
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    res.json(await loadSettings(client, tenantId));
  } catch (error) {
    await sendError(res, error);
  }
});

router.patch('/platform/tenants/:tenantId/institution', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    res.json(await updateSettings(client, tenantId, request.user?.sub, req.body ?? {}));
  } catch (error) {
    await sendError(res, error);
  }
});

router.post(
  '/platform/tenants/:tenantId/institution/logo',
  upload.single('logo'),
  async (req, res) => {
    try {
      const request = getRequest(req);
      const client = getAdminClient();
      const tenantId = req.params.tenantId;
      await assertTargetTenant(client, tenantId);
      if (!req.file) throw new Error('Seleccione un archivo de logo.');
      res.json(await uploadLogo(client, tenantId, request.user?.sub, req.file));
    } catch (error) {
      await sendError(res, error);
    }
  },
);

router.get('/platform/tenants/:tenantId/rules', async (req, res) => {
  try {
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    res.json({ rules: await listRules(client, tenantId) });
  } catch (error) {
    await sendError(res, error);
  }
});

router.post('/platform/tenants/:tenantId/rules', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    res.status(201).json(await createRule(client, tenantId, request.user?.sub, req.body ?? {}));
  } catch (error) {
    await sendError(res, error);
  }
});

router.post('/platform/tenants/:tenantId/rules/:id/publish', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    res.json(await publishRule(client, tenantId, req.params.id, request.user?.sub));
  } catch (error) {
    await sendError(res, error);
  }
});

router.use('/platform/tenants/:tenantId/documents', requireAuth, requireSuperAdmin);

router.get('/platform/tenants/:tenantId/documents', async (req, res) => {
  try {
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    res.json({ documents: await listDocuments(client, tenantId) });
  } catch (error) {
    await sendError(res, error);
  }
});

router.post(
  '/platform/tenants/:tenantId/documents',
  documentUpload.single('document'),
  async (req, res) => {
    try {
      const request = getRequest(req);
      const client = getAdminClient();
      const tenantId = req.params.tenantId;
      await assertTargetTenant(client, tenantId);
      if (!req.file) {
        res.status(400).json({ error: 'Seleccione un documento.' });
        return;
      }
      res
        .status(201)
        .json(await createDocument(client, tenantId, request.user?.sub, req.file, req.body ?? {}));
    } catch (error) {
      await sendError(res, error);
    }
  },
);

router.post('/platform/tenants/:tenantId/documents/:id/archive', async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    const tenantId = req.params.tenantId;
    await assertTargetTenant(client, tenantId);
    const { data, error } = await client
      .from('institution_documents')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: request.user?.sub ?? null,
      })
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .select(INSTITUTION_DOCUMENT_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Documento activo no encontrado.' });
      return;
    }
    await audit(
      client,
      tenantId,
      request.user?.sub,
      'institution_document_archived',
      req.params.id,
      { status: 'active' },
      data,
    );
    res.json(await withDocumentUrl(client, data as InstitutionDocument));
  } catch (error) {
    await sendError(res, error);
  }
});

export default router;
