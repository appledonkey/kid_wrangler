# KidWrangler — Build Spec for Claude Code

## What you're building

KidWrangler is a mobile app that turns a parent's phone into a hub of voice-driven, screen-free kids' games. The phone is the **game director**, not the toy. Kids ages roughly 3–10 listen, run around, act things out, and dance. The parent or older kid taps the phone when prompted.

Target market: parents, grandparents, daycare workers, party hosts, pediatric waiting rooms.
**This is a parent utility, NOT a kids' app** — important for App Store category, COPPA compliance (none needed), and monetization.

## Stack — IMPORTANT

Wrap as a **Capacitor app** for both iOS and Android. The HTML/JS/CSS prototype is already working — your job is to:

1. Set up a clean Capacitor project structure
2. Refactor the prototype into modular files (split out per-game logic, shared audio system, shared UI components)
3. Add PWA support (manifest, service worker for offline)
4. Add Capacitor plugins where they improve on the web APIs (see "Native enhancements" below)
5. Make it production-ready for App Store and Google Play submission

Do NOT rewrite this in React, Vue, or any framework. Vanilla JS works fine and the prototype already proves it. Don't add a framework unless you have a specific reason and flag it for review.

## Files in this handoff

- `prototype.html` — the complete working prototype (single file). All 8 games, audio system, voice synthesis, settings, everything. **This is the source of truth for behavior.** When in doubt about how something should work, run the prototype and see.
- `BUILD_SPEC.md` — this file
- `GAMES.md` — detailed spec of each of the 8 games

## Project structure to create

```
kidwrangler/
├── www/                          # Capacitor's web root
│   ├── index.html                # Setup screen, game picker, all screen containers
│   ├── manifest.json             # PWA manifest
│   ├── service-worker.js         # Offline cache
│   ├── icons/                    # 192, 512, apple-touch, favicon
│   ├── styles/
│   │   ├── main.css              # Shared design system, layout
│   │   └── games.css             # Game-specific styles
│   └── js/
│       ├── app.js                # Bootstrap, screen routing, game picker
│       ├── audio.js              # Shared audio context, compressor, reverb, master gain
│       ├── speech.js             # iOS-hardened speech synthesis with keepalive
│       ├── wakeLock.js           # Screen wake lock helpers
│       ├── ui.js                 # setupOpts(), toggle helpers, screen show()
│       └── games/
│           ├── findMe.js         # Hide & seek with escalating sounds
│           ├── redLight.js       # Red Light Green Light
│           ├── floorLava.js      # Action prompts + lava events
│           ├── superHero.js      # Hero powers pretend play
│           ├── simonSays.js      # Simon Says
│           ├── danceParty.js     # Dance moves with synthesized beat
│           ├── animalCharades.js # Animal acting game
│           └── guessSound.js     # Guess the animal sound
├── ios/                          # Capacitor iOS shell (generated)
├── android/                      # Capacitor Android shell (generated)
├── capacitor.config.json
├── package.json
└── README.md                     # Setup, dev workflow, store submission steps
```

## Native enhancements via Capacitor plugins

Add these plugins where they materially improve on the web version:

- **@capacitor/keep-awake** — more reliable than Web Wake Lock API, especially on iOS where Low Power Mode kills web wake lock
- **@capacitor/haptics** — light haptic feedback when tapping "Found Me!", "Got it! Next", "Reveal Answer", etc. Subtle, not on every tap.
- **@capacitor/status-bar** — match status bar color to active game's theme (red for Red Light, comic blue for Super Hero, etc.)
- **@capacitor/splash-screen** — proper splash on launch
- **@capacitor/preferences** — persist user's last-used settings across app launches (volume boost, voice on/off, last game played)
- **@capacitor/app** — handle backgrounding gracefully — when the app goes to background mid-game, pause timers; resume on foreground

Skip these unless asked: push notifications, in-app purchase (handle that later), camera, geolocation.

## Critical technical gotchas — don't lose these

The prototype solved several thorny mobile audio bugs. Preserve all of these:

