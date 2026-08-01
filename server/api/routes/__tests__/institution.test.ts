/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanText, parseLevels } from '../institution';

const projectRoot = resolve(import.meta.dirname, '../../../..');

describe('configuración institucional', () => {
  it('normaliza textos y limita su longitud', () => {
    assert.equal(cleanText('  Colegio  '), 'Colegio');
    assert.equal(cleanText('   '), null);
    assert.equal(cleanText(42), null);
    assert.equal(cleanText('abcdef', 3), 'abc');
  });

  it('normaliza niveles educativos y descarta valores inválidos', () => {
    assert.deepEqual(parseLevels([' básica ', 'media', 42, '']), ['BÁSICA', 'MEDIA']);
    assert.deepEqual(parseLevels('media'), []);
  });

  it('mantiene el registro de la ruta institucional en ambos entry points', () => {
    const devEntry = readFileSync(resolve(projectRoot, 'server/index.ts'), 'utf8');
    const serverlessEntry = readFileSync(resolve(projectRoot, 'server/api/index.ts'), 'utf8');
    assert.match(devEntry, /import institutionRoutes from ['"]\.\/api\/routes\/institution['"]/);
    assert.match(devEntry, /app\.use\(['"]\/api['"], institutionRoutes\)/);
    assert.match(
      serverlessEntry,
      /import institutionRoutes from ['"]\.\/routes\/institution\.js['"]/,
    );
    assert.match(serverlessEntry, /app\.use\(['"]\/api['"], institutionRoutes\)/);
  });

  it('usa columnas explícitas en las consultas institucionales', () => {
    const route = readFileSync(resolve(projectRoot, 'server/api/routes/institution.ts'), 'utf8');
    assert.doesNotMatch(route, /\.select\(['"]\*['"]\)/);
    assert.match(route, /INSTITUTION_SETTINGS_COLUMNS/);
    assert.match(route, /RULE_VERSION_COLUMNS/);
  });

  it('mantiene autorización y aislamiento por tenant en las rutas', () => {
    const route = readFileSync(resolve(projectRoot, 'server/api/routes/institution.ts'), 'utf8');
    assert.match(
      route,
      /router\.use\('\/admin\/institution', requireAuth, requireTenant, requireRole\(ADMIN_ROLES\)\)/,
    );
    assert.match(
      route,
      /router\.use\('\/platform\/tenants\/:tenantId\/institution', requireAuth, requireSuperAdmin\)/,
    );
    assert.match(route, /\.eq\('tenant_id', tenantId\)/);
    assert.match(route, /\.eq\('tenant_id', tenantId\)[\s\S]*\.eq\('status', 'active'\)/);
  });
});
