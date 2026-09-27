// Runs against a local dev server; all Supabase requests are intercepted.
// Usage: NODE_PATH=<playwright package directory> node tests/auth-flow.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = process.env.AUTH_TEST_URL || 'http://localhost:3006';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
  throw new Error('Auth flow tests must run against a local server');
}

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'admin@example.test', aud: 'authenticated', role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
  created_at: '2026-01-01T00:00:00Z'
};
const profile = { id: 9001, name: 'Test Admin', email: user.email, role: 'admin', active: true, class_names: [] };
const token = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: user.id, email: user.email, aud: user.aud, role: user.role, exp: Math.floor(Date.now() / 1000) + 3600 }
].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.test';
const session = { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user };

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.AUTH_TEST_BROWSER_CHANNEL });
  const failures = [];
  async function scenario(name, run) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const calls = [];
    const state = { approved: true, failData: false, failPassword: false, holdProfile: null };
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
      if (!url.hostname.endsWith('.supabase.co')) return route.abort();
      calls.push({ path: url.pathname, auth: route.request().headers().authorization });
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname.endsWith('/token')) return state.failPassword
        ? reply({ error: 'invalid_grant', error_description: 'Invalid credentials' }, 400)
        : reply(session);
      if (url.pathname.endsWith('/user')) return reply(user);
      if (url.pathname.endsWith('/logout') || url.pathname.endsWith('/recover')) return reply({});
      if (url.pathname === '/rest/v1/app_users') {
        if (url.searchParams.has('email') && state.holdProfile) await state.holdProfile;
        return reply(state.approved ? [profile] : []);
      }
      if (url.pathname.startsWith('/rest/v1/')) {
        if (state.failData && url.pathname.endsWith('/students')) return reply({ message: 'Simulated outage', code: 'test' }, 503);
        return reply([]);
      }
      return reply({ message: 'Unexpected mocked request' }, 400);
    });
    const login = async () => {
      await page.locator('#loginEmail').fill(user.email);
      await page.locator('#loginPassword').fill('test-password');
      await page.locator('button[type="submit"]').click();
    };
    try {
      await page.goto(baseURL);
      await page.locator('#loginEmail').waitFor();
      await run({ page, state, calls, login });
      assert.deepEqual(errors, []);
      console.log(`PASS ${name}`);
    } catch (error) {
      failures.push(name);
      console.error(`FAIL ${name}: ${error.message}`);
      console.error((await page.locator('body').innerText()).slice(-3000));
    } finally {
      await context.close();
    }
  }
  try {
    await scenario('anonymous visit and failed login never read school data', async ({ page, state, calls, login }) => {
      assert.equal(calls.filter((call) => call.path.startsWith('/rest/')).length, 0);
      state.failPassword = true;
      await login();
      await page.getByText('הכניסה נכשלה. בדקו מייל וסיסמה, או הגדירו סיסמה חדשה.').first().waitFor();
      assert.equal(calls.filter((call) => call.path.startsWith('/rest/')).length, 0);
    });
    await scenario('verified login loads data; reload restores login; logout clears it', async ({ page, calls, login }) => {
      await login();
      await page.getByText(profile.name, { exact: true }).first().waitFor();
      const firstRead = calls.findIndex((call) => call.path.startsWith('/rest/'));
      assert(calls.slice(0, firstRead).some((call) => call.path.endsWith('/user')));
      assert(calls.filter((call) => call.path.startsWith('/rest/')).every((call) => call.auth === `Bearer ${token}`));
      await page.reload();
      await page.getByText(profile.name, { exact: true }).first().waitFor();
      await page.getByRole('button', { name: 'יציאה', exact: false }).first().click();
      await page.locator('#loginEmail').waitFor();
      assert.equal(await page.getByText(profile.name, { exact: true }).count(), 0);
    });
    await scenario('unapproved account cannot load school tables', async ({ page, state, calls, login }) => {
      state.approved = false;
      await login();
      await page.getByText('החשבון אינו מאושר כמשתמשת פעילה במערכת. פנו לאדמין.', { exact: true }).waitFor();
      assert(calls.filter((call) => call.path.startsWith('/rest/')).every((call) => call.path.endsWith('/app_users')));
      assert.equal(await page.getByText(profile.name, { exact: true }).count(), 0);
    });
    await scenario('load failure shows retry, without demo data', async ({ page, state, login }) => {
      state.failData = true;
      await login();
      await page.getByText('טעינת הנתונים נכשלה. נסו שוב, הנתונים הקיימים לא השתנו.', { exact: true }).waitFor();
      assert.equal(await page.getByText('דנה רוזן', { exact: true }).count(), 0);
      state.failData = false;
      await page.getByRole('button', { name: 'ניסיון חוזר' }).click();
      await page.getByText(profile.name, { exact: true }).first().waitFor();
    });
    await scenario('late profile response cannot restore a signed-out session', async ({ page, state, calls, login }) => {
      let release;
      state.holdProfile = new Promise((resolve) => { release = resolve; });
      await login();
      await page.waitForFunction(() => Object.keys(localStorage).some((key) => key.endsWith('-auth-token')));
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        const key = Object.keys(localStorage).find((entry) => entry.endsWith('-auth-token'));
        localStorage.removeItem(key);
        const channel = new BroadcastChannel(key);
        channel.postMessage({ event: 'SIGNED_OUT', session: null });
        channel.close();
      });
      await page.locator('#loginEmail').waitFor();
      release();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText(profile.name, { exact: true }).count(), 0);
      assert(calls.filter((call) => call.path.startsWith('/rest/')).every((call) => call.path.endsWith('/app_users')));
    });
    await scenario('password reset does not look up profiles', async ({ page, calls }) => {
      await page.getByRole('button', { name: 'איפוס סיסמה', exact: true }).click();
      await page.locator('#loginEmail').fill(user.email);
      await page.locator('button[type="submit"]').click();
      await page.getByText('אם קיים חשבון מתאים, יישלח אליו קישור לאיפוס סיסמה.').waitFor();
      assert.equal(calls.filter((call) => call.path.startsWith('/rest/')).length, 0);
    });
    await scenario('recovery defers school data until password update', async ({ page, calls }) => {
      // Open the recovery link as a fresh document, like a link from an email.
      // Updating only the hash on the running app then reloading races Auth init.
      await page.goto('about:blank');
      await page.goto(`${baseURL}/#access_token=${token}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=recovery`);
      await page.getByRole('button', { name: 'עדכון סיסמה', exact: true }).waitFor();
      assert.equal(calls.filter((call) => call.path.startsWith('/rest/')).length, 0);
      await page.locator('#loginPassword').fill('updated-test-password');
      await page.getByRole('button', { name: 'עדכון סיסמה', exact: true }).click();
      await page.getByText(profile.name, { exact: true }).first().waitFor();
    });
    await scenario('mobile login fits viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: '/tmp/mashi-auth-mobile.png', fullPage: true });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.locator('button[type="submit"]').scrollIntoViewIfNeeded();
      const box = await page.locator('button[type="submit"]').boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= 844);
    });
  } finally {
    await browser.close();
  }
  if (failures.length) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
