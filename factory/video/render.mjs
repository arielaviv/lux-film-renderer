// Renders a Lux product film frame by frame: a virtual clock steps the real app 1/60 s at a time, a vector cursor
// drives real mouse and keyboard events, and every frame is a screenshot piped into ffmpeg. Same shot, same video.
//
//   node factory/video/render.mjs                        -> out/bayside.mp4 (1920x1080, 60 fps)
//   node factory/video/render.mjs --vertical             -> out/bayside-vertical.mp4 (1080x1920)
//   node factory/video/render.mjs --stills 3,14.5,27     -> out/stills/*.png (quick look, no video)
//   node factory/video/render.mjs --login                -> a headed window to sign in once (kept in .profile/)
//   node factory/video/render.mjs --state out/state.json -> run on an exported session instead of the profile
//                                                           (tools/export-state.mjs; how the cloud render signs in)
//   options: --shot bayside  --origin https://app.lux.tech  --profile <dir>  --dpr 2  --from 0 --to 42  --out path.mp4
//   env: PW_PATH (a playwright-core install), CHROME_PATH (the Chrome to run; the map needs WebGL)
//   --ready 240: seconds of real time the workspace may take to come up (default 60; a software GPU needs more)
//   --fps 15: a coarser clock for a check pass (stills), 30 for a review cut; --dpr 1.5: fewer pixels a frame where
//   there is no GPU (--dpr 1 for a check: the cost of a frame on a software GPU goes with its pixels)
//
// The app is the real one, signed in, on its own origin. The comp (comp/index.html) is served AT that origin by
// request interception, so the film page and the product iframe are same-origin and the comp can reach into the page.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const flag = k => process.argv.includes('--' + k);

function loadPlaywright() {
  for (const c of [process.env.PW_PATH, 'playwright-core', 'playwright'].filter(Boolean)) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright-core not found: npm i -g playwright-core, or set PW_PATH to an install');
}
const { chromium } = loadPlaywright();
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const shot = arg('shot', 'bayside');
const ORIGIN = String(arg('origin', 'https://app.lux.tech')).replace(/\/$/, '');
const PROFILE = path.resolve(String(arg('profile', path.join(HERE, '.profile'))));
const STATE = arg('state', null); // a storage state file instead of the profile (a machine without one)
const vertical = flag('vertical');
const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
const dpr = Number(arg('dpr', 2));
// 60 for a cut. A check pass can step coarser (--fps 15): the presses and the typing still land, four times sooner.
const FPS = Number(arg('fps', 60));
const FILM = '/__film/'; // where the comp lives on the app's origin (intercepted, never deployed)

const S = (await import(pathToFileURL(path.join(HERE, 'comp/shots', shot + '.js')).href)).default;

// The map is WebGL. --gpu renders it on the machine's GPU (much faster when there is one); the default is
// SwiftShader, which is slow but identical on every machine.
const gpuArgs = flag('gpu')
  ? ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-gpu-rasterization']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
// --login is a plain, visible Chrome: the render flags (software GPU, no hinting, hidden scrollbars) are for
// headless frames and paint a visible window black.
const launch = {
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  // no Chrome here (a Linux runner): Playwright's bundled browser; PW_CHANNEL=chromium picks the full build over
  // the headless shell, whose WebGL is not the same
  channel: fs.existsSync(CHROME) ? undefined : process.env.PW_CHANNEL,
  headless: !flag('login'),
  args: flag('login')
    ? ['--no-first-run']
    : ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars', '--no-first-run', ...gpuArgs],
};
const view = { viewport: flag('login') ? null : { width: 1440, height: 900 }, deviceScaleFactor: flag('login') ? undefined : dpr };
// The profile is the signed-in browser on this machine. With --state the browser is a fresh one and the
// session comes from the exported cookies (the cloud render has no profile to keep).
const browser = STATE ? await chromium.launch(launch) : null;
const ctx = browser
  ? await browser.newContext({ ...view, storageState: path.resolve(String(STATE)) })
  : await chromium.launchPersistentContext(PROFILE, { ...launch, ...view });
