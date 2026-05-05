# App Store + Play Store Listing Copy

All copy below uses `[APP NAME]` as a placeholder until you pick the final name. Replace before submission.

---

## Apple App Store

### Name (30 char max)
`[APP NAME]`

### Subtitle (30 char max)
`Screen-free games kids play`

(Alternates: `Pocket party host for parents`, `Voice-driven kid play`, `The boredom emergency tool`)

### Promotional text (170 char, editable post-launch)
`8 voice-driven games kids play without touching your phone. Restaurant meltdowns, rainy days, road trips, daycare drop-ins. Free to try.`

### Keywords (100 char, comma-separated)
`parents,kids,games,party,toddler,family,offline,playtime,rainy,roadtrip,daycare,charades,dance,boredom`

### Category
**Primary:** Lifestyle
**Secondary:** Entertainment

(Avoid Family. Definitely avoid Kids — see review notes below.)

### Description (4000 char)

For parents, grandparents, daycare workers, and party hosts. Turn your phone into a screen-free play coach.

[APP NAME] is the pocket game director you reach for when:

- A toddler is melting down in a restaurant and you have 4 minutes before the food arrives.
- Cousins haven't seen each other in six months and won't engage.
- It's a rainy Saturday and three kids have three different energy levels.
- You're hosting a birthday party and the parents need a 5-minute breather.
- The road trip turned south ten minutes after "are we there yet."

Your phone becomes the game director. It calls out actions, plays music, makes silly sounds. The kids run, freeze, dance, hide, act it out, and guess animals. You watch and laugh.

8 GAMES IN ONE APP

Find Me — Hide the phone. Kids hunt for it by following the sound. The sound gets louder and more frantic until they find it.

Red Light Green Light — The classic. Phone calls the lights, kids run on green and freeze on red.

Floor Is Lava — Random crazy actions ("hop on one foot!", "find something soft!") with surprise lava events where everyone has to climb on something.

Super Hero — Phone calls out hero powers ("Hulk smash!", "Throw your shield!"). Pure pretend play, no timer pressure.

Simon Says — Phone says it. Kids only obey if Simon says it first.

Dance Party — A drum beat plays, the phone calls out dance moves. Surprise FREEZE breaks.

Animal Charades — Phone names an animal. Kids act it out. Others guess.

Guess the Sound — Phone makes an animal sound. Kids guess what animal.

WHY PARENTS LIKE IT

NO SCREEN TIME. Kids never touch the phone. The phone is the speaker; the kids are the action.

NO INTERNET. Works fully offline. Airplane-mode safe.

NO ADS. Ever.

NO DATA COLLECTION. Your privacy is fully respected. Nothing leaves your device.

LOUD AND CLEAR. Three volume boost modes for noisy living rooms and dance parties.

INSTANT START. Pick a game, hit start. No accounts, no setup, no logins.

WHAT'S FREE, WHAT'S PAID

Four games free forever: Find Me, Red Light Green Light, Floor Is Lava, Dance Party.
Unlock the other four (Super Hero, Simon Says, Animal Charades, Guess the Sound) with a one-time $4.99 purchase. No subscription. No upgrades. Buy it once, own it forever.

WHO THIS IS FOR

Designed for parents and caregivers of kids roughly ages 3 to 10. Most fun with two or more kids, but works solo (Find Me especially). Younger kids love Floor Is Lava and Dance Party. Older kids reach for Charades and Simon Says. Grandparents report it's the easiest icebreaker in their toolkit.

WHAT THIS IS NOT

Not a kids' app to hand the iPad to. The point is the opposite — the phone stays with you, the kids do the playing.

### App Review notes (private to Apple, not public)

This app is a parent-facing utility. The user is always the adult: they hold the phone, configure the game, hit Start. The app emits voice prompts and sounds; children respond physically (running, freezing, acting). Children never interact with the screen.

Accordingly:
- Category is Lifestyle, not Kids.
- No data collection of any kind. No analytics, no tracking, no third-party SDKs.
- In-app purchase is a single one-time unlock (StoreKit 2, non-consumable). Standard Apple parent gate applies via App Store IAP flow.
- No external links.
- No login or account system.

Voice prompts are simple physical-activity instructions ("hop on one foot", "spin around", "find something soft"). All content is age-appropriate for ages 3+.

---

## Google Play Store

### App title (30 char)
`[APP NAME]`

### Short description (80 char)
`Screen-free voice games for kids. 8 games. No internet. No ads. No data.`

### Full description (4000 char)
Same as the App Store description above. Google Play allows the same length.

### Category
**Primary:** Lifestyle
**Tags:** Parenting, Family, Offline games

### Content rating
Everyone (E). Apply via IARC questionnaire — answer no to all "user-generated content," "violence," "shares location," etc. The questionnaire takes ~5 minutes.

### Data safety section
- Data collected: **None**
- Data shared: **None**
- Data encrypted in transit: N/A (no transit)
- Users can request data deletion: N/A (no data stored on our servers)

---

## Screenshots — what to capture

Both stores want 3–10 screenshots in portrait orientation. Aim for these shots, in this order:

1. **Game picker** with all 8 games visible. The strongest "what is this" shot.
2. **Find Me — seek screen** with the creature animation and intensity bar at full crank. Suggests motion and urgency.
3. **Red Light** in red state, phone caption: *Kids freeze!*
4. **Floor Is Lava** mid-lava event, full red shimmer, voice line visible.
5. **Dance Party** with a dance move displayed.
6. **Setup screen** for one game, showing the parent-facing controls. Reinforces "this is a parent tool."
7. **End screen** with stats, optional.

For each, overlay a one-line caption in the upper third explaining the screen ("Hide the phone — kids hunt by sound").

App Store wants a portrait phone screenshot at 6.5" or 6.7" minimum. iPad screenshots optional but recommended.

---

## App icon notes

Don't ship a cartoon-kid icon. That signals "this is for kids" to App Store reviewers and risks landing in the Kids category, which has stricter review.

Icon directions that work for "parent utility":
- A phone silhouette with a megaphone or speaker bursting from it
- A chunky coral-and-navy shape that reads as "playful" without being childish
- The wordmark in Caveat/Fredoka with a small playful element

Avoid:
- Cartoon kid faces
- Crayon textures, child handwriting
- Stuffed animal imagery
- Anything that reads as "ages 4–6 only"

Source icon must be 1024×1024, no alpha, no rounded corners (Apple rounds for you). Capacitor's `@capacitor/assets` generates all sizes from one source.
