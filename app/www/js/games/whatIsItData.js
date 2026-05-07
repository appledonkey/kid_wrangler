/* Data for the "What Is It?" emoji-quiz game.
 *
 * Includes animals (re-using animalsData), foods, household objects,
 * vehicles, nature, and sports. Total ~280 items across 6 + 1 categories,
 * every emoji unique across the full pool.
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
  { name: 'apple', emoji: '🍎' },
  { name: 'banana', emoji: '🍌' },
  { name: 'grapes', emoji: '🍇' },
  { name: 'strawberry', emoji: '🍓' },
  { name: 'watermelon', emoji: '🍉' },
  { name: 'orange', emoji: '🍊' },
  { name: 'lemon', emoji: '🍋' },
  { name: 'peach', emoji: '🍑' },
  { name: 'cherry', emoji: '🍒' },
  { name: 'pear', emoji: '🍐' },
  { name: 'pineapple', emoji: '🍍' },
  { name: 'kiwi', emoji: '🥝' },
  { name: 'mango', emoji: '🥭' },
  { name: 'coconut', emoji: '🥥' },
  { name: 'blueberries', emoji: '🫐' },
  // Veggies
  { name: 'avocado', emoji: '🥑' },
  { name: 'tomato', emoji: '🍅' },
  { name: 'corn', emoji: '🌽' },
  { name: 'carrot', emoji: '🥕' },
  { name: 'broccoli', emoji: '🥦' },
  { name: 'cucumber', emoji: '🥒' },
  { name: 'eggplant', emoji: '🍆' },
  { name: 'potato', emoji: '🥔' },
  { name: 'onion', emoji: '🧅' },
  { name: 'garlic', emoji: '🧄' },
  { name: 'mushroom', emoji: '🍄' },
  { name: 'chili pepper', emoji: '🌶️' },
  { name: 'bell pepper', emoji: '🫑' },
  // Meals
  { name: 'pizza', emoji: '🍕' },
  { name: 'hamburger', emoji: '🍔' },
  { name: 'taco', emoji: '🌮' },
  { name: 'burrito', emoji: '🌯' },
  { name: 'hot dog', emoji: '🌭' },
  { name: 'sandwich', emoji: '🥪' },
  { name: 'spaghetti', emoji: '🍝' },
  { name: 'sushi', emoji: '🍣' },
  { name: 'ramen', emoji: '🍜' },
  { name: 'dumpling', emoji: '🥟' },
  { name: 'rice ball', emoji: '🍙' },
  { name: 'salad', emoji: '🥗' },
  { name: 'fries', emoji: '🍟' },
  { name: 'steak', emoji: '🥩' },
  { name: 'chicken leg', emoji: '🍗' },
  { name: 'bacon', emoji: '🥓' },
  { name: 'fried egg', emoji: '🍳' },
  { name: 'egg', emoji: '🥚' },
  { name: 'bread', emoji: '🍞' },
  { name: 'croissant', emoji: '🥐' },
  { name: 'bagel', emoji: '🥯' },
  { name: 'pancakes', emoji: '🥞' },
  { name: 'waffle', emoji: '🧇' },
  { name: 'cheese', emoji: '🧀' },
  // Sweets & drinks
  { name: 'donut', emoji: '🍩' },
  { name: 'cookie', emoji: '🍪' },
  { name: 'cake', emoji: '🍰' },
  { name: 'birthday cake', emoji: '🎂' },
  { name: 'cupcake', emoji: '🧁' },
  { name: 'pie', emoji: '🥧' },
  { name: 'ice cream', emoji: '🍦' },
  { name: 'lollipop', emoji: '🍭' },
  { name: 'chocolate', emoji: '🍫' },
  { name: 'popcorn', emoji: '🍿' },
  { name: 'milk', emoji: '🥛' },
  { name: 'juice', emoji: '🧃' },
  { name: 'tea', emoji: '🍵' },
];

const OBJECTS = [
  // Around the house
  { name: 'house', emoji: '🏠' },
  { name: 'castle', emoji: '🏰' },
  { name: 'tent', emoji: '⛺' },
  { name: 'door', emoji: '🚪' },
  { name: 'chair', emoji: '🪑' },
  { name: 'bed', emoji: '🛏️' },
  { name: 'bathtub', emoji: '🛁' },
  { name: 'window', emoji: '🪟' },
  { name: 'light bulb', emoji: '💡' },
  { name: 'clock', emoji: '⏰' },
  { name: 'key', emoji: '🔑' },
  { name: 'soap', emoji: '🧼' },
  { name: 'toothbrush', emoji: '🪥' },
  { name: 'broom', emoji: '🧹' },
  { name: 'bucket', emoji: '🪣' },
  // School & art
  { name: 'book', emoji: '📚' },
  { name: 'pencil', emoji: '✏️' },
  { name: 'crayon', emoji: '🖍️' },
  { name: 'paint palette', emoji: '🎨' },
  { name: 'ruler', emoji: '📏' },
  { name: 'scissors', emoji: '✂️' },
  { name: 'backpack', emoji: '🎒' },
  // Tools & science
  { name: 'hammer', emoji: '🔨' },
  { name: 'wrench', emoji: '🔧' },
  { name: 'screwdriver', emoji: '🪛' },
  { name: 'saw', emoji: '🪚' },
  { name: 'axe', emoji: '🪓' },
  { name: 'ladder', emoji: '🪜' },
  { name: 'magnet', emoji: '🧲' },
  { name: 'telescope', emoji: '🔭' },
  { name: 'microscope', emoji: '🔬' },
  { name: 'fire extinguisher', emoji: '🧯' },
  { name: 'map', emoji: '🗺️' },
  { name: 'compass', emoji: '🧭' },
  // Music
  { name: 'guitar', emoji: '🎸' },
  { name: 'drum', emoji: '🥁' },
  { name: 'trumpet', emoji: '🎺' },
  { name: 'saxophone', emoji: '🎷' },
  { name: 'violin', emoji: '🎻' },
  { name: 'piano', emoji: '🎹' },
  { name: 'microphone', emoji: '🎤' },
  { name: 'headphones', emoji: '🎧' },
  // Clothing
  { name: 'cap', emoji: '🧢' },
  { name: 'top hat', emoji: '🎩' },
  { name: 'sun hat', emoji: '👒' },
  { name: 'crown', emoji: '👑' },
  { name: 'helmet', emoji: '⛑️' },
  { name: 'glasses', emoji: '👓' },
  { name: 'sunglasses', emoji: '🕶️' },
  { name: 'sneaker', emoji: '👟' },
  { name: 'boot', emoji: '👢' },
  { name: 'gloves', emoji: '🧤' },
  { name: 'socks', emoji: '🧦' },
  { name: 'scarf', emoji: '🧣' },
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
  { name: 'ribbon', emoji: '🎀' },
  { name: 'umbrella', emoji: '☂️' },
  // Treasure
  { name: 'diamond', emoji: '💎' },
  { name: 'ring', emoji: '💍' },
  { name: 'coin', emoji: '🪙' },
];

const VEHICLES = [
  { name: 'car', emoji: '🚗' },
  { name: 'taxi', emoji: '🚕' },
  { name: 'bus', emoji: '🚌' },
  { name: 'police car', emoji: '🚓' },
  { name: 'fire truck', emoji: '🚒' },
  { name: 'ambulance', emoji: '🚑' },
  { name: 'truck', emoji: '🚚' },
  { name: 'pickup', emoji: '🛻' },
  { name: 'minivan', emoji: '🚐' },
  { name: 'race car', emoji: '🏎️' },
  { name: 'tractor', emoji: '🚜' },
  { name: 'bicycle', emoji: '🚲' },
  { name: 'scooter', emoji: '🛵' },
  { name: 'motorcycle', emoji: '🏍️' },
  { name: 'sled', emoji: '🛷' },
  { name: 'train', emoji: '🚂' },
  { name: 'airplane', emoji: '✈️' },
  { name: 'helicopter', emoji: '🚁' },
  { name: 'rocket', emoji: '🚀' },
  { name: 'UFO', emoji: '🛸' },
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
  { name: 'earth', emoji: '🌍' },
  { name: 'planet', emoji: '🪐' },
  { name: 'comet', emoji: '☄️' },
  // Weather
  { name: 'snowflake', emoji: '❄️' },
  { name: 'lightning', emoji: '⚡' },
  { name: 'fire', emoji: '🔥' },
  { name: 'water drop', emoji: '💧' },
  { name: 'rain cloud', emoji: '🌧️' },
  // Plants
  { name: 'tree', emoji: '🌳' },
  { name: 'palm tree', emoji: '🌴' },
  { name: 'cactus', emoji: '🌵' },
  { name: 'flower', emoji: '🌸' },
  { name: 'rose', emoji: '🌹' },
  { name: 'tulip', emoji: '🌷' },
  { name: 'sunflower', emoji: '🌻' },
  { name: 'leaf', emoji: '🍃' },
  { name: 'maple leaf', emoji: '🍁' },
  { name: 'fallen leaves', emoji: '🍂' },
  { name: 'seedling', emoji: '🌱' },
  { name: 'clover', emoji: '☘️' },
  { name: 'wheat', emoji: '🌾' },
  // Land & sea
  { name: 'mountain', emoji: '⛰️' },
  { name: 'volcano', emoji: '🌋' },
  { name: 'ocean wave', emoji: '🌊' },
  { name: 'rock', emoji: '🪨' },
];

const SPORTS = [
  { name: 'soccer ball', emoji: '⚽' },
  { name: 'baseball', emoji: '⚾' },
  { name: 'basketball', emoji: '🏀' },
  { name: 'football', emoji: '🏈' },
  { name: 'tennis ball', emoji: '🎾' },
  { name: 'volleyball', emoji: '🏐' },
  { name: 'ping pong', emoji: '🏓' },
  { name: 'badminton', emoji: '🏸' },
  { name: 'frisbee', emoji: '🥏' },
  { name: 'bowling', emoji: '🎳' },
  { name: 'golf', emoji: '⛳' },
  { name: 'hockey', emoji: '🏒' },
  { name: 'ice skate', emoji: '⛸️' },
];

// Tag every entry with a category and merge into one flat pool.
const ANIMAL_ITEMS = ANIMALS.map((a) => ({
  name: a.name, emoji: a.emoji, category: 'animals',
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