const shutdown = async () => { await ctx.close(); await browser?.close(); };
// A WebGL canvas without preserveDrawingBuffer may be captured between frames as blank (it did, at random, on a
// software GPU: whole frames of white map). Every page and frame the film opens keeps its buffer.
await ctx.addInitScript(() => {
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (typeof type === 'string' && /webgl/i.test(type)) attrs = { ...(attrs || {}), preserveDrawingBuffer: true };
    return get.call(this, type, attrs);
  };
});

// A coarser clock (--fps 15 or 30) still lets the page draw every 16 ms of virtual time in between, frames
// nobody keeps, and on a software GPU each map draw is the cost. Here requestAnimationFrame fires at most once a
// film frame, so the map draws as often as the film looks at it. A 60 fps cut keeps the browser's own pacing.
if (FPS < 60) {
  await ctx.addInitScript(period => {
    const queue = new Map();
    let next = 1, timer = 0;
    const flush = () => {
      timer = 0;
      const due = [...queue.values()];
      queue.clear();
      const now = performance.now();
      for (const cb of due) { try { cb(now); } catch (e) { setTimeout(() => { throw e; }); } }
    };
    const raf = cb => {
      const id = next++;
      queue.set(id, cb);
      if (!timer) timer = setTimeout(flush, Math.max(1, Math.floor(period) - 1));
      return id;
    };
    const caf = id => { queue.delete(id); };
    // the virtual clock installs its own pair after this; the gate stays (it schedules on the clock's timers)
    for (const [k, v] of [['requestAnimationFrame', raf], ['cancelAnimationFrame', caf]])
      Object.defineProperty(window, k, { configurable: true, get: () => v, set: () => {} });
  }, 1000 / FPS);
}

// ---- 0. a signed-in session. --login opens a window; sign in, close it, run again.
const boot = ctx.pages()[0] ?? (await ctx.newPage());
if (flag('login')) {
  await boot.goto(`${ORIGIN}/projects`);
  console.log('sign in, then close the window');
  await new Promise(r => ctx.on('close', r));
  process.exit(0);
}
await boot.goto(`${ORIGIN}/projects`, { waitUntil: 'domcontentloaded', timeout: 90000 });
if (!/\/projects/.test(boot.url()) || /sign-in|accounts\./.test(boot.url())) {
  console.error('not signed in on', STATE ? `state ${STATE}` : PROFILE, '- run with --login first' + (STATE ? ', then export the state again' : ''));
  await shutdown(); process.exit(1);
}
// The saved session's token is short-lived: let the app's auth client come up and mint a fresh one before
// any request goes out with the profile's cookies.
await boot.waitForFunction(() => !!window.Clerk?.session, null, { timeout: 60000 }).catch(() => console.log('warning: no auth client on the projects page'));
await boot.evaluate(() => window.Clerk?.session?.getToken({ skipCache: true })).catch(() => {});

