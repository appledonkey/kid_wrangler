# Prompt for Claude Code

Copy and paste everything below this line into Claude Code as your first message.

---

I need to turn a working HTML prototype into a Capacitor mobile app for iOS and Android, ready for App Store and Google Play submission.

I've attached three files:

- `prototype.html` — a complete, working single-file prototype with 8 mini-games for kids that's run by the parent's phone (voice prompts, audio cues). Open it in a browser and play through each game to understand the behavior.
- `BUILD_SPEC.md` — full build spec: stack, project structure, technical gotchas, native plugin recommendations, design system, and what success looks like.
- `GAMES.md` — detailed spec for each of the 8 games: settings, behavior, flow, content lists.

Please read all three files completely before writing any code.

Then:

1. Confirm your understanding of the project by summarizing back: what we're building, who it's for, what stack we're using, and the riskiest 2–3 technical gotchas you noticed in the prototype. Flag anything ambiguous.

2. Ask me about anything you genuinely need before starting (app name, bundle ID, whether I have an Apple Developer account, etc.). Don't ask permission for routine implementation choices — just make them and flag the notable ones.

3. Lay out your proposed plan as numbered steps, each with a rough time estimate. Don't start coding until I approve the plan.

4. Once approved, work through the steps. Show me the project after each major milestone (Capacitor scaffolded, refactor done, plugins added, icons in, ready-for-build).

Important constraints:

- **Do not rewrite in React, Vue, Svelte, or any framework.** Vanilla JS works fine and the prototype proves it. Modular vanilla JS files only. If you genuinely think a framework is needed for one specific reason, flag it and ask.
- **Preserve every audio gotcha fix from the prototype.** They were hard-won. Specifically: iOS speech keepalive, speech unlock priming, silent-loop audio session keepalive, cancel-then-speak race fix, dynamics compressor presets, shuffle-queue prompt picking. The BUILD_SPEC has the full list.
- **The prototype is the source of truth for behavior.** When in doubt about how something should work, run the prototype.
- **Stop before submitting to the stores.** I'll handle the submission with my own developer accounts.

Start by reading the files, then come back with your summary, questions, and plan.
