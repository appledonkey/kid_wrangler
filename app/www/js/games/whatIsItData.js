/* Data for the "What Is It?" emoji-quiz game.
 *
 * Includes animals (re-using animalsData), foods, household objects,
 * vehicles, nature, and sports. Total ~280 items across 6 + 1 categories,
 * every emoji unique across the full pool.
 *
 * Each entry can optionally carry grammar tags so the spoken reveal is
 * natural:
 *   article: 'an'      — vowel-start nouns ("It's an apple")
 *   plural: true       — pluralia tantum ("They're scissors")
 *   countable: false   — mass nouns ("It's milk")
 * See whatIsIt.js::revealPhrase for the rendering logic.
 */

import { ANIMALS } from './animalsData.js';

export const CATEGORIES = ['all', 'animals', 'food', 'objects', 'vehicles', 'nature', 'sports'];

export const CATEGORY_LABELS = {
  all: 'All',
  animals: 'Animals',
  food: 'Food',
  objects: 'Objects',
  vehicles: 'Vehicles',
  nature: 'Nature',
  sports: 'Sports',
};

const FOOD = [
  // Fruit
  { name: 'apple', emoji: '🍎', article: 'an' },
  { name: 'banana', emoji: '🍌' },
  { name: 'grapes', emoji: '🍇', plural: true },
  { name: 'strawberry', emoji: '🍓' },
  { name: 'watermelon', emoji: '🍉' },
  { name: 'orange', emoji: '🍊', article: 'an' },
  { name: 'lemon', emoji: '🍋' },
  { name: 'cherry', emoji: '🍒' },
  { name: 'pineapple', emoji: '🍍' },
  { name: 'kiwi', emoji: '🥝' },
  { name: 'mango', emoji: '🥭' },
  { name: 'coconut', emoji: '🥥' },
  { name: 'blueberries', emoji: '🫐', plural: true },
  // Veggies
  { name: 'avocado', emoji: '🥑', article: 'an' },
  { name: 'tomato', emoji: '🍅' },
  { name: 'corn', emoji: '🌽', countable: false },
  { name: 'carrot', emoji: '🥕' },
  { name: 'broccoli', emoji: '🥦', countable: false },
  { name: 'cucumber', emoji: '🥒' },
  { name: 'eggplant', emoji: '🍆', article: 'an' },
  { name: 'potato', emoji: '🥔' },
  { name: 'onion', emoji: '🧅', article: 'an' },
  { name: 'mushroom', emoji: '🍄' },
  { name: 'chili pepper', emoji: '🌶️' },
  // Meals
  { name: 'pizza', emoji: '🍕' },
  { name: 'hamburger', emoji: '🍔' },
  { name: 'taco', emoji: '🌮' },
  { name: 'burrito', emoji: '🌯' },
  { name: 'hot dog', emoji: '🌭' },
  { name: 'sandwich', emoji: '🥪' },
  { name: 'spaghetti', emoji: '🍝', countable: false },
  { name: 'sushi', emoji: '🍣', countable: false },
  { name: 'ramen', emoji: '🍜', countable: false },
  { name: 'dumpling', emoji: '🥟' },
  { name: 'rice ball', emoji: '🍙' },
  { name: 'salad', emoji: '🥗' },
  { name: 'fries', emoji: '🍟', plural: true },
  { name: 'steak', emoji: '🥩' },
  { name: 'chicken leg', emoji: '🍗' },
  { name: 'bacon', emoji: '🥓', countable: false },
  { name: 'fried egg', emoji: '🍳' },
  { name: 'egg', emoji: '🥚', article: 'an' },
  { name: 'bread', emoji: '🍞', countable: false },
  { name: 'croissant', emoji: '🥐' },
  { name: 'pancakes', emoji: '🥞', plural: true },
  { name: 'waffle', emoji: '🧇' },
  { name: 'cheese', emoji: '🧀', countable: false },
  // Sweets & drinks
  { name: 'donut', emoji: '🍩' },
  { name: 'cookie', emoji: '🍪' },
  { name: 'cake', emoji: '🍰' },
  { name: 'birthday cake', emoji: '🎂' },
  { name: 'cupcake', emoji: '🧁' },
  { name: 'pie', emoji: '🥧' },
  { name: 'ice cream', emoji: '🍦', article: 'an' },
  { name: 'lollipop', emoji: '🍭' },
  { name: 'chocolate', emoji: '🍫', countable: false },
  { name: 'popcorn', emoji: '🍿', countable: false },
  { name: 'milk', emoji: '🥛', countable: false },
  { name: 'juice', emoji: '🧃', countable: false },
  { name: 'tea', emoji: '🍵', countable: false },
];

