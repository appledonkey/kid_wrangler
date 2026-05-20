/* Super Hero — phone calls out hero (or villain) moves, kid acts them out.
 *
 * Role picker: Hero / Villain / Both.
 *  - Hero: 100 classic-comic hero powers, generic (no trademarked names).
 *  - Villain: 100 cartoon-villain moves. Saturday-morning energy:
 *    twirling mustaches, stealing cookies, evil schemes. No real weapons,
 *    nothing kids shouldn't actually act out.
 *  - Both: shuffles all 200 together.
 *
 * No timer pressure on each move; pure pretend play. Shuffle queue auto-resets
 * when the role changes (makeQueue reseeds when its pool reference changes).
 */

import {
  ensureAudio,
  playChime,
  playTickSound,
  playSuccessJingle,
} from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
  speechDurationMs,
  cancelSpeech,
} from '../speech.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import {
  show,
  setupOpts,
  isActiveScreen,
  retriggerAnim,
  makeQueue,
} from '../ui.js';
import { load, save } from '../storage.js';
import { isLocked, attemptPurchase } from '../featureFlags.js';
import { successHaptic } from '../native.js';

const KEY = 'superHero';

const STATE = {
  role: 'hero',
  pace: 'normal',
  length: 120,
};

const HERO_POWERS = [
  // Flight & speed
  { text: 'Fly through the sky!', emoji: '🦅' },
  { text: 'Run at lightning speed!', emoji: '⚡' },
  { text: 'Teleport across the room!', emoji: '✨' },
  { text: 'Phase through a wall!', emoji: '👻' },
  { text: 'Swing on a web!', emoji: '🕸️' },
  { text: 'Glide through the air!', emoji: '🪁' },
  { text: 'Soar like an eagle!', emoji: '🌤️' },
  { text: 'Dash so fast you blur!', emoji: '💨' },
  { text: 'Skid to a heroic stop!', emoji: '🛼' },
  { text: 'Hover in mid-air!', emoji: '🛸' },

  // Strength & smashing
  { text: 'Super strength! Lift something heavy!', emoji: '💪' },
  { text: 'Do a hulking SMASH!', emoji: '👊' },
  { text: 'Punch a bad guy! Bam!', emoji: '💥' },
  { text: 'Catch a falling building!', emoji: '🏢' },
  { text: 'Pick up a car!', emoji: '🚗' },
  { text: 'Crush a rock with your bare hands!', emoji: '🪨' },
  { text: 'Flip a giant boulder!', emoji: '🏔️' },
  { text: 'Crack a sidewalk with your fist!', emoji: '🤜' },
  { text: 'Bend a steel bar!', emoji: '🔩' },
  { text: 'Lift a hippo over your head!', emoji: '🦛' },

  // Energy & elements
  { text: 'Shoot laser eyes! Pew pew!', emoji: '👀' },
  { text: 'Shoot fire from your hands!', emoji: '🔥' },
  { text: 'Shoot ice from your hands!', emoji: '❄️' },
  { text: 'Send out a thunderclap!', emoji: '⛈️' },
  { text: 'Throw a lightning bolt!', emoji: '🌩️' },
  { text: 'Freeze breath! Frost everything!', emoji: '🥶' },
  { text: 'Heat vision! Melt the bad guys!', emoji: '🔆' },
  { text: 'Raise your arms and summon the wind!', emoji: '🌬️' },
  { text: 'Call down the rain with a battle cry!', emoji: '🌧️' },
  { text: 'Make a giant tidal wave!', emoji: '🌊' },
  { text: 'Plant powers! Grow vines!', emoji: '🌱' },
  { text: 'Summon a sandstorm!', emoji: '🏜️' },
  { text: 'Make the earth shake!', emoji: '🌍' },
  { text: 'Cast a magic spell!', emoji: '🪄' },
  { text: 'Throw a glowing energy ball!', emoji: '🔮' },
  { text: 'Wrap yourself in golden light!', emoji: '🌟' },

  // Mind powers
  { text: 'Use telekinesis! Move stuff with your mind!', emoji: '🧠' },
  { text: 'Press your temples — read their mind!', emoji: '🤔' },
  { text: 'Use mind control on a villain!', emoji: '🌀' },
  { text: 'Squint hard and beam a thought!', emoji: '💭' },
  { text: 'Brainwave attack!', emoji: '💫' },
  { text: 'Freeze — you just saw the future!', emoji: '🔭' },

  // Stealth & senses
  { text: 'Become invisible! Sneak around!', emoji: '🫥' },
  { text: 'Danger sense! Dodge!', emoji: '🕷️' },
  { text: 'Super hearing! Listen far away!', emoji: '👂' },
  { text: 'X-ray vision! See through walls!', emoji: '👁️' },
  { text: 'Cloak yourself in shadow!', emoji: '🌑' },
  { text: 'Tracker mode! Sniff out the bad guys!', emoji: '👃' },

  // Iconic moves & weapons
  { text: 'Throw your hero shield!', emoji: '🛡️' },
  { text: 'Spin your magic lasso!', emoji: '🪢' },
  { text: 'Swing a mighty thunder hammer!', emoji: '🔨' },
  { text: 'Slash with metal claws!', emoji: '🗡️' },
  { text: 'Summon your iron armor!', emoji: '🤖' },
  { text: 'Aim your bow and arrow!', emoji: '🏹' },
  { text: 'Light up your power ring!', emoji: '💚' },
  { text: 'Strike a brooding hero glare!', emoji: '🦇' },
  { text: 'Strike a hero pose!', emoji: '🦸' },
  { text: 'Cape twirl and pose!', emoji: '🎭' },
  { text: 'Wield twin swords!', emoji: '⚔️' },
  { text: 'Pull out a glowing battle staff!', emoji: '🦯' },
  { text: 'Crack a whip of lightning!', emoji: '⚡' },
  { text: 'Throw spinning star blades!', emoji: '🌠' },

  // Transformations & shape-shifting
  { text: 'BULK UP and get angry!', emoji: '😡' },
  { text: 'Shape-shift into something cool!', emoji: '🔄' },
  { text: 'Grow giant!', emoji: '🦣' },
  { text: 'Shrink down tiny!', emoji: '🐜' },
  { text: 'Stretch your arms out long!', emoji: '🤸' },
  { text: 'Turn to stone!', emoji: '🗿' },
  { text: 'Catch fire!', emoji: '🔥' },
  { text: 'Bounce like rubber!', emoji: '🤾' },
  { text: 'Sprout giant wings!', emoji: '🪽' },
  { text: 'Grow a tail and fangs!', emoji: '🦷' },
  { text: 'Turn into a wolf!', emoji: '🐺' },

  // Animal / savage
  { text: 'Roar like a hero beast!', emoji: '🦁' },
  { text: 'Roar a command to the animals!', emoji: '🐾' },
  { text: 'Climb a wall like a spider!', emoji: '🧗' },
  { text: 'Pounce like a tiger!', emoji: '🐯' },
  { text: 'Sting like a hornet!', emoji: '🐝' },
  { text: 'Bite with snake fangs!', emoji: '🐍' },

  // Creature transformations (mythical & monstrous, hero-side)
  { text: 'Howl at the full moon and turn into a werewolf!', emoji: '🌕' },
  { text: 'Sprout fangs and turn into a friendly vampire!', emoji: '🧛' },
  { text: 'Erupt into a roaring dragon!', emoji: '🐲' },
  { text: 'Burst into flames as a fire phoenix!', emoji: '🔥' },
  { text: 'Pound your chest as a giant gorilla guardian!', emoji: '🦍' },
  { text: 'Become a kraken with eight tentacles!', emoji: '🐙' },
  { text: 'Scatter into a swarm of butterflies!', emoji: '🦋' },
  { text: 'Transform into a charging unicorn!', emoji: '🦄' },
  { text: 'Grow dolphin fins and dive deep!', emoji: '🐬' },
  { text: 'Shapeshift into a galloping centaur!', emoji: '🐎' },
  { text: 'Become a glowing jellyfish creature!', emoji: '🪼' },
  { text: 'Transform into a thunder eagle with lightning wings!', emoji: '🦅' },
  { text: 'Pull into your turtle shell to defend!', emoji: '🐢' },
  { text: 'Become a spiked hedgehog warrior!', emoji: '🦔' },
  { text: 'Root into a living tree giant!', emoji: '🌳' },

  // Force fields & defense
  { text: 'Put up a force field!', emoji: '🛡️' },
  { text: 'Block bullets with your wrist guards!', emoji: '✋' },
  { text: 'Raise a magic barrier!', emoji: '🌐' },
  { text: 'Deflect a punch with your forearm!', emoji: '💪' },

  // Heroic deeds
  { text: 'Dive and catch a falling friend!', emoji: '🆘' },
  { text: 'Rescue a kitten from a tree!', emoji: '🐱' },
  { text: 'Stop a runaway train!', emoji: '🚂' },
  { text: 'Catch a falling person!', emoji: '🪂' },
  { text: 'Defuse a bomb!', emoji: '💣' },
  { text: 'Take a heroic bow for the crowd!', emoji: '🙇' },
  { text: 'Carry an old lady across a busy street!', emoji: '👵' },
  { text: 'Save a baby from danger!', emoji: '👶' },
  { text: 'Lead the team into battle!', emoji: '🚩' },
  { text: 'Plant a flag of victory!', emoji: '🏁' },
  { text: 'Free trapped friends!', emoji: '🔓' },

  // Time & space
  { text: 'Slow down time!', emoji: '⏰' },
  { text: 'Open a portal to another dimension!', emoji: '🌌' },
  { text: 'Time travel back five seconds!', emoji: '⏳' },
  { text: 'Speed up time! Make flowers bloom!', emoji: '🌸' },
  { text: 'Pop into a parallel world!', emoji: '🪞' },
  { text: 'Spin backwards — rewind a mistake!', emoji: '⏪' },

  // Anime fighter
  { text: 'BLAST a two-handed energy beam!', emoji: '🤲' },
  { text: 'Spam glowing ki blasts!', emoji: '💠' },
  { text: 'Charge a giant one-handed beam!', emoji: '☄️' },
  { text: 'Throw a spinning energy disk!', emoji: '💿' },
  { text: 'Flash blinding light from your hands!', emoji: '🌞' },
  { text: 'Gather universe energy into a giant spirit ball!', emoji: '🪐' },
  { text: 'Charge up with rocks floating around you!', emoji: '💢' },
  { text: 'Glow red and double your power!', emoji: '🔴' },
  { text: 'Two fingers to your head — teleport!', emoji: '👆' },
  { text: 'Move so fast you leave afterimages!', emoji: '👥' },
  { text: 'Split into four copies of yourself!', emoji: '👯' },
  { text: 'Power up to your golden warrior form!', emoji: '🟡' },
  { text: 'Yell as your hair stands up and changes color!', emoji: '🦱' },
  { text: 'Eat a magic bean and heal up!', emoji: '🫘' },
  { text: 'Do a fusion dance with your friend!', emoji: '🪩' },
];