// ---- 1. a fresh story: the demo project reset (what Play presses first), and the session the film opens.
// A shot without a project names its page (`path`): a desk of the app, read as it is, nothing reset.
// The reset rewrites a few hundred files; the app answers 500 now and then under load, so ask again.
let PAGE;
if (S.seedStep) {
  // The seed lays the demo project down or resets it, and opens a fresh session on it — what Play does, for a
  // project the film owns. It runs as the signed-in admin, through the page's own session.
  let seeded = null;
  for (let attempt = 1; attempt <= 4 && !seeded; attempt++) {
    const res = await ctx.request.post(`${ORIGIN}/api/org/seed-demo`, { data: { step: S.seedStep }, timeout: 280000 }).catch(e => ({ ok: () => false, status: () => 'timeout', text: async () => e.message }));
    const text = await res.text();
    if (res.ok()) {
      const body = JSON.parse(text);
      const step = body.step ?? body.result ?? {};
      if (step.targetProjectId && step.facts?.session) seeded = { project: step.targetProjectId, session: step.facts.session };
      else console.log('seed answered without a project or session:', text.slice(0, 200));
    } else console.log('seed failed', res.status(), text.slice(0, 160), `(attempt ${attempt})`);
    if (!seeded) await boot.waitForTimeout(5000);
  }
  if (!seeded) { console.error(`the seed step ${S.seedStep} kept failing`); await shutdown(); process.exit(1); }
  PAGE = `/projects/${seeded.project}?session=${seeded.session}&tours=off`;
  console.log('seeded', S.seedStep, '→ project', seeded.project, 'session', seeded.session);
} else if (S.project) {
  let reset;
  for (let attempt = 1; attempt <= 4; attempt++) {
    // a few hundred files rewritten: slow when other takes share the database, so wait long and ask again
    reset = await ctx.request.post(`${ORIGIN}/api/projects/${S.project}/demo/reset`, { timeout: 280000 }).catch(e => ({ ok: () => false, status: () => 'timeout', text: async () => e.message }));
    if (reset.ok()) break;
    console.log('reset failed', reset.status(), (await reset.text()).slice(0, 120), `(attempt ${attempt})`);
    await boot.waitForTimeout(5000);
  }
  if (!reset.ok()) { console.error('the demo reset kept failing'); await shutdown(); process.exit(1); }
  const { sessionId } = await reset.json();
  PAGE = `/projects/${S.project}?session=${sessionId}&tours=off`;
  console.log('session', sessionId);
} else {
  PAGE = S.path + (S.path.includes('?') ? '&' : '?') + 'tours=off';
  console.log('page', PAGE);
}

await boot.goto('about:blank');

// ---- 3. the comp, on the app's origin, on a virtual clock
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const COMP_DIR = path.join(HERE, 'comp');
await ctx.route(`${ORIGIN}${FILM}**`, route => {
  const rel = decodeURIComponent(new URL(route.request().url()).pathname.slice(FILM.length)) || 'index.html';
  const f = path.join(COMP_DIR, rel);
  if (!f.startsWith(COMP_DIR) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'no ' + rel });
  return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f), headers: { 'cache-control': 'no-store' } });
});
const page = await ctx.newPage();
await page.setViewportSize({ width: W, height: H });
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('console', m => {
  const text = m.text();
  if (/^\[(Demo|film)\]/.test(text)) console.log('app', text.slice(0, 200));
  else if (m.type() === 'error' && !/favicon|net::ERR/.test(text)) console.log('console', text.slice(0, 160));
});
// The clock starts at the real now, so the session's own tokens and timestamps agree with the server; from here
// only our steps move it, never the wall clock.
const NOW = Date.now();
await page.clock.install({ time: NOW });
await page.clock.pauseAt(NOW + 1000);
await page.goto(`${ORIGIN}${FILM}index.html`);
await page.evaluate(a => window.setup(a), { shot, W, H, page: ORIGIN + PAGE, origin: ORIGIN });