const OBJECTS = [
  // Around the house
  { name: 'house', emoji: '🏠' },
  { name: 'castle', emoji: '🏰' },
  { name: 'tent', emoji: '⛺' },
  { name: 'bathtub', emoji: '🛁' },
  { name: 'light bulb', emoji: '💡' },
  { name: 'clock', emoji: '⏰' },
  { name: 'toothbrush', emoji: '🪥' },
  { name: 'broom', emoji: '🧹' },
  // School & art
  { name: 'book', emoji: '📚' },
  { name: 'pencil', emoji: '✏️' },
  { name: 'crayon', emoji: '🖍️' },
  { name: 'paint palette', emoji: '🎨' },
  { name: 'scissors', emoji: '✂️', plural: true },
  { name: 'backpack', emoji: '🎒' },
  // Tools & science
  { name: 'hammer', emoji: '🔨' },
  { name: 'axe', emoji: '🪓', article: 'an' },
  { name: 'ladder', emoji: '🪜' },
  { name: 'magnet', emoji: '🧲' },
  { name: 'telescope', emoji: '🔭' },
  { name: 'microscope', emoji: '🔬' },
  { name: 'fire extinguisher', emoji: '🧯' },
  { name: 'map', emoji: '🗺️' },
  { name: 'compass', emoji: '🧭' },
  { name: 'megaphone', emoji: '📢' },
  // Music
  { name: 'guitar', emoji: '🎸' },
  { name: 'drum', emoji: '🥁' },
  { name: 'trumpet', emoji: '🎺' },
  { name: 'saxophone', emoji: '🎷' },
  { name: 'violin', emoji: '🎻' },
  { name: 'piano', emoji: '🎹' },
  { name: 'microphone', emoji: '🎤' },
  { name: 'headphones', emoji: '🎧', plural: true },
  // Clothing
  { name: 'cap', emoji: '🧢' },
  { name: 'top hat', emoji: '🎩' },
  { name: 'sun hat', emoji: '👒' },
  { name: 'crown', emoji: '👑' },
  { name: 'helmet', emoji: '⛑️' },
  { name: 'glasses', emoji: '👓', plural: true },
  { name: 'sunglasses', emoji: '🕶️', plural: true },
  { name: 'boot', emoji: '👢' },
  { name: 'gloves', emoji: '🧤', plural: true },
  { name: 'socks', emoji: '🧦', plural: true },
  // Tech
  { name: 'phone', emoji: '📱' },
  { name: 'camera', emoji: '📷' },
  { name: 'TV', emoji: '📺' },
  { name: 'laptop', emoji: '💻' },
  { name: 'watch', emoji: '⌚' },
  { name: 'game controller', emoji: '🎮' },
  // Toys & party
  { name: 'teddy bear', emoji: '🧸' },
  { name: 'balloon', emoji: '🎈' },
  { name: 'kite', emoji: '🪁' },
  { name: 'gift', emoji: '🎁' },
  { name: 'dice', emoji: '🎲' },
  { name: 'puzzle piece', emoji: '🧩' },
  { name: 'yo-yo', emoji: '🪀' },
  { name: 'piñata', emoji: '🪅' },
  { name: 'umbrella', emoji: '☂️', article: 'an' },
  { name: 'parachute', emoji: '🪂' },
  // Treasure & rewards
  { name: 'diamond', emoji: '💎' },
  { name: 'ring', emoji: '💍' },
  { name: 'trophy', emoji: '🏆' },
  // Fantastical
  { name: 'dragon', emoji: '🐉' },
  { name: 'unicorn', emoji: '🦄' },
  { name: 'alien', emoji: '👽', article: 'an' },
  { name: 'robot', emoji: '🤖' },
  { name: 'magic wand', emoji: '🪄' },
  { name: 'jack-o-lantern', emoji: '🎃', article: 'a' },
  { name: 'snowman', emoji: '⛄' },
  // Spectacle
  { name: 'roller coaster', emoji: '🎢' },
  { name: 'disco ball', emoji: '🪩' },
  { name: 'pirate flag', emoji: '🏴‍☠️' },
  { name: 'dynamite', emoji: '🧨' },
];

