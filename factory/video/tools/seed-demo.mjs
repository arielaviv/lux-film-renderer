// Press one seed step on the live app as the signed-in admin, and print the project it made or reset.
//   node factory/video/tools/seed-demo.mjs network-bayside-upload-demo
//   node factory/video/tools/seed-demo.mjs network-bayside-splice-demo --origin https://app.lux.tech
// Signs in with the exported session (tools/export-state.mjs → out/state.json), like the cloud render does.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const step = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!step) { console.error('which step? e.g. network-bayside-upload-demo'); process.exit(2); }
const ORIGIN = String(arg('origin', 'https://app.lux.tech')).replace(/\/$/, '');
const statePath = path.resolve(String(arg('state', path.join(HERE, '..', 'out', 'state.json'))));
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const host = new URL(ORIGIN).hostname;
const cookie = state.cookies
  .filter(c => host === c.domain.replace(/^\./, '') || host.endsWith(c.domain.replace(/^\./, '')))
  .map(c => `${c.name}=${c.value}`)
  .join('; ');

const res = await fetch(`${ORIGIN}/api/org/seed-demo`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ step }),
});
const text = await res.text();
if (!res.ok) { console.error(`seed ${step}: ${res.status} ${text.slice(0, 300)}`); process.exit(1); }
const body = JSON.parse(text);
const result = body.step ?? body.result ?? body;
console.log(JSON.stringify({ step, project: result.targetProjectId ?? null, facts: result.facts ?? null }, null, 2));