// let the app settle (network is real, time is not): step the clock in small slices until the workspace is in.
// The budget is real time (--ready seconds): a software GPU brings the map up much later than a real one.
let clockMs = 0;
const step = async ms => { await page.clock.runFor(ms); clockMs += ms; };
const productFrame = () => page.frames().find(f => f !== page.mainFrame() && f.url().startsWith(ORIGIN + '/'));
const READY_MS = Number(arg('ready', 60)) * 1000;
const PARTIAL_MS = 20000; // half-loaded this long = failed
let readyAt = -1, reloads = 0, partialSince = -1;
const started = Date.now();
for (let i = 0; Date.now() - started < READY_MS; i++) {
  await step(50); await page.waitForTimeout(25);
  const f = productFrame();
  const state = f ? await f.evaluate(sels => ({ ready: sels.every(s => !!document.querySelector(s)), failed: /Failed to load project|This view failed to render/.test(document.body.innerText), partial: !!document.querySelector(sels[0]) }), S.ready).catch(() => ({ ready: false, failed: false, partial: false })) : { ready: false, failed: false, partial: false };
  // Half-loaded: the composer is up but the rest of `ready` never comes (the project record's request failed
  // while the files' succeeded). Give it a while of real time, then reload like a failure.
  if (!state.ready && state.partial) { partialSince = partialSince < 0 ? Date.now() : partialSince; if (Date.now() - partialSince > PARTIAL_MS) { state.failed = true; partialSince = -1; } } else partialSince = -1;
  if (state.failed && reloads < 4) {
    reloads++; readyAt = -1;
    console.log(`workspace failed to load in the film (reload ${reloads})`);
    await page.evaluate(() => { const f = document.querySelector('#page'); f.src = f.src; });
    await page.waitForTimeout(3000);
    continue;
  }
  if (state.ready && readyAt < 0) { readyAt = i; console.log(`workspace ready after ${((Date.now() - started) / 1000).toFixed(0)} s`); }
  if (state.ready && i - readyAt >= (S.settleAfterReady ?? 120)) break; // a few seconds more for the map's tiles and fonts
}
if (readyAt < 0) {
  // say what was missing, and leave a picture of it for whoever reads the log
  const f = productFrame();
  const seen = f ? await f.evaluate(sels => ({ missing: sels.filter(s => !document.querySelector(s)), text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 240) }), S.ready).catch(e => ({ missing: S.ready, text: `(frame not readable: ${e.message})` })) : { missing: S.ready, text: '(no product frame)' };
  console.error(`the workspace never loaded in ${READY_MS / 1000} s; giving up. missing: ${seen.missing.join(' | ')}\n  page said: ${seen.text}`);
  fs.mkdirSync(path.join(HERE, 'out', 'stills'), { recursive: true });
  await page.screenshot({ path: path.join(HERE, 'out', 'stills', 'never-ready.png') }).catch(() => {});
  await shutdown(); process.exit(1);
}
// The map's sprites, glyphs and tiles arrive on the real network; a quiet wire for a moment is the sign they
// are in (the GPU path reaches the first frame before they would otherwise be).
let quiet = true;
await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => { quiet = false; console.log('warning: the wire never went quiet; settling longer'); });
for (let i = 0; i < (quiet ? (S.settleAfterIdle ?? 40) : (S.settleWhenNoisy ?? 240)); i++) { await step(50); await page.waitForTimeout(25); }
// the UI the cursor will visit, measured in this very frame (a separate load can lay out differently)
const anchors = await page.evaluate(() => window.arm());
console.log('anchors', JSON.stringify(anchors));
for (const [k, v] of Object.entries(anchors)) if (!v) console.log('anchor missing:', k, S.anchors[k]);
await page.mouse.move(2, 2);
await step(Math.max(0, S.preroll * 1000 - clockMs));
await page.waitForTimeout(300);

// The session's token is refreshed by a timer we froze; ask for a fresh one on the wall clock instead.
let lastKeep = 0;
async function keepAlive(force = false) {
  if (!force && Date.now() - lastKeep < 30000) return;
  lastKeep = Date.now();
  const f = productFrame();
  if (f) await f.evaluate(() => window.Clerk?.session?.getToken({ skipCache: true })).catch(e => console.log('keepalive', e.message));
}
await keepAlive(true);

// ---- 4. frames
const from = Number(arg('from', 0)), to = Number(arg('to', S.duration));
const stillsArg = arg('stills', null);
const stills = stillsArg === 'auto' ? (S.stills ?? [3, 8, 13, 18, 23, 28]).join(',') : stillsArg;
const times = stills ? String(stills).split(',').map(Number) : null;
const outDir = path.join(HERE, 'out');
fs.mkdirSync(outDir, { recursive: true });

// page.screenshot captures at the device scale (2x), and ffmpeg downsamples: free supersampling for text and the
// cursor. Video frames go as JPEG (a 3840x2160 PNG costs ~2 s to encode, a q92 JPEG a fraction of that, and the
// downscale hides the rest); stills stay PNG so what you look at is exact.
const grab = () => (times ? page.screenshot({ type: 'png', caret: 'initial' }) : page.screenshot({ type: 'jpeg', quality: Number(arg('q', 92)), caret: 'initial' }));

