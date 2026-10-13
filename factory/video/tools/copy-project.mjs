// Copies a project (its definition and every main-branch file) through the app, signed in as the film's
// profile, and prints the new id. The film shoots on a copy of the demo project so a render never touches
// the one presenters press Play on.
//
//   node factory/video/tools/copy-project.mjs cmuu7k8sp0001z7ts28pcn2cw [--name "Acme — Bayside (film)"]
//   options: --origin https://app.lux.tech  --profile factory/video/.profile

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const source = process.argv.slice(2).find(a => !a.startsWith('--') && !process.argv[process.argv.indexOf(a) - 1]?.startsWith('--'));
if (!source) { console.error('usage: copy-project.mjs <projectId> [--name "..."]'); process.exit(2); }

function loadPlaywright() {
  for (const c of [process.env.PW_PATH, 'playwright-core', 'playwright'].filter(Boolean)) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright-core not found: set PW_PATH');
}
const { chromium } = loadPlaywright();
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ORIGIN = String(arg('origin', 'https://app.lux.tech')).replace(/\/$/, '');
const PROFILE = path.resolve(String(arg('profile', path.join(HERE, '..', '.profile'))));

const ctx = await chromium.launchPersistentContext(PROFILE, {
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  headless: true,
  args: ['--no-first-run'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(`${ORIGIN}/projects`, { waitUntil: 'domcontentloaded', timeout: 90000 });
// The saved session's token is short-lived: let the app's auth client come up and mint a fresh one before
// the request goes out with the profile's cookies.
await page.waitForFunction(() => !!window.Clerk?.session, null, { timeout: 60000 }).catch(() => {});
await page.evaluate(() => window.Clerk?.session?.getToken({ skipCache: true })).catch(() => {});
const res = await ctx.request.post(`${ORIGIN}/api/projects/${source}/duplicate`);
if (!res.ok()) { console.error('duplicate failed', res.status(), await res.text()); await ctx.close(); process.exit(1); }
const { project } = await res.json();
const name = arg('name', null);
if (name) {
  const r = await ctx.request.patch(`${ORIGIN}/api/projects/${project.id}`, { data: { name } });
  if (!r.ok()) console.error('rename failed', r.status(), (await r.text()).slice(0, 200));
}
console.log(project.id, name ?? project.name);
await ctx.close();
