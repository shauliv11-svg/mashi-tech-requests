// Actual policy migration, synthetic PostgreSQL only. No network or credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const read = file => fs.readFileSync(path.join(__dirname, '../supabase', file), 'utf8');
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      create table public.app_users (id bigint primary key, email text, role text, active boolean);
      create table public.students (id bigint primary key);
      create table public.tech_requests (id bigint primary key, student_id bigint, status text);
      insert into public.students values (1), (2);
      insert into public.tech_requests values (10, 1, 'new'), (11, 1, 'closed');
      insert into public.app_users values
        (1,'admin@example.test','admin',true), (2,'handler@example.test','handler',true),
        (3,'staff@example.test','staff',true), (4,'inactive@example.test','admin',false);
      insert into auth.users select ('00000000-0000-4000-8000-' || lpad(id::text,12,'0'))::uuid,
        email, now() from public.app_users;
      grant select on public.tech_requests to authenticated;
    `);
    await db.exec(read('20260919_add_request_closures.sql'));
    const migration = read('20261013_fix_request_closure_policies.sql');
    await db.exec(migration);
    await db.exec(migration);
    let passed = 0;
    async function actor(id, run) {
      await db.exec(`begin; set local role authenticated;`);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [`00000000-0000-4000-8000-${String(id).padStart(12,'0')}`]);
      try {await run();} finally {await db.exec('rollback');}
    }
    const insert = (actorId, requestId=10, studentId=1) => db.query(`insert into public.request_closures
      (request_id, student_id, closed_by_id, closure_type) values ($1,$2,$3,'תיקון מסך') returning id`, [requestId,studentId,actorId]);
    async function check(name, run) {await run();passed++;console.log('PASS',name);}
    const denied = promise => assert.rejects(promise, e=>e.code==='42501');
    await check('handler can insert, read and undo own incomplete closure', ()=>actor(2, async()=>{
      const row = await insert(2);
      assert.equal(row.rows.length,1);
      assert.equal((await db.query('select * from public.request_closures')).rows.length,1);
      assert.equal((await db.query('delete from public.request_closures')).affectedRows,1);
    }));
    for (const id of [3,4,99]) await check(`staff/inactive/unknown actor ${id} denied`,()=>denied(actor(id,()=>insert(id))));
    await check('cannot forge closure author',()=>denied(actor(2,()=>insert(1))));
    await check('cannot close another student',()=>denied(actor(2,()=>insert(2,10,2))));
    await check('cannot add closure to closed request',()=>denied(actor(2,()=>insert(2,11))));
    await db.exec(`insert into public.request_closures (request_id,student_id,closed_by_id,closure_type)
      values (10,1,2,'תיקון מסך'), (11,1,2,'תיקון מסך')`);
    await check('handler cannot edit or delete completed history',()=>actor(2,async()=>{
      assert.equal((await db.query("update public.request_closures set closing_message='changed'")).affectedRows,0);
      assert.equal((await db.query('delete from public.request_closures where request_id=11')).affectedRows,0);
    }));
    await check('admin can correct history',()=>actor(1,async()=>{
      assert.equal((await db.query("update public.request_closures set closing_message='corrected' where request_id=11")).affectedRows,1);
    }));
    for(const id of [3,4,99]) await check(`actor ${id} cannot read journal`,()=>actor(id,async()=>{
      assert.equal((await db.query('select * from public.request_closures')).rows.length,0);
    }));
    await check('anonymous denied',async()=>{
      await db.exec('begin; set local role anon');
      try {await denied(db.query('select * from public.request_closures'));} finally {await db.exec('rollback');}
    });
    await check('unexpected policy aborts migration',async()=>{
      await db.exec('create policy unexpected on public.request_closures for select using (true)');
      await assert.rejects(db.exec(migration), /Unexpected request_closures policies/);
      await db.exec('rollback');
    });
    console.log(`${passed} closure policy scenarios passed; rerun also verified.`);
  } finally {await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
