/** @license SPDX-License-Identifier: Apache-2.0 */

import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !publishableKey) {
  throw new Error('Faltan variables Supabase para ejecutar la validación multi-tenant.');
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const applicationCode = 'convivencia';
const password = `Qa-${crypto.randomBytes(18).toString('base64url')}!`;
const suffix = crypto.randomUUID().slice(0, 8);
const users = [];

async function createProbeUser(tenantId, label) {
  const email = `qa-${label}-${suffix}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id: tenantId, role: 'admin', full_name: `QA ${label}` },
    app_metadata: { tenant_id: tenantId, role: 'admin' },
  });
  if (created.error || !created.data.user)
    throw created.error ?? new Error('No se creó usuario QA.');
  const userId = created.data.user.id;
  users.push({ email, userId });
  const profile = await admin.from('profiles').upsert(
    {
      user_id: userId,
      tenant_id: tenantId,
      email,
      full_name: `QA ${label}`,
      role: 'admin',
      is_active: true,
      course_ids: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (profile.error) throw profile.error;
  const membership = await admin.from('app_memberships').upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      application_code: applicationCode,
      role: 'admin',
      is_active: true,
    },
    { onConflict: 'tenant_id,user_id,application_code' },
  );
  if (membership.error) throw membership.error;
  return { email, userId };
}

async function queryAsUser(email, table, select = '*') {
  const client = createClient(url, publishableKey, { auth: { persistSession: false } });
  const session = await client.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session)
    throw session.error ?? new Error('No se obtuvo sesión QA.');
  const result = await client.from(table).select(select);
  if (result.error) throw result.error;
  return result.data ?? [];
}

async function assertAuditAppendOnly(tenantId) {
  const event = await admin
    .from('audit_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();
  if (event.error) throw event.error;
  if (!event.data) return false;
  const update = await admin
    .from('audit_events')
    .update({ action: 'qa_mutation_attempt' })
    .eq('id', event.data.id);
  const remove = await admin.from('audit_events').delete().eq('id', event.data.id);
  if (!update.error || !remove.error)
    throw new Error('audit_events aceptó una mutación prohibida.');
  return true;
}

try {
  const tenants = await admin
    .from('tenants')
    .select('id,name,slug')
    .in('slug', ['default', 'mmddconcepcion', 'colegio-san-jose']);
  if (tenants.error) throw tenants.error;
  const source = tenants.data?.find(
    (tenant) => tenant.slug === 'default' || tenant.slug === 'mmddconcepcion',
  );
  const target = tenants.data?.find((tenant) => tenant.slug === 'colegio-san-jose');
  if (!source || !target) throw new Error('No se encontraron los dos tenants esperados.');

  const sourceUser = await createProbeUser(source.id, 'source');
  const targetUser = await createProbeUser(target.id, 'target');
  const sourceCourses = await queryAsUser(sourceUser.email, 'courses', 'id,tenant_id');
  const targetCourses = await queryAsUser(targetUser.email, 'courses', 'id,tenant_id');
  const sourceTemplates = await queryAsUser(
    sourceUser.email,
    'document_templates',
    'id,tenant_id,doc_type',
  );
  const targetTemplates = await queryAsUser(
    targetUser.email,
    'document_templates',
    'id,tenant_id,doc_type',
  );
  const sourceSettings = await queryAsUser(
    sourceUser.email,
    'institution_settings',
    'tenant_id,official_name',
  );
  const targetSettings = await queryAsUser(
    targetUser.email,
    'institution_settings',
    'tenant_id,official_name',
  );
  const sourceRules = await queryAsUser(
    sourceUser.email,
    'institution_rule_versions',
    'id,tenant_id',
  );
  const targetRules = await queryAsUser(
    targetUser.email,
    'institution_rule_versions',
    'id,tenant_id',
  );

  if (sourceCourses.some((row) => row.tenant_id !== source.id))
    throw new Error('El tenant fuente ve cursos ajenos.');
  if (targetCourses.some((row) => row.tenant_id !== target.id))
    throw new Error('El tenant destino ve cursos ajenos.');
  if (sourceTemplates.some((row) => row.tenant_id !== source.id))
    throw new Error('El tenant fuente ve plantillas ajenas.');
  if (targetTemplates.some((row) => row.tenant_id !== target.id))
    throw new Error('El tenant destino ve plantillas ajenas.');
  if (sourceSettings.some((row) => row.tenant_id !== source.id))
    throw new Error('El tenant fuente ve configuración ajena.');
  if (targetSettings.some((row) => row.tenant_id !== target.id))
    throw new Error('El tenant destino ve configuración ajena.');
  if (sourceRules.some((row) => row.tenant_id !== source.id))
    throw new Error('El tenant fuente ve reglamentos ajenos.');
  if (targetRules.some((row) => row.tenant_id !== target.id))
    throw new Error('El tenant destino ve reglamentos ajenos.');
  if (!(await assertAuditAppendOnly(target.id)))
    throw new Error('No había eventos para probar append-only.');

  console.log(
    JSON.stringify({
      ok: true,
      sourceTenant: source.slug,
      targetTenant: target.slug,
      sourceCourses: sourceCourses.length,
      targetCourses: targetCourses.length,
      sourceTemplates: sourceTemplates.length,
      targetTemplates: targetTemplates.length,
      sourceSettings: sourceSettings.length,
      targetSettings: targetSettings.length,
      sourceRules: sourceRules.length,
      targetRules: targetRules.length,
      auditAppendOnly: true,
    }),
  );
} finally {
  for (const user of users) {
    await admin.from('app_memberships').delete().eq('user_id', user.userId);
    await admin.from('profiles').delete().eq('user_id', user.userId);
    await admin.auth.admin.deleteUser(user.userId);
  }
}
