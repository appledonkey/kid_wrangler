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

/** Each line: { game, tier, text, slug, variants, note? } */
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
  LINES.push({ game, tier, text, slug, variants: 1, note });
}

// ---- Variant assignment ----
//
// Most lines play exactly once per session (closing speech), or are
// distributed across the prompt-pool shuffle (each hero power said 1-2
// times in a session). The pool shuffle already provides variety.
//
// Variants matter for lines that REPEAT WITHIN A SINGLE SESSION:
//
//   - Red Light state calls fire 15-40× in a 2-min game
//   - Floor Lava events fire 2-8× per session as surprise interrupts
//   - Closing lines repeat across sessions (kids play games on repeat)
//
// Anything else gets 1 take.

const HIGH_REPEAT_SLUGS = new Set([
  'green-light', 'yellow-light', 'red-light',
]);

const CLOSING_LINE_SLUGS = new Set([
  'time-is-up-great-job',
  'time-is-up-great-listening',
  'mwa-ha-ha-great-evildoing',
  'great-work-hero-or-villain',
  'you-saved-the-day-great-job-hero',
  'mission-accomplished-great-flying',
  'thats-all-for-todays-weather',
]);

// Lava-event slugs pulled live from floorLava.js so this list stays in
// sync if the lava text ever changes.
const lavaActions = (await importData('js/games/floorLava.js')).LAVA_ACTIONS;
const LAVA_SLUGS = new Set(lavaActions.map((a) => slugify(flatten(a.text))));

function assignVariants() {
  for (const l of LINES) {
    if (HIGH_REPEAT_SLUGS.has(l.slug)) l.variants = 3;
    else if (LAVA_SLUGS.has(l.slug)) l.variants = 3;
    else if (CLOSING_LINE_SLUGS.has(l.slug)) l.variants = 2;
  }
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
// Mirror animalCharades.js::actLikePhrase exactly so slugs match the runtime.
function actLikePhrase(animal) {
  const article = animal.article || 'a';
  return `Act like ${article} ${animal.name}`;
}
addLine('Animal Antics', 'system', 'Act like a kangaroo', 'Test Voice button line');
const animals = (await importData('js/games/animalsData.js')).ANIMALS;
for (const a of animals) {
  addLine('Animal Antics', 'content', actLikePhrase(a));
}

// ---- What is it? (Emoji Quiz) ----
// Mirror whatIsIt.js::revealPhrase exactly so slugs match the runtime.
function revealPhrase(item) {
  if (item.plural) return `They're ${item.name}`;
  if (item.countable === false) return `It's ${item.name}`;
  return `It's ${item.article || 'a'} ${item.name}`;
}
addLine('What is it?', 'system', "It's an apple", 'Test Voice button line');
const items = (await importData('js/games/whatIsItData.js')).ITEMS;
for (const it of items) {
  addLine('What is it?', 'content', revealPhrase(it));
}

// ---- Mission Control ----
addLine('Mission Control', 'system', 'Mission Control: all systems go!', 'Test Voice button line');
addLine('Mission Control', 'system', 'Mission accomplished! Great flying!', 'closing line');
const missionText = extractTextLiterals(path.join(WWW, 'js/games/missionControl.js'));
for (const t of missionText) addLine('Mission Control', 'content', t);

// ---- Weather Report ----
addLine('Weather Report', 'system', "It's pouring rain!", 'Test Voice button line — overlaps with weather pool');
addLine('Weather Report', 'system', "That's all for today's weather!", 'closing line');
const { WEATHER } = await importData('js/games/weatherData.js');
for (const w of WEATHER) addLine('Weather Report', 'content', w.text);

assignVariants();

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
  const fileCount = lines.reduce((n, l) => n + l.variants, 0);
  const suffix = fileCount === lines.length ? '' : ` · ${fileCount} files w/ variants`;
  out.push(`### ${label} (${lines.length}${suffix})`);
  out.push('');
  // Sort short → long so quick wins come first.
  const sorted = [...lines].sort((a, b) => a.text.length - b.text.length);
  for (const l of sorted) {
    const shared = slugCount[l.slug] > 1 ? ' _(shared)_' : '';
    const note = l.note ? ` — _${l.note}_` : '';
    if (l.variants > 1) {
      // List each variant filename so the recording-style user can tick
      // them off individually.
      out.push(`- **${l.text}** · ${l.variants} variants${shared}${note}`);
      for (let n = 1; n <= l.variants; n++) {
        const suf = n === 1 ? '' : `-${n}`;
        out.push(`  - [ ] \`${l.slug}${suf}.mp3\``);
      }
    } else {
      out.push(`- [ ] \`${l.slug}.mp3\` — "${l.text}"${shared}${note}`);
    }
  }
  out.push('');
  return out.join('\n');
}

const totalLines = LINES.length;
const uniqueSlugs = new Set(LINES.map((l) => l.slug)).size;
const totalFiles = LINES.reduce((n, l) => {
  // Only count the slug once across games; multiplied by its variant count.
  return n;
}, 0);
const filesBySlug = new Map();
for (const l of LINES) {
  if (!filesBySlug.has(l.slug)) filesBySlug.set(l.slug, l.variants);
}
const totalUniqueFiles = [...filesBySlug.values()].reduce((a, b) => a + b, 0);
const totalChars = LINES.reduce((n, l) => n + l.text.length * l.variants, 0);
const today = new Date().toISOString().slice(0, 10);

const md = [];
md.push('# KidWrangler — voice recording checklist');
md.push('');
md.push(`_Generated ${today} · ${totalLines} lines · ${totalUniqueFiles} unique MP3 files (${totalChars} chars total)_`);
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
md.push('- **Lines with variants** ship as `<slug>.mp3`, `<slug>-2.mp3`, etc.');
md.push('  The runtime picks one randomly per play — avoids "Red light!" sounding');
md.push('  identical 30× in a session. Variants are reserved for high-repeat lines.');
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
const csvRows = [['game', 'tier', 'slug', 'filename', 'text', 'variants', 'shared', 'note']];
for (const l of LINES) {
  csvRows.push([
    l.game,
    l.tier,
    l.slug,
    `${l.slug}.mp3`,
    l.text.replace(/"/g, '""'),
    String(l.variants),
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
console.log(`Total MP3 files (counting variants): ${totalUniqueFiles}`);
console.log(`Total characters (counting variants): ${totalChars}`);
const perGame = {};
const filesPerGame = {};
for (const l of LINES) {
  perGame[l.game] = (perGame[l.game] || 0) + 1;
  filesPerGame[l.game] = (filesPerGame[l.game] || 0) + l.variants;
}
console.log('Per game (lines / files):');
for (const g of Object.keys(perGame)) {
  console.log(`  ${g}: ${perGame[g]} / ${filesPerGame[g]}`);
}
const withVariants = LINES.filter((l) => l.variants > 1);
console.log(`Variant lines: ${withVariants.length}`);
for (const l of withVariants) {
  console.log(`  ${l.slug} × ${l.variants}  "${l.text}"`);
}
