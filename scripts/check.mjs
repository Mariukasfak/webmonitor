// Monitor https://www.vmi.lt/pardavimai/lt/e-parduotuve and track <span id="eshop_total">
// No external dependencies; requires Node.js >= 20

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://www.vmi.lt/pardavimai/lt/e-parduotuve';
const SELECTOR_ID = 'eshop_total';
const STATE_PATH = path.resolve(__dirname, '..', 'state.json');

function nowIso() {
  return new Date().toISOString();
}

function log(msg) {
  console.log(`[web-monitor] ${msg}`);
}

function appendEnv(key, value) {
  const out = process.env.GITHUB_ENV;
  if (!out) return;
  // Ensure no newline injection
  const safe = String(value).replace(/\r?\n/g, ' ');
  fs.appendFileSync(out, `${key}=${safe}\n`);
}

function appendOutput(key, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  const safe = String(value).replace(/\r?\n/g, ' ');
  fs.appendFileSync(out, `${key}=${safe}\n`);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    // Abort after 20s
    signal: AbortSignal.timeout(20000),
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; web-monitor/0.1; +https://github.com)'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractValue(html) {
  // Look for: <span id="eshop_total">23</span>
  const re = new RegExp(`<span[^>]*id=[\"']${SELECTOR_ID}[\"'][^>]*>(\\d+)<\\/span>`, 'i');
  const m = html.match(re);
  if (!m) throw new Error(`Could not find <span id="${SELECTOR_ID}">...</span>`);
  return parseInt(m[1], 10);
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeState(last) {
  const state = { last, updatedAt: nowIso() };
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
  return state;
}

(async () => {
  const timestamp = nowIso();
  try {
    log(`Fetching ${URL} ...`);
    const html = await fetchHtml(URL);
    const current = extractValue(html);

    const prev = readState();
    if (!prev) {
      writeState(current);
      const msg = `Initialized state with value=${current} at ${timestamp}`;
      log(msg);
      // Set both ENV (for manual/local runs) and step outputs (for Actions conditions)
      appendEnv('CHANGED', 'false');
      appendEnv('OLD', '');
      appendEnv('CURRENT', String(current));
      appendEnv('TIMESTAMP', timestamp);
      appendEnv('URL', URL);
      appendEnv('MESSAGE', msg);
      appendOutput('changed', 'false');
      appendOutput('old', '');
      appendOutput('current', String(current));
      appendOutput('timestamp', timestamp);
      appendOutput('url', URL);
      appendOutput('message', msg);
      process.exit(0);
    }

    const old = Number(prev.last);
    const changed = Number.isFinite(old) && old !== current;

    if (changed) {
      writeState(current);
      const msg = `Value changed: ${old} -> ${current} at ${timestamp}`;
      log(msg);
      appendEnv('CHANGED', 'true');
      appendEnv('OLD', String(old));
      appendEnv('CURRENT', String(current));
      appendEnv('TIMESTAMP', timestamp);
      appendEnv('URL', URL);
      appendEnv('MESSAGE', msg);
      appendOutput('changed', 'true');
      appendOutput('old', String(old));
      appendOutput('current', String(current));
      appendOutput('timestamp', timestamp);
      appendOutput('url', URL);
      appendOutput('message', msg);
    } else {
      const msg = `No change: still ${current} at ${timestamp}`;
      log(msg);
      appendEnv('CHANGED', 'false');
      appendEnv('OLD', String(old));
      appendEnv('CURRENT', String(current));
      appendEnv('TIMESTAMP', timestamp);
      appendEnv('URL', URL);
      appendEnv('MESSAGE', msg);
      appendOutput('changed', 'false');
      appendOutput('old', String(old));
      appendOutput('current', String(current));
      appendOutput('timestamp', timestamp);
      appendOutput('url', URL);
      appendOutput('message', msg);
    }
  } catch (err) {
    const msg = `Error: ${(err && err.message) || String(err)}`;
    console.error(msg);
    appendEnv('CHANGED', 'false');
    appendEnv('OLD', '');
    appendEnv('CURRENT', '');
    appendEnv('TIMESTAMP', timestamp);
    appendEnv('URL', URL);
    appendEnv('MESSAGE', msg);
    appendOutput('changed', 'false');
    appendOutput('old', '');
    appendOutput('current', '');
    appendOutput('timestamp', timestamp);
    appendOutput('url', URL);
    appendOutput('message', msg);
    // Do not fail the workflow; a transient error shouldn't spam failures
    process.exit(0);
  }
})();
