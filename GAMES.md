# Games — Detailed Spec

All 8 games live in their own file under `www/js/games/`. Each game exports: `setup(container)` to render the settings panel, `start()` to begin, `stop()` to clean up, and `getEndStats()` for the end screen.

When in doubt about exact behavior, **run `prototype.html` and observe**. The prototype is the source of truth.

---

## 1. Find Me 🔍 (Hide & Seek Helper)

**Concept:** Parent hides the phone, it makes escalating sounds until found.

**Two modes:**
- **Pulse** (easier, default) — constant sonar-style pings, never fully silent. 5 phases: 1.4s → 1.0s → 0.7s → 0.45s → 0.25s between pulses, climbing pitch and volume.
- **Chirp** (harder) — full silence between sounds. Sound choices: Chime, Bell, Siren, Beep, Cuckoo. 5 phases over the chosen difficulty duration with growing note count and shorter intervals.

**Settings:**
- Mode (Pulse / Chirp)
- Chirp sound type (only shown when Chirp selected)
- Volume Boost (Normal / Loud / MAX)
- Reverb toggle (adds 2.5sec hall-style echo via convolver)
- Difficulty (Easy 25s / Medium 45s / Hard 70s per phase)
- Hide Time countdown (10 / 20 / 30 / 60 sec before sound starts)

**Flow:** setup → "Hide the phone now" countdown → game with creature animation + intensity bar + status text → "Found Me!" tap → end screen with elapsed time

---

## 2. Red Light Green Light 🚦

**Concept:** Phone calls "Green Light" / "Red Light" at random intervals. Kids run on green, freeze on red.

**Sound effects:**
- Green: cheerful ascending arpeggio (C-E-G triangle waves)
- Red: low descending sawtooth buzzer (G-Eb-Bb)
- Both with optional voice prompts

**Settings:**
- Speed (Relaxed / Normal / Fast / CHAOS — chaos is sub-2-second swaps)
- Game Length (1 / 2 / 5 min / Endless)
- Voice toggle (on by default)
- Volume Boost

**Background:** full-screen color flips green ↔ red. Big emoji + state text + action text ("RUN!" / "FREEZE!").

---

## 3. Floor Lava 🌋

**Concept:** Phone calls out random actions, randomly the floor turns to lava and kids must climb on furniture.

**Action pool (60+):**
- **Easy:** hop, spin, touch toes, clap, jump, etc.
- **Animals:** roar like a lion, waddle like a penguin, etc.
- **Medium:** jumping jacks, balance moves, ninja tiptoe
- **Find:** scavenger hunt prompts ("find something soft")
- **Silly:** robot voices, superhero poses, pretend to be a tree

**Lava events:** 7-second full-screen shimmering red gradient with siren sound + "FLOOR IS LAVA — climb on something!" voice. **Must enforce minimum gap** between lava events:
- Sometimes: 10% probability per round, 25-sec minimum gap
- Often: 22%, 15-sec gap
- MAYHEM: 45%, 7-sec gap

**Settings:**
- Action Length (Quick 1.5–3s / Normal 3–5s / Chill 5–8s / Long 8–15s / Surprise 2–15s / Custom with +/− steppers)
- Difficulty (Easy / Mixed / Wild — controls action pool composition)
- Floor Is Lava frequency (Never / Sometimes / Often / MAYHEM)
- Game Length (1 / 2 / 5 min / Endless)
- Voice toggle, Volume Boost

**Live range display** under Action Length and Floor Is Lava settings showing the actual time ranges (not just labels).

---

## 4. Super Hero 🦸

**Concept:** Phone calls out comic-book superhero powers, kid acts them out. No timer pressure, pure pretend play.

