// Local browser regression: every database and notification request is mocked.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const baseURL = process.env.AUTH_TEST_URL || 'http://localhost:3006';
assert(['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname));
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.test', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} };
const token = [ { alg: 'HS256' }, { sub: user.id, email: user.email, exp: Math.floor(Date.now()/1000)+3600 } ].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.test';
const profile = { id: 9001, name: 'Test Admin', email: user.email, role: 'admin', active: true, class_names: [] };

(async () => {
  const browser = await chromium.launch({ channel: process.env.AUTH_TEST_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    for (const [name, viewport, failure] of [
      ['desktop-short', {width:1280,height:600}, null],
      ['mobile', {width:390,height:640}, null],
      ['permission-retry', {width:390,height:640}, 'permission'],
      ['email-network', {width:390,height:640}, 'email']
    ]) {
      const context = await browser.newContext({viewport});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let fail = failure;
      let closureWrites = 0;
      let requestWrites = 0;
      let row = { id:900118, requester_id:9001, subject_type:'class', subject_name:'Synthetic request', class_name:'Test', request_type:'תקלה בציוד', description:'Synthetic description', status:'new', created_at:new Date().toISOString() };
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const method = route.request().method();
        const reply = (body, status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
        if (url.pathname === '/api/notifications/request-closed') return route.abort('failed');
        if (url.origin === new URL(baseURL).origin && !url.pathname.startsWith('/api/')) return route.continue();
        if (!url.hostname.endsWith('.supabase.co')) return route.abort();
        if (url.pathname.endsWith('/token')) return reply({access_token:token,refresh_token:'test',expires_in:3600,token_type:'bearer',user});
        if (url.pathname.endsWith('/user')) return reply(user);
        if (url.pathname.endsWith('/app_users')) return reply([profile]);
        if (url.pathname.endsWith('/tech_requests')) {
          if (method === 'PATCH') {requestWrites++;row={...row,...route.request().postDataJSON()};return reply(row);}
          return reply([row]);
        }
        if (url.pathname.endsWith('/request_closures') && method === 'POST') {
          closureWrites++;
          if (fail === 'permission') return reply({code:'42501',message:'row-level security'},403);
          return reply({id:991,...route.request().postDataJSON()});
        }
        return reply([]);
      });
      try {
        await page.goto(baseURL);
        await page.locator('#loginEmail').fill(user.email);
        await page.locator('#loginPassword').fill('test-password');
        await page.locator('button[type=submit]').click();
        await page.locator('.portal-view-tabs').getByRole('button',{name:'ניהול',exact:true}).click();
        await page.locator('.request-card').filter({hasText:'Synthetic request'}).click();
        await page.getByRole('button',{name:'סגירת בקשה',exact:true}).click();
        const dialog = page.getByRole('dialog',{name:'סגירת בקשה',exact:true});
        await dialog.locator('#closureType').selectOption('אחר');
        await dialog.locator('#closureOtherDetail').fill('Synthetic repair');
        await dialog.getByLabel('שליחת מייל למגישה').selectOption(failure === 'email' ? 'yes' : 'no');
        if (failure === 'email') await dialog.locator('#closeMessage').fill('Test closure message');
        const body = dialog.locator('.panel-body');
        assert(await body.evaluate(el => el.scrollHeight > el.clientHeight), 'body must scroll');
        await body.evaluate(el => {el.scrollTop=el.scrollHeight;});
        assert(await body.evaluate(el=>el.scrollTop>0));
        const save=dialog.getByRole('button',{name:'סגירה ושמירה'});
        const box=await save.boundingBox();
        assert(box.y>=0&&box.y+box.height<=viewport.height,'save must stay on screen');
        await page.screenshot({path:`/tmp/mashi-close-${name}.png`});
        await save.click();
        if (failure === 'permission') {
          await dialog.getByRole('alert').filter({hasText:'הרשאות'}).waitFor();
          assert.equal(requestWrites,0);
          assert.equal(await dialog.locator('#closureOtherDetail').inputValue(),'Synthetic repair');
          assert(await save.isEnabled());
          await page.screenshot({path:'/tmp/mashi-close-permission-error.png'});
          fail=null;
          await save.click();
        }
        await dialog.waitFor({state:'hidden'});
        assert.equal(row.status,'closed');
        assert.equal(requestWrites,1);
        assert.equal(closureWrites,failure==='permission'?2:1);
        if (failure==='email') await page.getByText(/לא התקבל אישור לשליחת המייל/).waitFor();
        assert.deepEqual(errors,[]);
        console.log('PASS',name);
      } catch(e) {
        console.error((await page.locator('body').innerText()).slice(-2500));
        throw e;
      } finally {await context.close();}
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
