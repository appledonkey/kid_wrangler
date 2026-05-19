# KidWrangler — project context

KidWrangler is a Capacitor mobile app — voice-driven, screen-free games for
kids ages ~3–10, run by the parent's phone. Web payload is vanilla JS modular
(no bundler), wrapped by Capacitor 7 for iOS/Android, also deployed as a PWA
on Vercel.

**Repo:** https://github.com/appledonkey/kid_wrangler.git
**Vercel:** kid-wrangler.vercel.app (auto-deploys on push to `main`)
**Working dir:** `C:\Users\james\Documents\_coding\_parappa\`
**App lives in:** `app/`
**User is on:** Windows 11 (so iOS native builds will need a Mac/cloud Mac)

---

## Current games (9 tiles)

Tile labels (canonical, as they appear in the picker):

### Free at v1 launch (5)
- **Hide & Seek** (`findMe`) — phone hides, plays escalating chirps until found
- **Red Light / Green Light** (`rlgl`) — calls Green/Red Light at random intervals; optional Yellow Light slow-mo phase
- **Floor is Lava** (`action`) — 100+ action prompts (hop, spin, find something soft) with surprise lava events
- **What is it?** (`whatis`) — 283 emojis across 7 categories (Animals, Food, Objects, Vehicles, Nature, Sports, plus All); every emoji unique
- **Weather Report** (`weather`) — phone is the weatherman, calls weather + chains a matching action ("Pouring!" → "Jump in muddy puddles!"). 55 weather entries × 50 reactions across 6 categories (rain/cold/hot/wind/fog/special), each with its own bg theme.

### Paid tier (4) — gated behind $4.99 IAP, **stub only at v1** (everything unlocked, see featureFlags.js)
- **Heroes & Villains** (`hero`) — 260 hero/villain pretend-play prompts
- **Simon Says** (`simon`) — 60 body-target commands with trickiness levels
- **Animal Antics** (`charades`) — 77 animals across 7 habitats, three reveal modes
- **Mission Control** (`mission`) — phase-based mission narrative (preflight → countdown → liftoff → space → land → loop) with random emergencies

---

## Repo layout

```
_parappa/
├── CLAUDE.md            ← THIS FILE
├── BUILD_SPEC.md        ← original spec from user
├── GAMES.md             ← game-by-game design notes
├── PRIVACY.md           ← privacy policy source
├── STORE_LISTING.md     ← App Store + Play Store copy
├── prototype.html       ← original working single-file prototype
└── app/
    ├── package.json
    ├── capacitor.config.json
    ├── ios/             ← Capacitor iOS shell (build needs Mac)
    ├── android/         ← Capacitor Android shell (builds on any OS)
    └── www/             ← the actual deployable web payload
        ├── index.html
        ├── privacy.html ← Vercel serves this at /privacy.html
        ├── manifest.json
        ├── service-worker.js
        ├── styles/
        │   ├── main.css     ← design system, layout
        │   └── games.css    ← per-game body backgrounds, animations
        ├── icons/           ← generated PWA icons (webp)
        ├── icons-source/    ← 1024×1024 KW logo source
        ├── audio/voice/     ← drop MP3s here for voice override (slug-named)
        └── js/
            ├── app.js          ← bootstrap, game picker, SW registration
            ├── audio.js        ← Web Audio graph + procedural SFX
            ├── speech.js       ← TTS + recorded-voice override + duration estimate
            ├── wakeLock.js     ← screen wake lock + visibility re-acquire
            ├── ui.js           ← screens, opt pickers, shuffle queue, toggles
            ├── storage.js      ← @capacitor/preferences w/ localStorage fallback
            ├── native.js       ← haptics, splash, status bar (Capacitor plugins)
            ├── featureFlags.js ← paywall stub (V1_FORCE_UNLOCKED=true)
            └── games/
                ├── findMe.js, redLight.js, floorLava.js,
                ├── superHero.js, simonSays.js, animalCharades.js,
                ├── whatIsIt.js, missionControl.js, weatherReport.js,
                ├── animalsData.js     ← shared animal pool (77 entries, every emoji unique)
                ├── animalSounds.js    ← procedural animal sound synthesis (Charades sound-hint toggle)
                ├── weatherData.js     ← weather + reaction pools by category
                └── whatIsItData.js    ← emoji quiz pool (~280 entries across 6 categories)
