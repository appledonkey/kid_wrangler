/* Shared animal data, used by Animal Charades.
 *
 * Flat array of animals, each with a UNIQUE emoji. Each entry has:
 *   name      — display name and the slug used in voice ("Act like a <name>")
 *   emoji     — visual icon (no duplicates across the pool)
 *   category  — one of CATEGORIES (used by Charades' habitat picker)
 *   sound     — (optional) key into animalSounds.js for the Charades sound-hint
 *               toggle; only animals with a procedural sound effect have it.
 */

export const CATEGORIES = [
  'all', 'farm', 'wild', 'ocean', 'forest', 'arctic', 'backyard', 'dinosaurs',
];

export const CATEGORY_LABELS = {
  all: 'All habitats',
  farm: 'Farm',
  wild: 'Wild & jungle',
  ocean: 'Ocean',
  forest: 'Forest',
  arctic: 'Arctic',
  backyard: 'Backyard & bugs',
  dinosaurs: 'Dinosaurs',
};

export const ANIMALS = [
  // Farm (12)
  { name: 'cow',     emoji: '🐄', category: 'farm',    sound: 'cow' },
  { name: 'pig',     emoji: '🐷', category: 'farm',    sound: 'pig' },
  { name: 'sheep',   emoji: '🐑', category: 'farm',    sound: 'sheep' },
  { name: 'horse',   emoji: '🐴', category: 'farm',    sound: 'horse' },
  { name: 'chicken', emoji: '🐔', category: 'farm',    sound: 'chicken' },
  { name: 'duck',    emoji: '🦆', category: 'farm',    sound: 'duck' },
  { name: 'donkey',  emoji: '🫏', category: 'farm',    sound: 'donkey' },
  { name: 'turkey',  emoji: '🦃', category: 'farm',    sound: 'turkey' },
  { name: 'rooster', emoji: '🐓', category: 'farm',    sound: 'rooster' },
  { name: 'goat',    emoji: '🐐', category: 'farm' },
  { name: 'llama',   emoji: '🦙', category: 'farm' },
  { name: 'bull',    emoji: '🐂', category: 'farm' },

  // Wild & jungle (20)
  { name: 'lion',      emoji: '🦁', category: 'wild', sound: 'lion' },
  { name: 'tiger',     emoji: '🐅', category: 'wild' },
  { name: 'elephant',  emoji: '🐘', category: 'wild', sound: 'elephant' },
  { name: 'monkey',    emoji: '🐒', category: 'wild', sound: 'monkey' },
  { name: 'gorilla',   emoji: '🦍', category: 'wild' },
  { name: 'jaguar',    emoji: '🐆', category: 'wild' },
  { name: 'parrot',    emoji: '🦜', category: 'wild' },
  { name: 'sloth',     emoji: '🦥', category: 'wild' },
  { name: 'orangutan', emoji: '🦧', category: 'wild' },
  { name: 'panda',     emoji: '🐼', category: 'wild' },
  { name: 'hippo',     emoji: '🦛', category: 'wild' },
  { name: 'rhino',     emoji: '🦏', category: 'wild' },
  { name: 'giraffe',   emoji: '🦒', category: 'wild' },
  { name: 'zebra',     emoji: '🦓', category: 'wild' },
  { name: 'kangaroo',  emoji: '🦘', category: 'wild' },
  { name: 'crocodile', emoji: '🐊', category: 'wild' },
  { name: 'flamingo',  emoji: '🦩', category: 'wild' },
  { name: 'eagle',     emoji: '🦅', category: 'wild' },
  { name: 'bison',     emoji: '🦬', category: 'wild' },
  { name: 'peacock',   emoji: '🦚', category: 'wild' },

  // Ocean (12)
  { name: 'shark',         emoji: '🦈', category: 'ocean' },
  { name: 'whale',         emoji: '🐋', category: 'ocean' },
  { name: 'octopus',       emoji: '🐙', category: 'ocean' },
  { name: 'crab',          emoji: '🦀', category: 'ocean' },
  { name: 'dolphin',       emoji: '🐬', category: 'ocean' },
  { name: 'jellyfish',     emoji: '🪼', category: 'ocean' },
  { name: 'lobster',       emoji: '🦞', category: 'ocean' },
  { name: 'sea turtle',    emoji: '🐢', category: 'ocean' },
  { name: 'pufferfish',    emoji: '🐡', category: 'ocean' },
  { name: 'tropical fish', emoji: '🐠', category: 'ocean' },
  { name: 'shrimp',        emoji: '🦐', category: 'ocean' },
  { name: 'oyster',        emoji: '🦪', category: 'ocean' },

  // Forest (14)
  { name: 'wolf',     emoji: '🐺', category: 'forest', sound: 'wolf' },
  { name: 'bear',     emoji: '🐻', category: 'forest', sound: 'bear' },
  { name: 'fox',      emoji: '🦊', category: 'forest' },
  { name: 'owl',      emoji: '🦉', category: 'forest', sound: 'owl' },
  { name: 'deer',     emoji: '🦌', category: 'forest' },
  { name: 'squirrel', emoji: '🐿️', category: 'forest' },
  { name: 'raccoon',  emoji: '🦝', category: 'forest' },
  { name: 'beaver',   emoji: '🦫', category: 'forest' },
  { name: 'badger',   emoji: '🦡', category: 'forest' },
  { name: 'hedgehog', emoji: '🦔', category: 'forest' },
  { name: 'mouse',    emoji: '🐭', category: 'forest', sound: 'mouse' },
  { name: 'frog',     emoji: '🐸', category: 'forest', sound: 'frog' },
  { name: 'snake',    emoji: '🐍', category: 'forest', sound: 'snake' },
  { name: 'skunk',    emoji: '🦨', category: 'forest' },

  // Arctic (4) — Unicode is poor here; only entries with their own emoji
  { name: 'penguin',     emoji: '🐧',     category: 'arctic' },
  { name: 'polar bear',  emoji: '🐻‍❄️', category: 'arctic' },
  { name: 'seal',        emoji: '🦭',     category: 'arctic' },
  { name: 'mammoth',     emoji: '🦣',     category: 'arctic' },

  // Backyard & bugs (13)
  { name: 'cat',       emoji: '🐱',     category: 'backyard', sound: 'cat' },
  { name: 'dog',       emoji: '🐶',     category: 'backyard', sound: 'dog' },
  { name: 'rabbit',    emoji: '🐰',     category: 'backyard' },
  { name: 'hamster',   emoji: '🐹',     category: 'backyard' },
  { name: 'swan',      emoji: '🦢',     category: 'backyard' },
  { name: 'butterfly', emoji: '🦋',     category: 'backyard' },
  { name: 'ladybug',   emoji: '🐞',     category: 'backyard' },
  { name: 'ant',       emoji: '🐜',     category: 'backyard' },
  { name: 'snail',     emoji: '🐌',     category: 'backyard' },
  { name: 'spider',    emoji: '🕷️',    category: 'backyard' },
  { name: 'bee',       emoji: '🐝',     category: 'backyard', sound: 'bee' },
  { name: 'mosquito',  emoji: '🦟',     category: 'backyard' },
  { name: 'crow',      emoji: '🐦‍⬛', category: 'backyard', sound: 'crow' },

  // Dinosaurs (2) — Unicode only ships two distinct dino glyphs
  { name: 'T-rex',         emoji: '🦖', category: 'dinosaurs' },
  { name: 'brontosaurus',  emoji: '🦕', category: 'dinosaurs' },
];

/** Animals filtered by category. 'all' returns the whole pool. */
export function animalsIn(category) {
  if (category === 'all') return ANIMALS;
  return ANIMALS.filter((a) => a.category === category);
}
