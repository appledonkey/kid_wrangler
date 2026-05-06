/* Shared UI helpers: screen routing, option pickers, shuffle queue.
 *
 * Why a shuffle queue? BUILD_SPEC #7: every game with a prompt list
 * must use a shuffled queue that exhausts before reshuffling, NOT
 * "random with last-pick check." Use `makeQueue(getPool)` for any
 * such list and the prompts won't repeat until the pool is exhausted.
 */

export const screens = {};

const SCREEN_IDS = [
  ['setup', 'setupScreen'],
  ['hide', 'hideScreen'],
  ['seek', 'seekScreen'],
  ['found', 'foundScreen'],
  ['rlglCountdown', 'rlglCountdownScreen'],
  ['rlglGame', 'rlglGameScreen'],
  ['rlglEnd', 'rlglEndScreen'],
  ['actionCountdown', 'actionCountdownScreen'],
  ['actionGame', 'actionGameScreen'],
  ['actionEnd', 'actionEndScreen'],
  ['heroCountdown', 'heroCountdownScreen'],
  ['heroGame', 'heroGameScreen'],
  ['heroEnd', 'heroEndScreen'],
  ['simonCountdown', 'simonCountdownScreen'],
  ['simonGame', 'simonGameScreen'],
  ['simonEnd', 'simonEndScreen'],
  ['danceCountdown', 'danceCountdownScreen'],
  ['danceGame', 'danceGameScreen'],
  ['danceEnd', 'danceEndScreen'],
  ['charadesGame', 'charadesGameScreen'],
  ['charadesEnd', 'charadesEndScreen'],
  ['whatIsItGame', 'whatIsItGameScreen'],
  ['whatIsItEnd', 'whatIsItEndScreen'],
  ['missionCountdown', 'missionCountdownScreen'],
  ['missionGame', 'missionGameScreen'],
  ['missionEnd', 'missionEndScreen'],
  ['guessGame', 'guessGameScreen'],
  ['guessEnd', 'guessEndScreen'],
];

export function initScreens() {
  for (const [name, id] of SCREEN_IDS) {
    screens[name] = document.getElementById(id);
  }
}

export function show(name) {
  for (const key in screens) {
    if (screens[key]) screens[key].classList.remove('active');
  }
  if (screens[name]) screens[name].classList.add('active');
}

export function isActiveScreen(name) {
  return !!screens[name] && screens[name].classList.contains('active');
}

/**
 * Wire up an .options container of .opt buttons so that clicking one
 * marks it selected and invokes onSelect with the data-val.
 */
export function setupOpts(containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      container
        .querySelectorAll('.opt')
        .forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(btn.dataset.val);
    });
  });
}

export function setupToggle(toggleId, onChange) {
  const el = document.getElementById(toggleId);
  if (!el) return;
  // Make the entire toggle-wrap clickable, not just the small slider — much
  // easier to hit on phones. Falls back to the slider element if there's no
  // wrapper (defensive).
  const target = el.closest('.toggle-wrap') || el;
  target.style.cursor = 'pointer';
  target.addEventListener('click', () => {
    const on = el.classList.toggle('on');
    onChange(on);
  });
}

export function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns a queue object that yields each item in `getPool()` exactly
 * once before reshuffling. If the pool changes (different reference),
 * the queue resets.
 *
 * Usage:
 *   const q = makeQueue(() => HERO_POWERS.classic);
 *   q.next();   // -> some power
 *   q.next();   // -> a different power, until exhausted
 */
export function makeQueue(getPool) {
  let queue = [];
  let lastPick = null;
  let lastPoolRef = null;
  return {
    next() {
      const pool = getPool();
      if (!pool || pool.length === 0) return null;
      if (pool !== lastPoolRef) {
        lastPoolRef = pool;
        queue = [];
      }
      if (queue.length === 0) {
        queue = shuffleArray(pool);
        // Avoid the new first item being the same as the last picked,
        // when the pool is big enough to swap.
        if (lastPick && queue.length > 1 && queue[0] === lastPick) {
          [queue[0], queue[1]] = [queue[1], queue[0]];
        }
      }
      const pick = queue.shift();
      lastPick = pick;
      return pick;
    },
    reset() {
      queue = [];
      lastPick = null;
      lastPoolRef = null;
    },
  };
}

/** Re-trigger CSS animation on an element by toggling class then forcing reflow. */
export function retriggerAnim(...elements) {
  for (const el of elements) {
    if (!el) continue;
    el.style.animation = 'none';
    /* force reflow */
    void el.offsetWidth;
    el.style.animation = '';
  }
}