let ff, outFile;
if (!times) {
  outFile = arg('out', path.join(outDir, `${shot}${vertical ? '-vertical' : ''}.mp4`));
  // A narration the shot names (comp/assets/<file>) rides along as the audio track, from `at` seconds in.
  const voice = S.audio && fs.existsSync(path.join(COMP_DIR, 'assets', S.audio.file)) ? S.audio : null;
  if (S.audio && !voice) console.log('warning: no narration file', S.audio.file);
  ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    ...(voice ? ['-itsoffset', String(voice.at ?? 0), '-i', path.join(COMP_DIR, 'assets', voice.file)] : []),
    '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film',
    '-profile:v', 'high', '-r', String(FPS), '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(voice ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k', '-shortest'] : []),
    '-movflags', '+faststart', outFile],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('exit', code => { if (code) { console.error('ffmpeg exited', code); process.exit(1); } });
}

const last = times ? Math.round(Math.max(...times) * FPS) : Math.round(to * FPS) - 1;
const want = times ? new Set(times.map(t => Math.round(t * FPS))) : null;
let down = false, sceneMs = 0, typed = '';
const t0 = Date.now();
const cost = { step: 0, frame: 0, grab: 0, n: 0, grabs: 0 }; // where the real time goes, per frame
const timed = async (k, fn) => { const a = Date.now(); const r = await fn(); cost[k] += Date.now() - a; return r; };
for (let f = 0; f <= last; f++) {
  const t = f / FPS;
  const target = Math.round((f * 1000) / FPS);
  if (target > sceneMs) { await timed('step', () => step(target - sceneMs)); sceneMs = target; }
  const r = await timed('frame', () => page.evaluate(t => window.frame(t), t));
  if (r.mouse && r.mouse.every(Number.isFinite)) await page.mouse.move(r.mouse[0], r.mouse[1]);
  else if (r.mouse) console.log('warning: the comp gave a non-finite mouse position at', t.toFixed(2));
  if (r.down !== down) { down = r.down; await (down ? page.mouse.down() : page.mouse.up()); }
  // typing is real key presses into whatever the cursor focused; the comp says what should be on screen by now
  if (typeof r.typed === 'string' && r.typed.length > typed.length && r.typed.startsWith(typed)) {
    if (!typed) { // the first keystroke: say where it is going
      const where = await (productFrame()?.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${a.closest('[data-tour]') ? ' in ' + a.closest('[data-tour]').getAttribute('data-tour') : ''}` : 'nothing'; }) ?? Promise.resolve('no frame'));
      console.log(`typing at ${t.toFixed(2)} into ${where}`);
    }
    await page.keyboard.type(r.typed.slice(typed.length)); typed = r.typed;
  } else if (typeof r.typed === 'string' && !r.typed.startsWith(typed)) typed = r.typed;
  if (r.key) await page.keyboard.press(r.key);
  await timed('frame', () => page.evaluate(t => window.frame(t), t)); // pick up hover/active styles this frame
  await keepAlive();
  cost.n++;
  if (f % 60 === 0) console.log(`t=${t.toFixed(1)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed  per frame: step ${(cost.step / cost.n).toFixed(0)} ms, comp ${(cost.frame / cost.n).toFixed(0)} ms${cost.grabs ? `, shot ${(cost.grab / cost.grabs).toFixed(0)} ms` : ''}`);
  if (f < Math.round(from * FPS)) continue;
  if (want && !want.has(f)) continue;
  if (times) console.log('still', t.toFixed(2), 'mouse', JSON.stringify(r.mouse), r.typed !== undefined ? `typed ${JSON.stringify(r.typed)}` : '', r.follow ? 'follow' : '');
  const png = await timed('grab', grab); cost.grabs++;
  if (times) { fs.mkdirSync(path.join(outDir, 'stills'), { recursive: true }); fs.writeFileSync(path.join(outDir, 'stills', `${shot}${vertical ? '-v' : ''}-${t.toFixed(2)}.png`), png); }
  else if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
}
if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('wrote', outFile); }
await shutdown();