const VILLAIN_MOVES = [
  // Flight & getaway
  { text: 'Cackle and fly off into the night!', emoji: '🌙' },
  { text: 'Dash away from the heroes!', emoji: '💨' },
  { text: 'Teleport into your secret lair!', emoji: '🏰' },
  { text: 'Phase through a vault wall!', emoji: '🏦' },
  { text: 'Swing on an evil web of lies!', emoji: '🕸️' },
  { text: 'Glide above the city looking menacing!', emoji: '🌃' },
  { text: 'Soar on dragon wings!', emoji: '🐉' },
  { text: 'Zoom away on a hover-board!', emoji: '🛹' },
  { text: 'Skitter into the shadows!', emoji: '🦂' },
  { text: 'Hover above your minions!', emoji: '🦹' },

  // Strength & destruction
  { text: 'SMASH a building just because!', emoji: '🏚️' },
  { text: 'Punch through a steel wall!', emoji: '🤜' },
  { text: 'Crush the hero plans in your fist!', emoji: '📜' },
  { text: 'Pick up a car and shake it!', emoji: '🚙' },
  { text: 'Roll a giant boulder down a hill!', emoji: '🪨' },
  { text: 'Stomp on a toy castle!', emoji: '🏯' },
  { text: 'Flip a table dramatically!', emoji: '🪑' },
  { text: 'Bend prison bars to escape!', emoji: '⛓️' },
  { text: 'Crumple a tin can!', emoji: '🥫' },
  { text: 'Drop a giant anvil!', emoji: '🧱' },

  // Evil energy
  { text: 'Shoot evil purple lasers!', emoji: '💜' },
  { text: 'Crackle with dark lightning!', emoji: '⚡' },
  { text: 'Freeze the whole city solid!', emoji: '🧊' },
  { text: 'Flood the streets with goo!', emoji: '🟢' },
  { text: 'Cast a wicked curse!', emoji: '🪄' },
  { text: 'Summon a thunderstorm!', emoji: '🌩️' },
  { text: 'Conjure poisonous vines!', emoji: '🌿' },
  { text: 'Make the ground split open!', emoji: '🌋' },
  { text: 'Send out a shockwave of doom!', emoji: '🌫️' },
  { text: 'Light a sinister fireball!', emoji: '🔥' },

  // Mind manipulation
  { text: 'Cackle evilly!', emoji: '😈' },
  { text: 'Wave your hands and hypnotize the crowd!', emoji: '🌀' },
  { text: 'Brainwash a citizen!', emoji: '🧠' },
  { text: 'Whisper bad ideas into their ear!', emoji: '👂' },
  { text: 'Mind-trick a hero!', emoji: '💭' },
  { text: 'Mind-link with your minions!', emoji: '📡' },

  // Sneaking & spying
  { text: 'Sneak into the bank!', emoji: '🤫' },
  { text: 'Cloak yourself in mist!', emoji: '👤' },
  { text: 'Spy on the heroes from a rooftop!', emoji: '🔭' },
  { text: 'Tiptoe past a sleeping guard!', emoji: '🦶' },
  { text: 'Hide behind a giant pillar!', emoji: '🏛️' },
  { text: 'Sneak behind enemy lines!', emoji: '👁️' },

  // Iconic villain moves
  { text: 'Twirl your evil mustache!', emoji: '👨‍🎤' },
  { text: 'Pet your evil cat!', emoji: '😼' },
  { text: 'Aim a freeze ray!', emoji: '🥶' },
  { text: 'Wield a dark sword!', emoji: '⚔️' },
  { text: 'Crack an electric whip!', emoji: '🪢' },
  { text: 'Throw a smoke bomb!', emoji: '💣' },
  { text: 'Tap a venomous staff!', emoji: '🦯' },
  { text: 'Pose with your skull mask!', emoji: '🎭' },
  { text: 'Swirl your evil cape!', emoji: '🧥' },
  { text: 'Throw a confetti bomb!', emoji: '🎊' },
  { text: 'Press a doomsday button!', emoji: '🔘' },
  { text: 'Ignite your sword in flames!', emoji: '🗡️' },

  // Evil transformations
  { text: 'Transform into a giant monster!', emoji: '👺' },
  { text: 'Shrink and crawl through a vent!', emoji: '🐜' },
  { text: 'Turn into a slithery snake!', emoji: '🐍' },
  { text: 'Sprout extra arms!', emoji: '🐙' },
  { text: 'Grow scales and a tail!', emoji: '🦎' },
  { text: 'Melt into a puddle of goo!', emoji: '🫠' },
  { text: 'Turn into a swarm of bats!', emoji: '🦇' },
  { text: 'Sprout poisonous spikes!', emoji: '🌵' },
  { text: 'Shift into a shadow!', emoji: '🖤' },
  { text: 'Transform into a hulking beast!', emoji: '🐲' },

  // Wild animal villain
  { text: 'Stomp like a T-rex villain!', emoji: '🦖' },
  { text: 'Snarl like a wolf!', emoji: '🐺' },
  { text: 'Pounce like an evil panther!', emoji: '🐈‍⬛' },
  { text: 'Hiss like a cobra!', emoji: '🐍' },
  { text: 'Cackle like a hyena!', emoji: '🦴' },
  { text: 'Snap your alligator jaws!', emoji: '🐊' },

  // Lair & defense
  { text: 'Surround your lair with a force field!', emoji: '🟦' },
  { text: 'Pop up a wall of spikes!', emoji: '🪤' },
  { text: 'Encase yourself in dark armor!', emoji: '🛡️' },
  { text: 'Activate the laser fence!', emoji: '🚧' },

  // Evil schemes & deeds
  { text: 'Steal a cookie!', emoji: '🍪' },
  { text: 'Tie a hero to a rocket!', emoji: '🚀' },
  { text: 'Kidnap the mayor\'s puppy!', emoji: '🐕' },
  { text: 'Steal the city\'s pizza supply!', emoji: '🍕' },
  { text: 'Plot to take over the world!', emoji: '🌎' },
  { text: 'Demand a giant ransom!', emoji: '💰' },
  { text: 'Push a giant domino chain!', emoji: '🀫' },
  { text: 'Trap the heroes in a cage!', emoji: '🔐' },
  { text: 'Rob a vault!', emoji: '💎' },
  { text: 'Switch all the road signs!', emoji: '🛑' },
  { text: 'Replace the candy with broccoli!', emoji: '🥦' },
  { text: 'Release a horde of rubber chickens!', emoji: '🐔' },
  { text: 'Steal everyone\'s left socks!', emoji: '🧦' },
  { text: 'Cancel Saturday morning cartoons!', emoji: '📺' },
  { text: 'Glue everything to the ceiling!', emoji: '🧲' },
  { text: 'Take all the trophies!', emoji: '🏆' },

  // Time & space schemes
  { text: 'Freeze time for everyone but you!', emoji: '⏰' },
  { text: 'Open a dark portal!', emoji: '🌌' },
  { text: 'Travel back to undo a hero victory!', emoji: '⏳' },
  { text: 'Rewind history!', emoji: '⏪' },
  { text: 'Pop into the heroes\' base!', emoji: '🪞' },
  { text: 'Trap heroes in a time loop!', emoji: '🔁' },

  // Big villain energy
  { text: 'Jab a doomsday remote with both thumbs!', emoji: '🎮' },
  { text: 'Steal everyone\'s bedtime!', emoji: '🛏️' },
  { text: 'Turn off the sun!', emoji: '☀️' },
  { text: 'Write your name across the moon!', emoji: '🌝' },

  // Monster transformations (villain-side)
  { text: 'Rise as a shambling zombie!', emoji: '🧟' },
  { text: 'Transform into a vampire bat!', emoji: '🦇' },
  { text: 'Slither as a giant python and squeeze!', emoji: '🐍' },
  { text: 'Become a hairy spider monster!', emoji: '🕷️' },
  { text: 'Phase into a haunting ghost!', emoji: '👻' },
  { text: 'Rise as a skeleton warlord!', emoji: '💀' },
  { text: 'Howl as a feral werewolf under a blood moon!', emoji: '🌕' },
  { text: 'Become a Komodo dragon predator!', emoji: '🦖' },
  { text: 'Erupt as an evil dark dragon!', emoji: '🐉' },
  { text: 'Skitter as a giant beetle!', emoji: '🪲' },
  { text: 'Wave your scorpion tail and pinchers!', emoji: '🦂' },
  { text: 'Become a tentacled sea monster!', emoji: '🦑' },
  { text: 'Shapeshift into a rat king!', emoji: '🐀' },
  { text: 'Become a swamp crocodile beast!', emoji: '🐊' },
  { text: 'Reanimate as a bone golem!', emoji: '🦴' },

  // Anime villain
  { text: 'Transform into your darkest, scariest form!', emoji: '👹' },
  { text: 'Hover in place and smirk!', emoji: '😏' },
  { text: 'Absorb your minion to grow stronger!', emoji: '💢' },
  { text: 'Stretch your arm like pink goo!', emoji: '🩷' },
  { text: 'Yell that your power level is OVER NINE THOUSAND!', emoji: '9️⃣' },
  { text: 'Charge a dark ki ball in your palm!', emoji: '🟣' },
  { text: 'Yell SELF-DESTRUCT and strike a pose!', emoji: '🧨' },
  { text: 'Wiggle your fingers to brainwash!', emoji: '🖐️' },
  { text: 'Tail-whip a hero with your monkey tail!', emoji: '🐒' },
  { text: 'Two fingers to your forehead — drill beam!', emoji: '👉' },
  { text: 'Make your eyes glow red!', emoji: '🔴' },
  { text: 'Reveal your true monster form!', emoji: '👾' },
  { text: 'Throw a flurry of evil ki blasts!', emoji: '🟪' },
  { text: 'Cackle while charging up your dark aura!', emoji: '🌪️' },
  { text: 'Spread purple darkness over the city!', emoji: '🌇' },
];

