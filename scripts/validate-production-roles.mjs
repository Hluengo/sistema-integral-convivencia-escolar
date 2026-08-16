/** @license SPDX-License-Identifier: Apache-2.0 */

import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configuredBase = process.env.E2E_BASE_URL;
const base =
  configuredBase && !/localhost|127\.0\.0\.1/.test(configuredBase)
    ? configuredBase
    : 'https://sistema-integral-convivencia-escola-pied.vercel.app';
if (!url || !key || !serviceKey) throw new Error('Faltan variables Supabase.');
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const tenantId = '6f979bb9-ba34-491a-ae5c-e7991618050c';
const password = `Qa-${crypto.randomBytes(18).toString('base64url')}!`;
const suffix = crypto.randomUUID().slice(0, 8);
const users = [];

async function createUser(role) {
  const email = `qa-role-${role}-${suffix}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id: tenantId, role },
    app_metadata: { tenant_id: tenantId, role },
  });
  if (created.error || !created.data.user)
    throw created.error ?? new Error('No se creó usuario QA.');
  const userId = created.data.user.id;
  users.push(userId);
  const profile = await admin.from('profiles').upsert(
    {
      user_id: userId,
      tenant_id: tenantId,
      email,
      full_name: `QA ${role}`,
      role,
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
      application_code: 'convivencia',
      role,
      is_active: true,
    },
    { onConflict: 'tenant_id,user_id,application_code' },
  );
  if (membership.error) throw membership.error;
  return email;
}

async function getAccessToken(email) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const session = await client.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session)
    throw session.error ?? new Error('No se obtuvo sesión.');
  return session.data.session.access_token;
}

async function request(accessToken, path) {
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.status;
}

try {
  const expected = {
    admin: { admin: 200, institution: 200, onboarding: 200 },
    direccion: { admin: 200, institution: 200, onboarding: 200 },
    convivencia: { admin: 403, institution: 403, onboarding: 200 },
    inspectoria: { admin: 403, institution: 403, onboarding: 200 },
    profesor_jefe: { admin: 403, institution: 403, onboarding: 200 },
    teacher: { admin: 403, institution: 403, onboarding: 200 },
    inspector: { admin: 403, institution: 403, onboarding: 200 },
    user: { admin: 403, institution: 403, onboarding: 200 },
    staff: { admin: 403, institution: 403, onboarding: 200 },
  };
  const results = {};
  for (const [role, statuses] of Object.entries(expected)) {
    const email = await createUser(role);
    const accessToken = await getAccessToken(email);
    const adminStatus = await request(accessToken, '/api/admin/members');
    const institutionStatus = await request(accessToken, '/api/admin/institution');
    const onboardingStatus = await request(accessToken, '/api/onboarding/status');
    if (
      adminStatus !== statuses.admin ||
      institutionStatus !== statuses.institution ||
      onboardingStatus !== statuses.onboarding
    )
      throw new Error(
        `Permisos incorrectos para ${role}: ${adminStatus}/${institutionStatus}/${onboardingStatus}`,
      );
    results[role] = {
      admin: adminStatus,
      institution: institutionStatus,
      onboarding: onboardingStatus,
    };
  }
  console.log(JSON.stringify({ ok: true, results }));
} finally {
  for (const userId of users) {
    await admin.from('app_memberships').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('user_id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}
