# KidWrangler

Voice-driven, screen-free games kids play. Capacitor app, target iOS + Android.

The web prototype lives at [`../prototype.html`](../prototype.html) and is the
authoritative reference for behavior. Spec docs live at
[`../BUILD_SPEC.md`](../BUILD_SPEC.md), [`../GAMES.md`](../GAMES.md),
[`../PRIVACY.md`](../PRIVACY.md), and [`../STORE_LISTING.md`](../STORE_LISTING.md).

## Project layout

```
app/
├── www/                  # Capacitor's web root (also the PWA payload)
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   ├── styles/
│   │   ├── main.css      # design system, layout
│   │   └── games.css     # per-game visual themes
│   ├── icons/            # PWA + iOS + Android icons (TODO: generate)
│   └── js/
│       ├── app.js        # bootstrap, game picker, SW registration
│       ├── audio.js      # Web Audio graph + procedural sounds
│       ├── speech.js     # iOS-hardened speech synthesis
│       ├── wakeLock.js   # screen wake lock + visibility re-acquire
│       ├── ui.js         # screens, opt pickers, shuffle queue
│       ├── storage.js    # @capacitor/preferences with localStorage fallback
│       ├── native.js     # Capacitor plugin shims (no-ops on web)
│       └── games/
│           ├── findMe.js
│           ├── redLight.js
│           ├── floorLava.js
│           ├── superHero.js
│           ├── simonSays.js
│           ├── danceParty.js
│           ├── animalCharades.js
│           ├── guessSound.js
│           ├── animalsData.js
│           └── animalSounds.js
├── ios/                  # generated on Mac via `npx cap add ios`
├── android/              # generated via `npx cap add android`
├── package.json
└── capacitor.config.json
```

## Dev workflow

### One-time setup

```sh
cd app
npm install
```

### Running the web preview (any OS)

```sh
npm run dev
```

Opens at `http://localhost:5173`. This is the cleanest way to iterate — no
native build needed. ES modules require an HTTP origin, so `file://` won't work.

Test order on the preview:

1. Open the page, click through each game's settings, hit **Test** on each.
2. For each game, hit **Start** and play through. Voice prompts may not work
   in some desktop browsers — check Chrome with Read-Aloud enabled.
3. The service worker will register on second load. After that, you can
   take the dev server offline and the app should still work.

### Running on Android (Windows / Mac / Linux)

Prerequisites: Android Studio installed, an emulator created or a physical
device with USB debugging enabled.

```sh
npm run sync          # copy www/ into android/app/src/main/assets/
npm run open:android  # opens Android Studio
# from Android Studio: pick a device, click Run
```

Alternatively without opening Android Studio:

```sh
npm run android
```

### Running on iOS (Mac only)

iOS builds require Xcode. **You cannot build iOS on Windows.** Options:

1. **Use a Mac.** Borrow one or pay $30/mo for a cloud Mac (MacInCloud, AWS).
2. **GitHub Actions macOS runner.** Free for public repos, $0.08/min for
   private. Set up a workflow that runs `npm run sync` and Xcode build, then
   uploads the IPA artifact.
3. **Xcode Cloud.** Apple's CI service, integrated with App Store Connect.
4. **Hand off** to a contractor with a Mac.

Once you have Mac access:

```sh
npm install
npx cap add ios
npm run sync
npm run open:ios   # opens Xcode, run on simulator or device
```

iOS device builds also require an Apple Developer account ($99/yr) for any
device that isn't your own. App Store submission obviously requires that.

## Design notes worth preserving

These are not "nice to have" — they are the audio fixes the prototype was
specifically built to solve. Don't strip them during refactors.

- **iOS speech keepalive.** [`speech.js`](www/js/speech.js) calls
  `speechSynthesis.resume()` every 4 seconds during games. Without this, iOS
  Safari kills speech synthesis after ~15 seconds of idle.
- **Speech unlock.** Every Test/Start button calls `unlockSpeech()` to fire a
  silent priming utterance inside the user gesture. Without it, later
  `speak()` calls fail silently on iOS.
- **50ms cancel-then-speak gap.** `speak()` cancels in-flight speech, then
  waits 50ms before starting the new utterance. Without this gap iOS races
  and drops the new utterance.