const HERO_PACE = {
  slow: [9, 14],
  normal: [3, 6],
  fast: [2, 4],
  chaos: [1, 2],
};

/** Old shape used quick/chill/long. Map to the new tier set. */
function normalizePaceKey(k) {
  if (k === 'quick') return 'fast';
  if (k === 'chill') return 'slow';
  if (k === 'long') return 'slow';
  return k;
}

function getPool() {
  if (STATE.role === 'villain') return VILLAIN_MOVES;
  if (STATE.role === 'both') return [...HERO_POWERS, ...VILLAIN_MOVES];
  return HERO_POWERS;
}

const queue = makeQueue(() => getPool());

let actionTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let _ended = false;
let _starting = false;

function announce(power) {
  const emojiEl = document.getElementById('heroEmoji');
  const textEl = document.getElementById('heroText');
  emojiEl.textContent = power.emoji;
  textEl.textContent = power.text;
  retriggerAnim(emojiEl, textEl);
  playChime(784, 2, 0.6);
  setTimeout(() => speak(power.text, { rate: 1.0, pitch: 1.0 }), 100);
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  document.getElementById('heroTimer').textContent = `${m}:${s
    .toString()
    .padStart(2, '0')} left`;
}

function startGame() {
  show('heroGame');
  document.body.classList.add('hero-bg');
  queue.reset();
  // Reset prompt area so stale state from the last session doesn't flash.
  document.getElementById('heroEmoji').textContent = '🦸';
  document.getElementById('heroText').textContent = 'Get ready!';

  const fire = () => {
    if (!isActiveScreen('heroGame')) return;
    const power = queue.next();
    announce(power);
    const [min, max] = HERO_PACE[STATE.pace];
    const speechMs = speechDurationMs(power.text, { rate: 1.0 });
    const gapMs = (min + Math.random() * (max - min)) * 1000;
    actionTimer = setTimeout(fire, speechMs + gapMs);
  };
  setTimeout(fire, 250); // see floorLava.js for the rationale

  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    document.getElementById('heroTimer').textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('heroCountdown');
  let remaining = 3;
  const el = document.getElementById('heroCountdown');
  el.textContent = remaining;
  playTickSound();
  countdownTimer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      el.textContent = remaining;
      playTickSound();
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startGame();
    }
  }, 1000);
}