**Powers (~100 total):**
- **Classic (60):** organized internally by category — flight, strength, energy/elements, mind powers, stealth, iconic moves (shield throw, magic lasso, Thor's hammer, metal claws, Iron Man suit), transformations, animals, force fields, heroic deeds, time/space
- **Silly (40):** food powers, body sound powers, defeat-with-cuteness, weird ones

**Critical:** Use shuffled-queue picking, not random. Each game shuffles the full pool, exhausts the queue, then reshuffles. This means Classic style takes ~5 minutes before any repeat.

**Settings:**
- Hero Style (Classic / Silly / All Powers) with description
- Action Length (Quick 2–4s / Normal 3–6s / Chill 5–9s / Long 9–14s)
- Game Length (1 / 2 / 5 min / Endless)
- Voice toggle, Volume Boost

**Background:** comic-book blue radial gradient.

---

## 5. Simon Says 🎤

**Concept:** Phone says commands. Kids only obey if it starts with "Simon says..." — otherwise they stay still or they're out.

**Commands (~32):** touch your nose, touch your toes, jump up, spin around, clap three times, pat your head, wiggle your fingers, etc.

**Trickiness setting:** controls how often the phone skips "Simon says":
- Easy: 15%
- Normal: 30%
- Sneaky: 50%

**Settings:**
- Trickiness with description that varies by setting ("Easy: ~1 in 7 commands skip Simon Says" / "Normal: ~1 in 3" / "Sneaky: ~half the time, no Simon Says")
- Pace (Slow / Normal / Fast)
- Game Length
- Volume Boost

When Simon says: green check emoji, chime sound, voice. When NOT Simon says: warning emoji, different chime. Visual cue helps younger kids — but the listening is the game.

---

## 6. Dance Party 💃

**Concept:** Synthesized drum beat plays continuously, voice calls out dance moves.

**Beat:** procedural drum machine via Web Audio.
- Kick: sine wave 150Hz → 40Hz with sharp envelope
- Snare: white noise highpassed at 1500Hz
- Hi-hat: white noise highpassed at 7000Hz, very short envelope
- Pattern: kick on 1 and 5, snare on 3 and 7, hi-hat on every odd 8th note

**Tempo settings:** Slow 90 BPM / Normal 110 / Fast 130 / PARTY 150

**Dance moves (~22):** The Robot, Disco point, Spin, Twist, Wiggle hips, Floss dance, Sprinkler, Funky chicken, Shopping cart, Stir the pot, Moonwalk, etc.

**Freeze breaks (optional toggle, default on):** ~20% per move-change, voice yells "FREEZE!", emoji becomes ice cube, beat keeps playing for 3 sec, then "DANCE!" resumes with a new move.

**Settings:** Tempo, Freeze breaks toggle, Game Length, Voice toggle, Volume Boost.

**Live BPM display** under Tempo selection.

---

## 7. Animal Charades 🐘

**Concept:** Phone names an animal, kid acts it out, others guess.

**Animals (~30+):**
- **Easy (12):** cow, cat, dog, pig, duck, sheep, horse, chicken, frog, bee, lion, monkey
- **Medium (10):** elephant, snake, owl, wolf, rooster, mouse, turkey, crow, donkey, bear
- **Hard (12):** kangaroo, penguin, octopus, crab, giraffe, zebra, flamingo, shark, whale, crocodile, hedgehog, sloth

**Settings:**
- Difficulty (Easy / Medium / Hard / All) with description
- Show animal name toggle (default on — turn off for older kids, only the actor sees it via "(only the actor can hear)" message)
- Voice toggle
- Volume Boost

**Flow:** No timer countdown. After Start, first animal appears. Tap "Got it! Next" to advance — score increments. Tap "End Game" for final stats. Score shown live during game.

---

## 8. Guess the Sound 🔊 (Animal Sounds)

**Concept:** Phone plays a synthesized animal sound a few times, kids guess what it is, tap to reveal.

**Procedurally generated animal sounds** via Web Audio (no audio files):
- Cow, Cat, Dog, Pig, Duck, Sheep, Horse, Chicken, Frog, Bee, Lion, Monkey (easy)
- Elephant, Snake, Owl, Wolf, Rooster, Mouse, Turkey, Crow, Donkey, Bear (medium)

Each sound is a hand-crafted oscillator + noise composition. **The sound code is in the prototype — do not regenerate, just port it.**

**Settings:**
- Difficulty (Easy / Medium / All)
- Sound Repeats (2x / 3x / 4x — how many times the sound plays before the answer prompt becomes available)
- Auto-advance toggle (after reveal, auto-load next round in 3.5 sec)
- Volume Boost

**Flow:** Round number shown. Sound plays N times with 1.4-sec gaps. "Reveal Answer" button. On reveal: emoji + name + sound plays once more + voice says "It's a [animal]". Button changes to "Next Sound". Auto-advance optional.

---

## Shared end screen pattern

All games end with: "[victory text]" big emoji + stat (time elapsed, score, rounds played, etc.) + "Play Again" button that returns to the setup screen with the same game's panel still selected.