const VEHICLES = [
  { name: 'car', emoji: '🚗' },
  { name: 'police car', emoji: '🚓' },
  { name: 'fire truck', emoji: '🚒' },
  { name: 'ambulance', emoji: '🚑', article: 'an' },
  { name: 'truck', emoji: '🚚' },
  { name: 'race car', emoji: '🏎️' },
  { name: 'tractor', emoji: '🚜' },
  { name: 'bicycle', emoji: '🚲' },
  { name: 'scooter', emoji: '🛵' },
  { name: 'motorcycle', emoji: '🏍️' },
  { name: 'train', emoji: '🚂' },
  { name: 'airplane', emoji: '✈️', article: 'an' },
  { name: 'helicopter', emoji: '🚁' },
  { name: 'rocket', emoji: '🚀' },
  { name: 'UFO', emoji: '🛸', article: 'a' },
  { name: 'speedboat', emoji: '🚤' },
  { name: 'sailboat', emoji: '⛵' },
  { name: 'canoe', emoji: '🛶' },
  { name: 'ship', emoji: '🚢' },
];

const NATURE = [
  // Sky
  { name: 'sun', emoji: '☀️' },
  { name: 'moon', emoji: '🌙' },
  { name: 'star', emoji: '⭐' },
  { name: 'cloud', emoji: '☁️' },
  { name: 'rainbow', emoji: '🌈' },
  { name: 'sunrise', emoji: '🌅' },
  { name: 'earth', emoji: '🌍', article: 'an' },
  { name: 'planet', emoji: '🪐' },
  { name: 'comet', emoji: '☄️' },
  // Weather
  { name: 'snowflake', emoji: '❄️' },
  { name: 'lightning', emoji: '⚡', countable: false },
  { name: 'fire', emoji: '🔥' },
  { name: 'water drop', emoji: '💧' },
  { name: 'rain cloud', emoji: '🌧️' },
  // Plants
  { name: 'tree', emoji: '🌳' },
  { name: 'palm tree', emoji: '🌴' },
  { name: 'cactus', emoji: '🌵' },
  { name: 'flower', emoji: '🌸' },
  { name: 'rose', emoji: '🌹' },
  { name: 'sunflower', emoji: '🌻' },
  { name: 'maple leaf', emoji: '🍁' },
  { name: 'fallen leaves', emoji: '🍂', plural: true },
  // Land & sea
  { name: 'mountain', emoji: '⛰️' },
  { name: 'volcano', emoji: '🌋' },
  { name: 'ocean wave', emoji: '🌊', article: 'an' },
];

const SPORTS = [
  { name: 'soccer ball', emoji: '⚽' },
  { name: 'baseball', emoji: '⚾' },
  { name: 'basketball', emoji: '🏀' },
  { name: 'football', emoji: '🏈' },
  { name: 'tennis ball', emoji: '🎾' },
  { name: 'volleyball', emoji: '🏐' },
  { name: 'ping pong', emoji: '🏓', countable: false },
  { name: 'badminton', emoji: '🏸', countable: false },
  { name: 'frisbee', emoji: '🥏' },
  { name: 'bowling', emoji: '🎳', countable: false },
  { name: 'golf', emoji: '⛳', countable: false },
  { name: 'hockey', emoji: '🏒', countable: false },
  { name: 'ice skate', emoji: '⛸️', article: 'an' },
];

// Tag every entry with a category and merge into one flat pool.
// Carry the `article` field through from animalsData so "an owl" / "an
// octopus" / "an elephant" reveal cleanly.
const ANIMAL_ITEMS = ANIMALS.map((a) => ({
  name: a.name,
  emoji: a.emoji,
  category: 'animals',
  ...(a.article ? { article: a.article } : {}),
}));
const FOOD_ITEMS    = FOOD.map((x)    => ({ ...x, category: 'food' }));
const OBJECT_ITEMS  = OBJECTS.map((x) => ({ ...x, category: 'objects' }));
const VEHICLE_ITEMS = VEHICLES.map((x)=> ({ ...x, category: 'vehicles' }));
const NATURE_ITEMS  = NATURE.map((x)  => ({ ...x, category: 'nature' }));
const SPORT_ITEMS   = SPORTS.map((x)  => ({ ...x, category: 'sports' }));

export const ITEMS = [
  ...ANIMAL_ITEMS,
  ...FOOD_ITEMS,
  ...OBJECT_ITEMS,
  ...VEHICLE_ITEMS,
  ...NATURE_ITEMS,
  ...SPORT_ITEMS,
];

export function itemsIn(category) {
  if (category === 'all') return ITEMS;
  return ITEMS.filter((i) => i.category === category);
}
