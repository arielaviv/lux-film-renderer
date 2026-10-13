// Export the signed-in session from the film profile as a Playwright storage state (cookies only), for a
// render that runs somewhere this machine's profile is not: `render.mjs --state <file>`.
//   node factory/video/tools/export-state.mjs [out.json]      (default: factory/video/out/state.json, gitignored)
// The browser is opened on about:blank and closed again; nothing is signed in or out. Only the app's own cookies
// are kept (the profile also holds whatever the sign-in provider left behind, which has no business in a secret).
// The auth cookies carry the session's own lifetime — when the profile needs `--login` again, so does the state.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.join(HERE, '..');

function loadPlaywright() {
  for (const c of [process.env.PW_PATH, 'playwright-core', 'playwright'].filter(Boolean)) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright-core not found: set PW_PATH to an install');
}
const { chromium } = loadPlaywright();
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = path.join(FILM, '.profile');
const ORIGIN = new URL(process.env.FILM_ORIGIN || 'https://app.lux.tech');
const out = path.resolve(process.argv[2] ?? path.join(FILM, 'out', 'state.json'));

// The app's host and its parent domains (app.lux.tech, lux.tech), plus the auth vendor's own domain.
const site = ORIGIN.hostname.split('.').slice(-2).join('.');
const ours = c => {
  const d = c.domain.replace(/^\./, '');
  return d === site || d.endsWith(`.${site}`) || d.endsWith('clerk.accounts.dev');
};
// What proves a signed-in session: the client cookie (production instances) or the browser token and the
// refresh token (development-style instances); `__client_uat` alone is only a timestamp.
const isAuth = c => /^(__client(?!_uat)|__clerk_db_jwt|__refresh|__session)/.test(c.name);

if (!fs.existsSync(PROFILE)) { console.error('no profile at', PROFILE, '- run render.mjs --login first'); process.exit(1); }
const ctx = await chromium.launchPersistentContext(PROFILE, {
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  headless: true,
  args: ['--no-first-run', '--disable-gpu'],
});
const state = await ctx.storageState();
await ctx.close();

const live = c => !c.expires || c.expires < 0 || c.expires * 1000 > Date.now();
const cookies = state.cookies.filter(c => ours(c) && live(c));
const dropped = state.cookies.length - cookies.length;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ cookies, origins: [] }));
const auth = cookies.filter(isAuth);
console.log(`wrote ${out}: ${cookies.length} cookies for ${site} (${dropped} others left out), ${fs.statSync(out).size} bytes`);
console.log(`session: ${auth.map(c => `${c.name}@${c.domain}`).join(', ') || 'none'}`);
if (!auth.length) { console.error('the profile holds no session - run render.mjs --login first, then export again'); process.exit(1); }
