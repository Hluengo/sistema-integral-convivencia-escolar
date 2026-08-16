import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('server entry points fail fast when JWT config missing in production', () => {
  // Spawn a fresh node process with tsx loader to import the server entry point
  const node = process.execPath;
  const code = `(async ()=>{ process.env.NODE_ENV='production'; delete process.env.SUPABASE_JWT_SECRET; delete process.env.VITE_SUPABASE_URL; try{ await import(process.cwd() + '/server/index.ts'); console.log('IMPORTED'); process.exit(0);}catch(e){ console.error('THREW', e && e.message); process.exit(2);} })();`;
  const res = spawnSync(node, ['--import', 'tsx', '-e', code], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  // Expect the child to exit non-zero because ensureJwtConfig should throw when both vars missing
  assert.notStrictEqual(
    res.status,
    0,
    `Expected non-zero exit code when JWT config missing; stdout: ${res.stdout} stderr: ${res.stderr}`,
  );
});
