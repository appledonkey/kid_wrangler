#!/usr/bin/env node
/* Bulk-generate voice MP3s from the ElevenLabs API.
 *
 * Reads VOICE_RECORDING.csv (built by build-voice-checklist.mjs), calls
 * the ElevenLabs text-to-speech endpoint once per line, and writes each
 * MP3 to app/www/audio/voice/<slug>.mp3. The KidWrangler runtime
 * auto-detects these and plays them in place of the browser TTS — no
 * code changes needed.
 *
 * USAGE
 *
 *   # One-time setup: copy the env template + fill in your credentials.
 *   #   PowerShell:  Copy-Item .env.example .env
 *   #   bash/zsh:    cp .env.example .env
 *   # Then edit `.env` and paste your API key + voice ID. The script
 *   # auto-loads `.env` at startup — no env-var exports needed.
 *
 *   # Test on 5 lines first (cheap sanity check)
 *   node app/scripts/generate-voices.mjs --limit 5
 *
 *   # Do one game at a time
 *   node app/scripts/generate-voices.mjs --game "Red Light / Green Light"
 *
 *   # Generate everything (~1000 unique files — costs real money, run last)
 *   node app/scripts/generate-voices.mjs
 *
 * FLAGS
 *
 *   --voice <id>      Voice ID from ElevenLabs (or set ELEVENLABS_VOICE_ID env)
 *   --game <name>     Only generate this game's lines (matches CSV "game" col)
 *   --limit <N>       Stop after N successful generations (good for test runs)
 *   --tier <name>     "system" or "content" — only generate this tier
 *   --force           Overwrite existing MP3s (default: skip files that exist)
 *   --dry-run         Print what would be generated, don't call the API
 *   --model <id>      Model ID (default: eleven_multilingual_v2)
 *                     Cheap alt: eleven_turbo_v2_5 (~50% cost, slightly lower quality)
 *   --stability <n>   0.0–1.0 (default 0.5) — higher = more consistent, less expressive
 *   --similarity <n>  0.0–1.0 (default 0.75) — closeness to source voice
 *   --style <n>       0.0–1.0 (default 0.0) — style exaggeration (multilingual_v2 only)
 *   --rate-ms <n>     Min delay between requests in ms (default 350)
 *
 * COST ESTIMATE
 *
 *   Full run: ~1063 lines × ~25 chars avg ≈ 27k characters.
 *   At ElevenLabs Starter ($5/mo, 30k chars) you can do one full pass.
 *   At Creator ($22/mo, 100k chars) you have headroom for retakes.
 *   Per-character pricing applies for overage. Check elevenlabs.io/pricing.
 *
 *   You can do system-only first (~30 files) to evaluate the voice
 *   cheaply, then commit to the bulk run.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const CSV_PATH = path.join(REPO_ROOT, 'VOICE_RECORDING.csv');
const OUT_DIR = path.join(REPO_ROOT, 'app/www/audio/voice');

// ---------- .env loader (inline — no npm dep) ----------
//
// Reads .env at the repo root and populates process.env. Existing
// process.env values take priority (so you can still do
// `$env:ELEVENLABS_API_KEY=...` to override per-session).
//
// Supports:
//   KEY=value
//   KEY="quoted value with spaces"
//   # comment lines
//   blank lines
function loadDotEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

// ---------- CLI parsing ----------

const args = process.argv.slice(2);
function flag(name, hasValue = true) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  if (!hasValue) return true;
  return args[i + 1];
}

const opts = {
  voice: flag('voice') || process.env.ELEVENLABS_VOICE_ID,
  game: flag('game'),
  tier: flag('tier'),
  limit: flag('limit') ? parseInt(flag('limit'), 10) : Infinity,
  force: flag('force', false),
  dryRun: flag('dry-run', false),
  model: flag('model') || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
  stability: parseFloat(flag('stability') ?? '0.5'),
  similarity: parseFloat(flag('similarity') ?? '0.75'),
  style: parseFloat(flag('style') ?? '0.0'),
  rateMs: parseInt(flag('rate-ms') ?? '350', 10),
};

const apiKey = process.env.ELEVENLABS_API_KEY;

if (!opts.dryRun && !apiKey) {
  console.error('ERROR: ELEVENLABS_API_KEY is not set.');
  console.error('  Easiest: copy .env.example to .env at the repo root and');
  console.error('  paste your key. The script auto-loads .env.');
  console.error('');
  console.error('  Or set per-session:');
  console.error('    PowerShell:  $env:ELEVENLABS_API_KEY = "sk_..."');
  console.error('    cmd.exe:     set ELEVENLABS_API_KEY=sk_...');
  console.error('    bash/zsh:    export ELEVENLABS_API_KEY=sk_...');
  process.exit(1);
}
if (!opts.voice) {
  console.error('ERROR: voice ID is not set.');
  console.error('  Put ELEVENLABS_VOICE_ID in your .env file, or pass');
  console.error('  --voice <voice_id> on the command line.');
  console.error('  Find voice IDs in your ElevenLabs VoiceLab.');
  process.exit(1);
}

// ---------- Read checklist ----------

if (!existsSync(CSV_PATH)) {
  console.error(`ERROR: ${CSV_PATH} not found.`);
  console.error('Run: node app/scripts/build-voice-checklist.mjs first.');
  process.exit(1);
}

function parseCsv(text) {
  // Tiny CSV parser — handles quoted fields with "" escapes.
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const csvRows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
const header = csvRows[0];
const dataRows = csvRows.slice(1).filter((r) => r.length === header.length);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

let lines = dataRows.map((r) => ({
  game: r[idx.game],
  tier: r[idx.tier],
  slug: r[idx.slug],
  filename: r[idx.filename],
  text: r[idx.text],
  variants: parseInt(r[idx.variants] || '1', 10) || 1,
}));

if (opts.game) {
  const g = opts.game.toLowerCase();
  lines = lines.filter((l) => l.game.toLowerCase().includes(g));
}
if (opts.tier) {
  lines = lines.filter((l) => l.tier === opts.tier);
}

// De-dupe by slug (shared lines across games — we only write one file per slug).
const bySlug = new Map();
for (const l of lines) {
  if (!bySlug.has(l.slug)) bySlug.set(l.slug, l);
}
lines = [...bySlug.values()];

// Expand variants: one queue entry per (slug, variant-index).
//   variant 1 → slug.mp3
//   variant 2 → slug-2.mp3
//   variant 3 → slug-3.mp3 ...
const expanded = [];
for (const l of lines) {
  for (let n = 1; n <= l.variants; n++) {
    const suffix = n === 1 ? '' : `-${n}`;
    expanded.push({
      ...l,
      variantIndex: n,
      filename: `${l.slug}${suffix}.mp3`,
    });
  }
}

// Skip already-generated.
let queue = expanded;
if (!opts.force) {
  queue = queue.filter((l) => {
    const p = path.join(OUT_DIR, l.filename);
    return !existsSync(p) || statSync(p).size === 0;
  });
}

// Apply limit.
queue = queue.slice(0, opts.limit);

console.log(`Voice ID:      ${opts.voice}`);
console.log(`Model:         ${opts.model}`);
console.log(`Voice config:  stability=${opts.stability} similarity=${opts.similarity} style=${opts.style}`);
console.log(`Game filter:   ${opts.game || '(all)'}`);
console.log(`Tier filter:   ${opts.tier || '(all)'}`);
console.log(`Force:         ${opts.force ? 'yes' : 'no (skip existing)'}`);
console.log(`Rate gap:      ${opts.rateMs}ms`);
console.log(`Output dir:    ${OUT_DIR}`);
const variantCount = expanded.length - lines.length;
console.log(`Variants:      +${variantCount} extra files for high-repeat lines (state calls, lava events, closings)`);
console.log(`To generate:   ${queue.length} files (of ${expanded.length} total slugs after dedupe + variant expansion)`);
const totalChars = queue.reduce((n, l) => n + l.text.length, 0);
console.log(`Total chars:   ${totalChars}`);
console.log('');

if (opts.dryRun) {
  for (const l of queue.slice(0, 30)) {
    console.log(`  ${l.filename.padEnd(45)} ${JSON.stringify(l.text)}`);
  }
  if (queue.length > 30) console.log(`  ... +${queue.length - 30} more`);
  console.log('\n(dry run — no API calls made)');
  process.exit(0);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ---------- Generate ----------

const URL = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(opts.voice)}`;

async function genOne(line) {
  const body = {
    text: line.text,
    model_id: opts.model,
    voice_settings: {
      stability: opts.stability,
      similarity_boost: opts.similarity,
      style: opts.style,
      use_speaker_boost: true,
    },
  };
  const resp = await fetch(URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} — ${txt.slice(0, 200)}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 200) {
    throw new Error(`Suspiciously small response (${buf.length} bytes)`);
  }
  const out = path.join(OUT_DIR, line.filename);
  writeFileSync(out, buf);
  return buf.length;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const t0 = Date.now();
let ok = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < queue.length; i++) {
  const line = queue[i];
  const tag = `[${(i + 1).toString().padStart(4)}/${queue.length}]`;
  try {
    const bytes = await genOne(line);
    ok++;
    const kb = (bytes / 1024).toFixed(1);
    const vTag = line.variants > 1 ? ` (variant ${line.variantIndex}/${line.variants})` : '';
    console.log(`${tag} ✓ ${line.filename.padEnd(45)} ${kb}KB  "${line.text}"${vTag}`);
  } catch (e) {
    failed++;
    failures.push({ line, err: String(e.message || e) });
    console.error(`${tag} ✗ ${line.filename}: ${e.message || e}`);
    // Common case: rate limit. Back off.
    if (String(e).includes('429') || String(e).includes('quota')) {
      console.error('         backing off 10s...');
      await sleep(10000);
    }
  }
  if (i < queue.length - 1) await sleep(opts.rateMs);
}

const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
console.log(`Done in ${dt}s.  ${ok} ok, ${failed} failed.`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures.slice(0, 20)) {
    console.log(`  ${f.line.filename}: ${f.err}`);
  }
  if (failures.length > 20) console.log(`  ... +${failures.length - 20} more`);
  process.exit(1);
}