1. **iOS Safari `speechSynthesis` dies after ~15 sec idle.** Keepalive: call `speechSynthesis.resume()` on a 4-second interval during games. See `speech.js` logic in prototype.
2. **iOS speech requires "unlock" via user gesture.** First-time user tap (Test button or Start button) fires a silent priming utterance. Without this, later speech calls fail silently.
3. **iPhone silent switch silences `speechSynthesis` but not Web Audio.** Always play a sound effect alongside any voice prompt as a backup. Show warning UI on screens that use voice. With Capacitor, look into `AVAudioSession` category to override silent switch — this would be a major UX win.
4. **Audio session keepalive.** Silent looping `<audio>` element at near-zero volume keeps mobile audio context from being suspended when phone is screen-off or pocketed.
5. **Cancel-then-speak race condition on iOS.** Need ~50ms gap between `speechSynthesis.cancel()` and `speak()`.
6. **Volume compression.** `DynamicsCompressorNode` with three presets:
   - Normal: threshold -12dB, ratio 4:1
   - Loud: threshold -22dB, ratio 8:1
   - MAX: threshold -32dB, ratio 16:1 (heavy limiting + 2.4x master gain)
7. **No-repeat shuffle.** For all games with prompt lists, use a shuffled queue that exhausts before reshuffling. NOT "random with last-pick check."
8. **Wake lock visibility re-acquire.** When tab becomes visible again, re-request wake lock if a game is active.

## Design system — keep this

- **Font:** Fredoka (display, body), Caveat (accent script). Already linked from Google Fonts in prototype.
- **Colors:** coral `#FF7B6B`, deep coral `#E85A48`, teal `#6BC9C0`, deep teal `#3FA89F`, butter `#FFD56B`, cream `#FFF4E0`, navy `#2B3D5C`, pink `#FFB5A7`. Per-game backgrounds: green/red gradients (RLGL), shimmering red (lava), comic-blue (hero).
- **Aesthetic:** chunky 2.5–4px navy borders, offset hard shadows (3–6px), no soft drop shadows. Sticker-book / playful but not childish — it's a parent tool.
- **Buttons:** big, tap-friendly. `.big-btn` for primary actions (start/found), `.opt` for setting pickers, `.toggle` for booleans, `.step-btn` for +/− steppers.

## Settings persistence

Use `@capacitor/preferences` to remember:
- Last selected game
- Volume Boost preference (per-game; some users keep "Loud" everywhere)
- Voice toggle states
- Floor Lava frequency choice
- Custom action length min/max
- iPhone silent switch warning dismissed (so it doesn't show every time)

Do NOT persist things mid-game (timers, current power, etc.).

## Monetization architecture (for v1, just stub it)

Long-term plan: free with 3 games unlocked, $4.99 one-time IAP unlocks the rest. For v1, ship all games free — but structure the code so adding the paywall is a one-line check per game, not a refactor. Suggest a `featureFlags.js` with `isPremium` and per-game `isLocked()` helpers.

## App Store positioning

- **Name:** KidWrangler (working title — verify availability before committing)
- **Category:** Lifestyle or Family (NOT Kids — the user is the parent)
- **Tagline ideas:** "The pocket party host for parents" / "Screen-free play, narrated by your phone" / "10 seconds to a less bored kid"
- **Description angles:** rainy days, restaurant waits, birthday parties, road trips, grandparent visits, daycare. The "no screens" angle is huge — lean into it.

## What success looks like

- Builds and runs on iOS Simulator and Android emulator
- All 8 games work identically to the prototype, ideally better with native plugins
- Settings persist across app launches
- App passes Apple App Store review and Google Play review
- Loads instantly (<1 sec to game picker)
- Audio is reliably loud, voice works on real devices including iPhones with silent switch on (via AVAudioSession override)
- Wake lock survives the entire game session
- Clean, readable, maintainable code (this is going to grow)

## Suggested order of work

1. Read `prototype.html` end-to-end. Run it. Play each game. Get a feel for it.
2. Set up bare Capacitor project, get `index.html` showing the setup screen.
3. Refactor: pull shared audio/speech/UI code into modules. Each game into its own file.
4. Add manifest + service worker. Test PWA install on a phone.
5. Add Capacitor plugins one at a time, starting with KeepAwake and Preferences.
6. Test on real iOS device and real Android device. Real devices, not just simulators.
7. Build app icons and splash screens.
8. Write README with setup + submission steps.
9. Build for App Store / Play Store. Stop before submission — that requires the user's accounts.

## Things to ASK ABOUT before deciding

- App name (KidWrangler is a placeholder — flag for confirmation)
- Bundle identifier (e.g., `com.example.kidwrangler` — needs to match user's Apple/Google developer accounts)
- Whether to add analytics (recommend NOT for v1 — privacy story is cleaner)
- Whether to set up a landing page / privacy policy page (Apple requires a privacy policy URL for submission)

If you hit anything ambiguous, ask. Don't guess on app store metadata or developer-account-specific config.