function endGame() {
  if (_ended) return;
  _ended = true;
  clearAll();
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  document.body.classList.remove('hero-bg');
  successHaptic();
  const closingLine =
    STATE.role === 'villain'
      ? 'Mwa ha ha! Great evil-doing!'
      : STATE.role === 'both'
      ? 'Great work, hero or villain!'
      : 'You saved the day! Great job hero!';
  speak(closingLine, { rate: 1.0 });
  playSuccessJingle();
  show('heroEnd');
  _starting = false;
}

function clearAll() {
  if (actionTimer) clearTimeout(actionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  actionTimer = endTimeout = timerInterval = countdownTimer = null;
}

function updateRoleDisplay() {
  const el = document.getElementById('heroRoleDisplay');
  if (!el) return;
  const labels = {
    hero: '130 hero powers',
    villain: '130 villain moves',
    both: '260 powers + moves, mixed',
  };
  el.textContent = labels[STATE.role] || '';
}

function updatePaceDisplay() {
  const el = document.getElementById('heroPaceDisplay');
  if (!el) return;
  const [min, max] = HERO_PACE[STATE.pace];
  el.textContent = `${min}–${max} seconds per move`;
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (saved) {
    if (typeof saved.role === 'string' && ['hero', 'villain', 'both'].includes(saved.role)) {
      STATE.role = saved.role;
    }
    if (typeof saved.pace === 'string') STATE.pace = normalizePaceKey(saved.pace);
    if (typeof saved.length === 'number') STATE.length = saved.length;
  }
  syncOpt('heroRoleOpts', STATE.role);
  syncOpt('heroPaceOpts', STATE.pace);
  syncOpt('heroLengthOpts', String(STATE.length));
  updateRoleDisplay();
  updatePaceDisplay();
}

function syncOpt(containerId, value) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.querySelectorAll('.opt').forEach((b) => {
    b.classList.toggle('selected', b.dataset.val === value);
  });
}

