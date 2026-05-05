/* Data for the "What Is It?" emoji-quiz game.
 *
 * Includes animals (re-using animalsData), foods, household objects,
 * vehicles, and nature. Total ~165 items across 5 + 1 categories.
 */

import { ANIMALS } from './animalsData.js';

export const CATEGORIES = ['all', 'animals', 'food', 'objects', 'vehicles', 'nature'];

export const CATEGORY_LABELS = {
  all: 'All',
  animals: 'Animals',
  food: 'Food',
  objects: 'Objects',
  vehicles: 'Vehicles',
  nature: 'Nature',
};

const FOOD = [
  { name: 'apple', emoji: '🍎' },
  { name: 'banana', emoji: '🍌' },
  { name: 'grapes', emoji: '🍇' },
  { name: 'strawberry', emoji: '🍓' },
  { name: 'watermelon', emoji: '🍉' },
  { name: 'orange', emoji: '🍊' },
  { name: 'lemon', emoji: '🍋' },
  { name: 'peach', emoji: '🍑' },
  { name: 'cherry', emoji: '🍒' },
  { name: 'avocado', emoji: '🥑' },
  { name: 'tomato', emoji: '🍅' },
  { name: 'corn', emoji: '🌽' },
  { name: 'carrot', emoji: '🥕' },
  { name: 'broccoli', emoji: '🥦' },
  { name: 'cucumber', emoji: '🥒' },
  { name: 'pizza', emoji: '🍕' },
  { name: 'hamburger', emoji: '🍔' },
  { name: 'taco', emoji: '🌮' },
  { name: 'hot dog', emoji: '🌭' },
  { name: 'sandwich', emoji: '🥪' },
  { name: 'spaghetti', emoji: '🍝' },
  { name: 'sushi', emoji: '🍣' },
  { name: 'fried egg', emoji: '🍳' },
  { name: 'bread', emoji: '🍞' },
  { name: 'cheese', emoji: '🧀' },
  { name: 'donut', emoji: '🍩' },
  { name: 'cookie', emoji: '🍪' },
  { name: 'cake', emoji: '🍰' },
  { name: 'birthday cake', emoji: '🎂' },
  { name: 'ice cream', emoji: '🍦' },
  { name: 'lollipop', emoji: '🍭' },
  { name: 'chocolate', emoji: '🍫' },
  { name: 'popcorn', emoji: '🍿' },
  { name: 'milk', emoji: '🥛' },
  { name: 'juice', emoji: '🧃' },
];

const OBJECTS = [
  { name: 'house', emoji: '🏠' },
  { name: 'door', emoji: '🚪' },
  { name: 'chair', emoji: '🪑' },
  { name: 'bed', emoji: '🛏️' },
  { name: 'bathtub', emoji: '🛁' },
  { name: 'book', emoji: '📚' },
  { name: 'pencil', emoji: '✏️' },
  { name: 'crayon', emoji: '🖍️' },
  { name: 'paint palette', emoji: '🎨' },
  { name: 'light bulb', emoji: '💡' },
  { name: 'window', emoji: '🪟' },
  { name: 'key', emoji: '🔑' },
  { name: 'hammer', emoji: '🔨' },
  { name: 'broom', emoji: '🧹' },
  { name: 'toothbrush', emoji: '🪥' },
  { name: 'soap', emoji: '🧼' },
  { name: 'backpack', emoji: '🎒' },
  { name: 'teddy bear', emoji: '🧸' },
  { name: 'soccer ball', emoji: '⚽' },
  { name: 'balloon', emoji: '🎈' },
  { name: 'kite', emoji: '🪁' },
  { name: 'gift', emoji: '🎁' },
  { name: 'dice', emoji: '🎲' },
  { name: 'puzzle piece', emoji: '🧩' },
  { name: 'yo-yo', emoji: '🪀' },
  { name: 'glasses', emoji: '👓' },
  { name: 'crown', emoji: '👑' },
  { name: 'umbrella', emoji: '☂️' },
  { name: 'clock', emoji: '⏰' },
  { name: 'phone', emoji: '📱' },
];

const VEHICLES = [
  { name: 'car', emoji: '🚗' },
  { name: 'taxi', emoji: '🚕' },
  { name: 'bus', emoji: '🚌' },
  { name: 'police car', emoji: '🚓' },
  { name: 'fire truck', emoji: '🚒' },
  { name: 'ambulance', emoji: '🚑' },
  { name: 'truck', emoji: '🚚' },
  { name: 'tractor', emoji: '🚜' },
  { name: 'bicycle', emoji: '🚲' },
  { name: 'scooter', emoji: '🛵' },
  { name: 'motorcycle', emoji: '🏍️' },
  { name: 'train', emoji: '🚂' },
  { name: 'airplane', emoji: '✈️' },
  { name: 'helicopter', emoji: '🚁' },
  { name: 'rocket', emoji: '🚀' },
  { name: 'speedboat', emoji: '🚤' },
  { name: 'sailboat', emoji: '⛵' },
  { name: 'ship', emoji: '🚢' },
];

const NATURE = [
  { name: 'sun', emoji: '☀️' },
  { name: 'moon', emoji: '🌙' },
  { name: 'star', emoji: '⭐' },
  { name: 'cloud', emoji: '☁️' },
  { name: 'rainbow', emoji: '🌈' },
  { name: 'snowflake', emoji: '❄️' },
  { name: 'lightning', emoji: '⚡' },
  { name: 'fire', emoji: '🔥' },
  { name: 'tree', emoji: '🌳' },
  { name: 'cactus', emoji: '🌵' },
  { name: 'flower', emoji: '🌸' },
  { name: 'rose', emoji: '🌹' },
  { name: 'tulip', emoji: '🌷' },
  { name: 'sunflower', emoji: '🌻' },
  { name: 'mountain', emoji: '⛰️' },
  { name: 'volcano', emoji: '🌋' },
  { name: 'ocean wave', emoji: '🌊' },
  { name: 'leaf', emoji: '🍃' },
];

// Tag every entry with a category and merge into one flat pool.
const ANIMAL_ITEMS = ANIMALS.map((a) => ({
  name: a.name, emoji: a.emoji, category: 'animals',
}));
const FOOD_ITEMS    = FOOD.map((x)    => ({ ...x, category: 'food' }));
const OBJECT_ITEMS  = OBJECTS.map((x) => ({ ...x, category: 'objects' }));
const VEHICLE_ITEMS = VEHICLES.map((x)=> ({ ...x, category: 'vehicles' }));
const NATURE_ITEMS  = NATURE.map((x)  => ({ ...x, category: 'nature' }));

export const ITEMS = [
  ...ANIMAL_ITEMS,
  ...FOOD_ITEMS,
  ...OBJECT_ITEMS,
  ...VEHICLE_ITEMS,
  ...NATURE_ITEMS,
];

export function itemsIn(category) {
  if (category === 'all') return ITEMS;
  return ITEMS.filter((i) => i.category === category);
}