```

---

## Dev commands

All run from `app/`:

```sh
npm run dev           # static server at http://localhost:5180  (or 5173)
npx cap sync          # copy www/ into ios/ and android/ shells
npm run icons         # regenerate all icon sizes from icons-source/icon.png
                      # NOTE: dumps PWA webp into app/icons/ (wrong path) —
                      # post-process moves them to app/www/icons/
npx cap open android  # opens Android Studio
npx cap open ios      # opens Xcode (Mac only)
```

After every meaningful www/ change: `npx cap sync` then commit + push.

---

## Service worker / cache busting

`service-worker.js` is **cache-first** in production (Vercel) and **self-destructs** on `localhost` so dev iteration always sees fresh code. The cache name is hardcoded — every release that should bust user caches must bump it:

```js
const CACHE_NAME = 'kidwrangler-vN';   // currently v15
```

After bumping, the next visit to the production URL re-fetches everything and the old cache is dropped on activate.

---

## Conventions / decisions already made

These are settled — don't relitigate unless asked:

### Stack
- **Vanilla JS, ES modules** — no React/Vue/Svelte/bundler. The prototype proved this is enough.
- **Capacitor 7** — iOS + Android via the same www/ payload
- Plugins installed: `@capacitor/{app,haptics,preferences,splash-screen,status-bar}`, `@capacitor-community/keep-awake`

### UI
- **Palette**: coral `#FF7B6B`, navy `#2B3D5C`, butter `#FFD56B`, teal `#6BC9C0`, cream `#FFF4E0`
- **Fonts**: Fredoka (700) for body/buttons, Caveat for accent script — currently from Google Fonts CDN, **not bundled locally yet**
- **Style**: chunky 3px navy borders, hard offset shadows (no soft drops), no gradients on buttons
- **Game tiles**: icon + title only (no subtitles). Coral fill on selected with bouncy pop animation + lifted shadow + icon scale 1.1
- **Setting clusters**: invisible structural wrappers (no grey backgrounds — user removed)
- **Option buttons**: flex with `flex: 1 1 80px` so each row fills width evenly. 8-button rows wrap to 4+4
- **Subtexts**: removed app-wide except for 3 cases where they add real info (Find Me Difficulty, Simon Trickiness, Charades Reveal)
- **Counts inline on buttons**: Pool buttons (Charades, Emoji Quiz) and Role buttons (Hero) include the count in parens, e.g. `Farm (12)`, `Hero (130)`
- **Universal CTA**: every settings panel's primary button reads "Start Game" with `class="big-btn start"` (28px top margin to prevent accidental taps)

### Terminology (canonical labels)
- **Pace** controls in all games are labeled **Speed** with options **Slow / Normal / Fast / CHAOS**
- **Total time** controls labeled **Duration**, options **1 min / 2 min / 5 min / Endless**
- Toggle labels are 1–2 words: **Narrator**, **SFX**, **Auto-advance**, **Yellow light (slow-mo)**
- Game tile titles are the canonical labels listed in the "Current games" section above (Hide & Seek, Red Light / Green Light, Floor is Lava, Heroes & Villains, Simon Says, Animal Antics, What is it?, Mission Control, Weather Report)
- Paid games' canonical key in `app.js` PANEL_BY_GAME stays stable even when the tile label changes (e.g. tile "Heroes & Villains" → key `hero`, tile "Animal Antics" → key `charades`)

### Audio behavior
- **Speech-aware pacing** — `fire()` in every action game schedules the next command at `speechDurationMs(text) + paceGap`. No more commands cutting each other off.
- `speechDurationMs` over-estimates: 460ms/word, 700ms minimum. Gives kids a real beat between commands.
- All Test/Start buttons call `unlockSpeech()` — fires a silent priming utterance to wake iOS speechSynthesis
- Speech keepalive (`startSpeechKeepalive`) calls `resume()` every 4s during games — fixes iOS Safari's 15s-idle bug
- 50ms gap between `speechSynthesis.cancel()` and the next `speak()` — fixes iOS race condition
- Silent `<audio>` loop keeps the mobile audio context warm
- **AVAudioSession.playback** category set in `ios/App/App/AppDelegate.swift` so iPhone silent switch doesn't mute voice. Untested (needs Mac to verify).

