// Executes the actual migration against in-memory PostgreSQL, never Supabase.
// Synthetic tables model the audited grants/policies, not the full app schema.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const migration = fs.readFileSync(path.join(__dirname, '../supabase/20260927_block_anonymous_access.sql'), 'utf8');
const tables = [
  'app_users', 'students', 'tech_requests', 'request_treatment_updates',
  'request_closures', 'school_devices', 'school_device_loans',
  'school_device_maintenance', 'school_device_availability_blocks'
];
let passed = 0;

async function fixture(run) {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
    `);
    for (const table of tables) {
      await db.exec(`
        create table public.${table} (id bigint primary key, note text not null);
        insert into public.${table} values (1, 'Synthetic fixture');
        alter table public.${table} enable row level security;
        grant all on public.${table} to anon, authenticated, service_role;
      `);
      if (table !== 'request_closures') {
        await db.exec(`create policy baseline_public_all on public.${table}
          for all to public using (true) with check (true)`);
      }
    }
    await run(db);
  } finally {
    await db.close();
  }
}

async function scenario(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

async function asRole(db, role, run) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`begin; set local role ${role};`);
  try {
    return await run();
  } finally {
    await db.exec('rollback');
  }
}

async function denied(db, role, sql) {
  await assert.rejects(asRole(db, role, () => db.query(sql)),
    (error) => error.code === '42501', `${role} must be denied: ${sql}`);
}

async function snapshot(db) {
  const { rows } = await db.query(`
    select c.relname, c.relrowsecurity, c.relacl::text,
      (select jsonb_agg(to_jsonb(p) order by p.policyname)
       from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by c.relname
  `);
  return rows;
}

async function failedMigration(db, expectedMessage) {
  const before = await snapshot(db);
  await assert.rejects(db.exec(migration), expectedMessage);
  // PostgreSQL leaves failed explicit transactions aborted until ROLLBACK.
  await db.exec('rollback');
  assert.deepEqual(await snapshot(db), before, 'failed migration changed policies/grants/RLS');
}

(async () => {
  await fixture(async (db) => {
    await scenario('baseline reproduces anonymous exposure and blocked closures', async () => {
      for (const table of tables) {
        const result = await asRole(db, 'anon', () => db.query(`select * from public.${table}`));
        assert.equal(result.rows.length, table === 'request_closures' ? 0 : 1);
      }
    });

    await db.exec(migration);

    await scenario('all nine tables deny anonymous CRUD', async () => {
      for (const table of tables) {
        for (const sql of [
          `select * from public.${table}`,
          `insert into public.${table} values (2, 'Unauthorized')`,
          `update public.${table} set note = 'Unauthorized' where id = 1`,
          `delete from public.${table} where id = 1`
        ]) await denied(db, 'anon', sql);
      }
    });

    await scenario('both browser roles cannot truncate any audited table', async () => {
      for (const table of tables) {
        for (const role of ['anon', 'authenticated']) {
          await denied(db, role, `truncate public.${table}`);
        }
      }
    });

    await scenario('existing authenticated CRUD remains unchanged on eight tables', async () => {
      for (const table of tables.filter((t) => t !== 'request_closures')) {
        await asRole(db, 'authenticated', async () => {
          assert.equal((await db.query(`select * from public.${table}`)).rows.length, 1);
          assert.equal((await db.query(`insert into public.${table} values (2, 'Test')`)).affectedRows, 1);
          assert.equal((await db.query(`update public.${table} set note = 'Updated' where id = 2`)).affectedRows, 1);
          assert.equal((await db.query(`delete from public.${table} where id = 2`)).affectedRows, 1);
        });
      }
    });

    await scenario('closure access remains blocked, not silently broadened', async () => {
      const result = await asRole(db, 'authenticated', () => db.query('select * from public.request_closures'));
      assert.equal(result.rows.length, 0);
      await denied(db, 'authenticated', "insert into public.request_closures values (2, 'Test')");
    });

    await scenario('service role retains access and all original rows survive', async () => {
      for (const table of tables) {
        const result = await asRole(db, 'service_role', () => db.query(`select * from public.${table}`));
        assert.deepEqual(result.rows, [{ id: 1, note: 'Synthetic fixture' }]);
      }
    });

    await scenario('second application is idempotent', async () => {
      const before = await snapshot(db);
      await db.exec(migration);
      assert.deepEqual(await snapshot(db), before);
    });

    await scenario('restrictive policy still denies rows after accidental table grants', async () => {
      for (const table of tables) {
        await db.exec(`grant select, insert, update, delete on public.${table} to anon`);
        try {
          await asRole(db, 'anon', async () => {
            assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0);
            assert.equal((await db.query(`update public.${table} set note = 'Unauthorized'`)).affectedRows, 0);
            assert.equal((await db.query(`delete from public.${table}`)).affectedRows, 0);
          });
          await denied(db, 'anon', `insert into public.${table} values (2, 'Unauthorized')`);
        } finally {
          await db.exec(`revoke all on public.${table} from anon`);
        }
      }
    });

    await scenario('column grants cannot bypass the restrictive policy', async () => {
      await db.exec('grant select (note), update (note), insert (id, note) on public.students to anon');
      await asRole(db, 'anon', async () => {
        assert.equal((await db.query('select note from public.students')).rows.length, 0);
        assert.equal((await db.query("update public.students set note = 'Unauthorized'")).affectedRows, 0);
      });
      await denied(db, 'anon', "insert into public.students values (2, 'Unauthorized')");
    });
  });

  await scenario('missing last table rolls back earlier changes', () => fixture(async (db) => {
    await db.exec('drop table public.school_device_availability_blocks');
    await failedMigration(db, /Missing required table/);
  }));

  await scenario('inherited anonymous grants abort and roll back', () => fixture(async (db) => {
    await db.exec(`create role legacy_access; grant legacy_access to anon;
      grant select on public.school_devices to legacy_access;`);
    await failedMigration(db, /Unexpected inherited privileges/);
  }));

  await scenario('inherited authenticated truncate aborts and rolls back', () => fixture(async (db) => {
    await db.exec(`create role legacy_access; grant legacy_access to authenticated;
      grant truncate on public.school_devices to legacy_access;`);
    await failedMigration(db, /Unexpected inherited privileges/);
  }));

  await scenario('PUBLIC-only authenticated grants abort instead of breaking access', () => fixture(async (db) => {
    await db.exec(`revoke select on public.school_devices from authenticated;
      grant select on public.school_devices to public;`);
    await failedMigration(db, /Unexpected authenticated\/service grants/);
  }));

  await scenario('missing service-role SELECT aborts and rolls back', () => fixture(async (db) => {
    await db.exec('revoke select on public.school_devices from service_role');
    await failedMigration(db, /Unexpected authenticated\/service grants/);
  }));

  console.log(`${passed} PostgreSQL scenarios passed; no external database was contacted.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
