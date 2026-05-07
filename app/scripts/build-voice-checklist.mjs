#!/usr/bin/env node
/* Build the voice-recording checklist.
 *
 * Walks every game's prompt pool + the framing strings inline in each
 * game module (Test buttons, closing lines, RLGL state calls, etc.)
 * and writes VOICE_RECORDING.md at the repo root.
 *
 * Run from the repo root:
 *   node app/scripts/build-voice-checklist.mjs
 *
 * Re-run any time you change content (add/remove animals, hero powers,
 * weather lines, etc.) to keep the checklist in sync.
 *
 * The slug logic must match `app/www/js/speech.js:slugify` exactly —
 * the runtime looks up `audio/voice/<slug>.mp3` for each spoken line.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const WWW = path.join(REPO_ROOT, 'app/www');

// ---------- Helpers ----------

/** Mirror of speech.js slugify. */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** The runtime collapses \n to spaces before speaking — match that. */
function flatten(text) {
  return String(text).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract `text: '...'` (and "...") literals from a JS source file. */
function extractTextLiterals(absPath) {
  const src = readFileSync(absPath, 'utf8');
  const re = /\btext:\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push(unescapeJs(m[2]));
  }
  return out;
}

function unescapeJs(s) {
  return s.replace(/\\(.)/g, (_, c) => {
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    return c; // \' \" \\ → ' " \
  });
}

const importData = (rel) =>
  import(pathToFileURL(path.join(WWW, rel)).href);

// ---------- Collect lines ----------

/** Each line: { game, tier, text, slug, note? } */
const LINES = [];
const seen = new Set();