### Voice override (pluggable real recordings)
- `speak('Green light!')` first tries `audio/voice/green-light.mp3` (slugified). If present, plays it. If not, falls back to TTS.
- Drop MP3s into `www/audio/voice/<slug>.mp3` to upgrade specific lines without code changes.
- Slug rules: lowercase, alphanumeric + spaces → hyphens, strip everything else.

### Paywall stub
- `featureFlags.js` has `V1_FORCE_UNLOCKED = true` — every paid game's `isLocked()` returns false
- Lock UI (`.lock-badge` on tiles, lock check in each paid game's Start handler) is wired but invisible at v1
- v1.1 plan: flip `V1_FORCE_UNLOCKED = false`, replace `attemptPurchase()` body with RevenueCat call. No other code changes needed.
- Paid games: `hero`, `simon`, `charades`, `mission`. Free: everything else.

### RLGL Yellow Light
- Optional toggle. When ON, ~35% of greens transition to a yellow phase (1.5–2.5s) before the red.
- **Red ALWAYS follows yellow** — yellow is a "slow motion" beat before the freeze, never a third state.

### Mission Control phase machine
- 8 ordered phases: preflight → countdown → liftoff → atmosphere → space → mission → re-entry → landing → loop.
- Countdown phase is sequenced (10-9-8-...-BLAST OFF) on its own 800ms tick, regardless of pace.
- ~18% of missions trigger one emergency mid-flight (fuel/meteor/glitch/UFO). Max one per mission.

### Hero Poses
- Three roles: Hero (130 powers), Villain (130 moves), Both (260). Default Hero.
- Cartoon-villain energy only — no real weapons. Freeze ray, electric whip, confetti bomb, etc.
- Trademark scrub done — Hulk → "hulking", Spider-Man → "swing on a web", Captain America → "hero shield", etc.

---

## Pending / explicitly punted TODOs

### Backburnered by user
- **Pause button** — needs each timed game's `fire()` loop refactored to be cleanly pause/resumable. The `_ended`/`_starting` lifecycle flags added on 2026-05-07 make this less invasive than before, but the `fire()` chain itself still needs rework.
- **Hardware Android back button** — currently exits the app from any screen. Needs Capacitor `App.backButton` listener that bails to `setup` instead of exiting mid-game.
- **Mid-game settings change** — settings panels live only on `setupScreen`; changing speed/duration mid-play requires Stop → Again → re-pick. Acceptable for v1 but worth noting.

> Sound Quiz and Dance Party were removed entirely on 2026-05-07. The
> placeholder tiles + scaffolding are gone (along with `danceParty.js`,
> `guessSound.js`, and the `playKick`/`playSnare`/`playHat` drum
> machine in `audio.js`). `animalSounds.js` stays — Charades' optional
> sound-hint toggle still uses it.

### Game-loop lifecycle (added 2026-05-07)

Every timed game owns the same lifecycle now. New contributors should
follow this template — drift across games is exactly how the bugs
fixed in commits 9c9d024 / 8f0a9ee / c26826f got there in the first
place:

- **`_ended` flag** — set true at top of `endGame()`, returns early
  if already true (Stop near time-expiry no longer cuts off the
  closing line). Reset to false in the Start handler and in the
  Cancel/Again handlers.
- **`_starting` flag** — set true at top of the Start handler,
  bails if already true (Start spam-tap can no longer stack
  countdownTimers / endTimeouts / jingles). Cleared at the end
  of `endGame()` and in the Cancel/Again handlers. For paid games,
  also clear it before bailing on a lock check.
- **`endGame()` calls `clearAll()`** — never re-implement timer
  clearing inline in endGame. clearAll() is the single source of
  truth and includes the countdown timer, which is essential for
  Stop-during-countdown to work.
- **Cancel button** — every countdown screen has one, wired to
  clear timers, release wakeLock, stop speech keepalive, reset
  bg classes, reset both lifecycle flags, and `show('setup')`.
- **`cancelSpeech()` on Again handler** — closing speech and
  jingle from the prior game must not bleed into setup.
- **`makeQueue` contract** — call `getPool()` once per shuffle
  cycle (initial + after exhaustion + after `.reset()`); callers
  call `.reset()` explicitly when their pool semantics change.
  The earlier "auto-detect pool reference change" was a bug
  magnet because callers using spread-built pools triggered a
  reshuffle on every `next()`.

### Pre-launch must-haves (user's responsibility)
- Apple Developer account ($99/yr) and Google Play Console ($25 one-time)
- Mac access for iOS builds (Capacitor iOS scaffolds on Windows but Xcode build is Mac-only)
- Final commitment on the app name (still "KidWrangler" placeholder; bundle id `com.kidwrangler.app`)
- App Store screenshots (shot list in STORE_LISTING.md)
- Privacy policy URL — Vercel `kid-wrangler.vercel.app/privacy.html` already serves a styled rendering of PRIVACY.md
- AVAudioSession verification on a real iPhone (code is wired, not yet confirmed working)

### Quality-of-life / future
- Bundle Google Fonts locally so cold-install offline works (currently caches on first online load via SW)
- TypeScript migration (low priority)
- Real-device test pass — user has Vercel URL, no confirmation yet whether it's been done end-to-end on a phone

---

## Working style with this user

- **Decisive, terse responses preferred.** Don't ask permission for routine choices — make sensible defaults and move. The user will say "you decide" or "do what's best" if asked too many questions.
- **Educate when terminology is foreign.** Examples that came up: bundle ID, privacy policy URL, persistence, Apple Developer account. Define in 1–2 sentences if the user seems unfamiliar.
- **Honor explicit gates** the user wrote into project docs (e.g. PROMPT.md's "don't start coding until I approve the plan" — that's intentional, not a routine confirmation).
- **Push code, then summarize.** User doesn't want long planning preambles when they've already approved a direction. Implement, run sync, commit + push to GitHub, then a tight summary.
- **Verify, don't assert.** Run syntax checks (`node --check`) and dump-counts after content changes ("Hero: 130, Villain: 130"). User trusts visible verification more than claims.
- **Service worker cache-busting** is on me to remember. Bump `CACHE_NAME` whenever a code change should reach existing users on Vercel.

---

## Most recent session ended at commit `a53ece2` (push pending)

Recent work, newest first:

- **a53ece2** — perf/infra: SW precache 5 missing modules, drop reverb buffer (~880KB main-thread allocation), fix native.js dangling `handle` for app-state listener
- **c26826f** — Cancel button on all 7 countdown screens (closes the worst dead-end in the UX flow)
- **8f0a9ee** — Find Me watchdog double-chirp + Found-during-hide leak + Floor Lava lava-siren-on-Stop (added `silenceAll()` to audio.js)
- **9c9d024** — fix `makeQueue` reshuffle bug + endGame idempotency + Stop-during-countdown + Start spam-tap guard + cancel speech on Again (touched ui.js + 8 game modules)
- **3a0ed8f** — Weather Report game added + tile rename refresh
- **acdf47b** — remove Dance Party + Sound Quiz entirely (911 lines deleted)
- **e494ba7** — emoji quiz dedup + add Sports category, drop walrus=tooth and 17 other duplicate-emoji animals
- **2a5f82e** — toggle row whole-clickable + SW cache v9 (fix yellow toggle not responding)
- **313b2b9** — yellow-bg gradient (was missed in 5ffae4e)
- **5ffae4e** — Yellow Light option, 3 subtexts back, button counts, more buffer between commands
- **ef6076f** — bouncy game-tile selection animation
- **b29eb0f** — drop grey setting-group bgs, fill rows w/ flex:1, remove subtext blurbs
- **3b246e8** — remove all 10 game tile subtitles
- **2f6c497** — UI refactor finished (Dance Party panel)
- **2cabff7** — UI refactor extended to Guess Sound coming-soon panel
- **7743ef8** — finished What Is It panel (was missed)
- **5af6e6a** — big UI refactor: setting clusters, terminology, universal "Start Game" CTA
- **a6542ef** — Find Me difficulty text concretized
- **3556aed** — speech-aware pacing (no command overlap)
- **9efa7f9** — menu polish + Mission Control phase machine
- **505821c** — unified Pace as Slow/Normal/Fast/CHAOS across all games
- **9296844** — homogenize Pace + Game Length labels
- **91712ec** — privacy.html, haptics, AVAudioSession Swift override
- **4215d6c** — v1 paywall stub (featureFlags.js)
- **d2f0e96** — Mission Control game added
- **1de9fee** — real KW logo icon
- **ff9d3dd** — initial commit (Capacitor app + 7 games + spec docs)