const persist = () => save(KEY, STATE);

export function init() {
  setupOpts('heroRoleOpts', (v) => {
    STATE.role = v;
    queue.reset();
    updateRoleDisplay();
    persist();
  });
  setupOpts('heroPaceOpts', (v) => {
    STATE.pace = v;
    updatePaceDisplay();
    persist();
  });
  setupOpts('heroLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });

  document.getElementById('heroTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(784, 2, 0.6);
    const testLine =
      STATE.role === 'villain' ? 'Cackle evilly!' : 'Fly through the sky!';
    setTimeout(() => speak(testLine, { rate: 1.0, pitch: 1.05 }), 150);
  });

  document.getElementById('heroStartBtn').addEventListener('click', async () => {
    if (_starting) return;
    _starting = true;
    if (await isLocked('hero')) {
      // Hold _starting through the purchase flow so a rapid second tap
      // can't fire a second prompt. featureFlags.attemptPurchase has its
      // own single-flight guard as belt-and-suspenders for v1.1's async
      // RevenueCat flow.
      await attemptPurchase();
      _starting = false;
      return;
    }
    _ended = false;
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('heroStopBtn').addEventListener('click', endGame);

  document.getElementById('heroCancelBtn').addEventListener('click', () => {
    clearAll();
    releaseWakeLock();
    stopSpeechKeepalive();
    document.body.classList.remove('hero-bg');
    _starting = false;
    _ended = false;
    show('setup');
  });

  document.getElementById('heroAgainBtn').addEventListener('click', () => {
    cancelSpeech();
    clearAll();
    document.body.classList.remove('hero-bg');
    _ended = false;
    _starting = false;
    show('setup');
  });

  loadSettings();
}