function addLine(game, tier, rawText, note) {
  if (!rawText) return;
  const text = flatten(rawText);
  if (!text) return;
  const slug = slugify(text);
  if (!slug) return;
  const dedupeKey = `${game}::${slug}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  LINES.push({ game, tier, text, slug, note });
}

// ---- Hide & Seek: no speech, only chirps. Skip. ----

// ---- Red Light / Green Light ----
addLine('Red Light / Green Light', 'system', 'Green light!');
addLine('Red Light / Green Light', 'system', 'Yellow light!', 'only spoken when Yellow Light toggle is ON');
addLine('Red Light / Green Light', 'system', 'Red light!');
addLine('Red Light / Green Light', 'system', 'Time is up! Great job!', 'closing line');

// ---- Floor is Lava ----
addLine('Floor is Lava', 'system', 'Hop on one foot!', 'Test Voice button line');
addLine('Floor is Lava', 'system', 'Time is up! Great job!', 'closing line (shared filename with Red Light)');
const lavaText = extractTextLiterals(path.join(WWW, 'js/games/floorLava.js'));
for (const t of lavaText) addLine('Floor is Lava', 'content', t);

// ---- Heroes & Villains ----
addLine('Heroes & Villains', 'system', 'Mwa ha ha! Great evil-doing!', 'closing line — Villain role');
addLine('Heroes & Villains', 'system', 'Great work, hero or villain!', 'closing line — Both role');
addLine('Heroes & Villains', 'system', 'You saved the day! Great job hero!', 'closing line — Hero role');
const heroText = extractTextLiterals(path.join(WWW, 'js/games/superHero.js'));
for (const t of heroText) addLine('Heroes & Villains', 'content', t);

// ---- Simon Says ----
addLine('Simon Says', 'system', 'Simon says touch your nose', 'Test Voice button line');
addLine('Simon Says', 'system', 'Time is up! Great listening!', 'closing line');
const { SIMON_COMMANDS } = await importData('js/games/simonSays.js');
// Simon plays each command in BOTH forms: "Simon says X" and just "X"
for (const cmd of SIMON_COMMANDS) {
  addLine('Simon Says', 'content', `Simon says ${cmd}`, '"Simon says" form');
  addLine('Simon Says', 'content', cmd, '"trick" form (no "Simon says" prefix)');
}

// ---- Animal Antics (Charades) ----
addLine('Animal Antics', 'system', 'Act like a kangaroo', 'Test Voice button line');
const animals = (await importData('js/games/animalsData.js')).ANIMALS;
for (const a of animals) {
  addLine('Animal Antics', 'content', `Act like a ${a.name}`);
}

// ---- What is it? (Emoji Quiz) ----
// Note: code does `It's a ${name}` — not "It's an", even for vowel names.
addLine('What is it?', 'system', "It's an apple", 'Test Voice button line — uses "an"');
const items = (await importData('js/games/whatIsItData.js')).ITEMS;
for (const it of items) {
  addLine('What is it?', 'content', `It's a ${it.name}`);
}

// ---- Mission Control ----
addLine('Mission Control', 'system', 'Mission Control: all systems go!', 'Test Voice button line');
addLine('Mission Control', 'system', 'Mission accomplished! Great flying!', 'closing line');
const missionText = extractTextLiterals(path.join(WWW, 'js/games/missionControl.js'));
for (const t of missionText) addLine('Mission Control', 'content', t);

// ---- Weather Report ----
addLine('Weather Report', 'system', "It's pouring rain!", 'Test Voice button line — overlaps with weather pool');
addLine('Weather Report', 'system', "That's all for today's weather!", 'closing line');
const { WEATHER, REACTIONS } = await importData('js/games/weatherData.js');
for (const w of WEATHER) addLine('Weather Report', 'content', w.text);
for (const cat of Object.keys(REACTIONS)) {
  for (const r of REACTIONS[cat]) addLine('Weather Report', 'content', r.text);
}

// ---------- De-dupe across games ----------
// Some lines appear in multiple games (e.g. "Time is up! Great job!" is
// shared by RLGL and Floor Lava). The same MP3 file plays in both. Mark
// the shared ones so the user doesn't record twice.

const slugCount = {};
for (const l of LINES) slugCount[l.slug] = (slugCount[l.slug] || 0) + 1;

// ---------- Render markdown ----------

const GAME_ORDER = [
  'Hide & Seek',
  'Red Light / Green Light',
  'Floor is Lava',
  'Heroes & Villains',
  'Simon Says',
  'Animal Antics',
  'What is it?',
  'Mission Control',
  'Weather Report',
];

function gameLines(game, tier) {
  return LINES.filter((l) => l.game === game && l.tier === tier);
}

function renderGroup(label, lines) {
  if (lines.length === 0) return '';
  const out = [];
  out.push(`### ${label} (${lines.length})`);
  out.push('');
  // Sort short → long so quick wins come first.
  const sorted = [...lines].sort((a, b) => a.text.length - b.text.length);
  for (const l of sorted) {
    const shared = slugCount[l.slug] > 1 ? ' _(shared)_' : '';
    const note = l.note ? ` — _${l.note}_` : '';
    out.push(`- [ ] \`${l.slug}.mp3\` — "${l.text}"${shared}${note}`);
  }
  out.push('');
  return out.join('\n');
}

const totalLines = LINES.length;
const uniqueSlugs = new Set(LINES.map((l) => l.slug)).size;
const today = new Date().toISOString().slice(0, 10);

const md = [];
md.push('# KidWrangler — voice recording checklist');
md.push('');
md.push(`_Generated ${today} · ${totalLines} lines · ${uniqueSlugs} unique MP3 files_`);
md.push('');
md.push('## How to record');
md.push('');
md.push('1. For each line below, record an MP3 with the **exact filename shown**.');
md.push('2. Drop the file into `app/www/audio/voice/`.');
md.push('3. The runtime auto-detects it — no code changes. The TTS fallback');
md.push('   plays for any line without an MP3 yet, so you can ship partials.');
md.push('');
md.push('### Recording tips');
md.push('');
md.push('- **Format:** MP3, mono, 44.1kHz, ~96-128kbps. Bigger is wasted.');
md.push('- **Tone:** chirpy / playful for prompts; firm for "Red light!"; warm for closing lines.');
md.push('- **Silence:** trim leading silence aggressively. The runtime adds its own gap.');
md.push('- **Levels:** record peaking around -6dB. The compressor brings it up.');
md.push('- **Lines marked _(shared)_** appear in more than one game — record once.');
md.push('');
md.push('### Tier strategy');
md.push('');
md.push('- **System** lines (per-game subsection top) are the highest-impact: every');
md.push('  game start/end + Test Voice button. Knock these out first — ~25 files.');
md.push('- **Content** lines are the bulk prompts. Tackle game-by-game; partial');
md.push('  recordings are fine because TTS fills in the gaps.');
md.push('');
md.push('---');
md.push('');

// Per-game sections
for (const game of GAME_ORDER) {
  if (game === 'Hide & Seek') {
    md.push(`## ${game}`);
    md.push('');
    md.push('_No voice lines — game uses procedural chirps only._');
    md.push('');
    continue;
  }
  const sys = gameLines(game, 'system');
  const content = gameLines(game, 'content');
  const total = sys.length + content.length;
  md.push(`## ${game} (${total})`);
  md.push('');
  md.push(renderGroup('System / framing', sys));
  if (content.length) md.push(renderGroup('Content / prompts', content));
}

// ---------- Write output ----------

const OUT = path.join(REPO_ROOT, 'VOICE_RECORDING.md');
writeFileSync(OUT, md.join('\n'), 'utf8');

// Also a CSV companion for spreadsheet workflows.
const csvRows = [['game', 'tier', 'slug', 'filename', 'text', 'shared', 'note']];
for (const l of LINES) {
  csvRows.push([
    l.game,
    l.tier,
    l.slug,
    `${l.slug}.mp3`,
    l.text.replace(/"/g, '""'),
    slugCount[l.slug] > 1 ? 'yes' : '',
    l.note || '',
  ]);
}
const csvText = csvRows
  .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
  .join('\n');
const CSV_OUT = path.join(REPO_ROOT, 'VOICE_RECORDING.csv');
writeFileSync(CSV_OUT, csvText, 'utf8');

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${CSV_OUT}`);
console.log(`Total lines: ${totalLines}`);
console.log(`Unique slugs: ${uniqueSlugs}`);
const perGame = {};
for (const l of LINES) perGame[l.game] = (perGame[l.game] || 0) + 1;
console.log('Per game:');
for (const [g, n] of Object.entries(perGame)) console.log(`  ${g}: ${n}`);