- **Silent audio loop.** `<audio id="silentLoop">` plays a near-zero-volume
  WAV continuously during games to keep the mobile audio context alive.
- **Wake lock visibility re-acquire.** [`wakeLock.js`](www/js/wakeLock.js)
  reacquires the screen wake lock on `visibilitychange` whenever a game
  is active. Browsers auto-release wake lock when the tab is backgrounded.
- **Compressor presets** (audio.js): three levels with progressively heavier
  limiting and master gain — `normal` (clean), `loud` (default), `max` (heavy
  limiting + 2.4× gain). Tuned by ear in the prototype, do not retune.
- **Shuffled-queue picking** for all prompt lists (ui.js's `makeQueue`): items
  cycle exactly once before reshuffling. Avoids the visible repeats you get
  with "random with last-pick check".

## TODOs before App Store / Play Store submission

- [ ] **App icon source.** Drop a 1024×1024 PNG at `www/icons-source/icon.png`
      and 1024×1024 splash at `www/icons-source/splash.png`, then run
      `npm run icons` (uses `@capacitor/assets`). See
      [STORE_LISTING.md icon notes](../STORE_LISTING.md#app-icon-notes) for
      design direction.
- [ ] **Bundle Google Fonts locally** for true offline-first. Currently loads
      from Google Fonts CDN; the service worker caches on first online load,
      but a cold install while offline would fall back to system fonts.
      Replace the `<link>` in index.html with a local `@font-face` block.
- [ ] **AVAudioSession override** for silent-switch bypass on iPhone. Will
      require either `@capacitor-community/native-audio` or a small custom
      Capacitor plugin (Objective-C: set
      `AVAudioSession.sharedInstance.category = .playback`). Critical UX win
      so voice prompts work even when the phone's silent switch is on.
- [ ] **App name + bundle ID** are placeholders (`KidWrangler`,
      `com.kidwrangler.app`). Confirm both before submitting.
- [ ] **Privacy policy URL** in App Store Connect / Play Console must point
      at a publicly hosted version of [`../PRIVACY.md`](../PRIVACY.md). Free
      options: GitHub Pages, a single-page Carrd, a static file on any host.
- [ ] **Apple Developer account** ($99/yr) and **Google Play Console**
      ($25 one-time) sign-ups. Bundle ID is committed at signup time.
- [ ] **Screenshots** per the plan in
      [STORE_LISTING.md](../STORE_LISTING.md#screenshots--what-to-capture).
- [ ] **In-app purchase wiring.** v1 ships with all 8 games unlocked and the
      paywall stubbed (per BUILD_SPEC.md guidance). Add real IAP via Apple
      StoreKit / Google Play Billing in v1.1.

## Submission steps

### Apple App Store

1. Create app record in App Store Connect with bundle ID matching capacitor.config.json.
2. Configure In-App Purchases (single non-consumable, $4.99) — even though v1
   ships unlocked, set this up so v1.1 doesn't need a metadata change.
3. Upload screenshots from STORE_LISTING.md.
4. Fill in App Store description, keywords, promotional text from STORE_LISTING.md.
5. Choose category Lifestyle (primary), Entertainment (secondary).
6. Privacy nutrition label: "Data Not Collected".
7. Provide privacy policy URL.
8. Build IPA via Xcode → Archive → Upload to App Store Connect.
9. Submit for review. Apple usually takes 24–72 hours.

### Google Play Store

1. Create app in Play Console with package name matching capacitor.config.json.
2. Build signed AAB: `cd android && ./gradlew bundleRelease`
3. Upload to internal testing track first; let it run overnight.
4. Promote to production after sanity check.
5. Fill in Data Safety section: "No data collected, no data shared".
6. Privacy policy URL.
7. Provide screenshots, descriptions from STORE_LISTING.md.
8. Submit for review. Google usually takes hours-to-a-day.

## Versioning

- **Marketing version** lives in `capacitor.config.json` and the platform
  config files (Info.plist for iOS, build.gradle for Android).
- **Build number** must increment on every TestFlight / Play track upload —
  for iOS it's a separate "Build" string, for Android it's `versionCode`.
- Follow semver-ish for marketing version: 1.0.0 → 1.0.1 (bug), 1.1.0
  (feature), 2.0.0 (rewrite or major redesign).
