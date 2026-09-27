// No network or environment secrets: compile and exercise the route with fakes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../app/api/health/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

async function check(name, env, result, expectedStatus, expectedDatabase) {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports, module,
    process: { env },
    require: (id) => {
      if (id === 'next/server') return { NextResponse: {
        json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers })
      } };
      if (id === '@supabase/supabase-js') return { createClient: (url, key, options) => {
        calls.push({ url, key, options });
        return { from: (table) => {
          assert.equal(table, 'app_users');
          return { select: (columns, query) => {
            assert.equal(columns, 'id');
            assert.equal(query.head, true);
            assert.equal(query.count, undefined);
            return { limit: async (n) => {
              assert.equal(n, 1);
              if (result instanceof Error) throw result;
              return result;
            } };
          } };
        } };
      } };
      throw new Error(`Unexpected import: ${id}`);
    }
  });
  const response = await module.exports.GET();
  assert.equal(response.status, expectedStatus);
  assert.equal(response.body.database, expectedDatabase);
  assert.equal(response.body.ok, expectedStatus === 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.ok(!Number.isNaN(Date.parse(response.body.checkedAt)));
  assert.deepEqual(Object.keys(response.body).sort(), ['checkedAt', 'database', 'ok']);
  if (expectedDatabase === 'not_configured') assert.equal(calls.length, 0);
  else {
    assert.equal(calls.length, 1);
    assert.equal(calls[0].key, 'test-server-key');
    assert.equal(calls[0].options.auth.persistSession, false);
    assert.equal(calls[0].options.auth.autoRefreshToken, false);
  }
  console.log(`PASS ${name}`);
}

(async () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-server-key' };
  await check('missing config', {}, null, 500, 'not_configured');
  await check('no fallback to anon key', { NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon' }, null, 500, 'not_configured');
  await check('missing URL', { SUPABASE_SERVICE_ROLE_KEY: 'test-server-key' }, null, 500, 'not_configured');
  await check('server-only HEAD query', env, { error: null }, 200, 'ok');
  await check('database error is sanitized', env, { error: { message: 'private detail' } }, 503, 'error');
  await check('network exception is sanitized', env, new Error('private detail'), 503, 'error');
})().catch((error) => { console.error(error); process.exitCode = 1; });
