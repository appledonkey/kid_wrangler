/* Data for the Weather Report game.
 *
 * WEATHER:   { text, emoji, category } — what the phone announces.
 * REACTIONS: { [category]: [ { text, emoji }, ... ] } — follow-up actions
 *            chained ~60% of the time after a weather call. Reactions are
 *            scoped to the same category so the call+reaction feels like a
 *            tiny themed scene ("Pouring rain!" → "Jump in muddy puddles!").
 *
 * Six categories, each with a body-bg class set by weatherReport.js:
 *   rain → rain-bg, cold → cold-bg, hot → hot-bg, wind → wind-bg,
 *   fog → fog-bg, special → special-bg
 */

export const WEATHER = [
  // Rain (12)
  { text: "It's raining!",            emoji: '🌧️',  category: 'rain' },
  { text: "It's pouring!",            emoji: '☔',   category: 'rain' },
  { text: 'Just a drizzle.',          emoji: '🌦️',  category: 'rain' },
  { text: 'Heavy downpour!',          emoji: '🌧️',  category: 'rain' },
  { text: 'Sun shower!',              emoji: '🌦️',  category: 'rain' },
  { text: 'Thunderstorm rolling in!', emoji: '⛈️',  category: 'rain' },
  { text: 'Light sprinkle.',          emoji: '🌦️',  category: 'rain' },
  { text: 'Pitter-patter rain.',      emoji: '🌧️',  category: 'rain' },
  { text: 'Storm warning!',           emoji: '⛈️',  category: 'rain' },
  { text: 'Steady rain all day.',     emoji: '🌧️',  category: 'rain' },
  { text: 'Dark clouds gathering.',   emoji: '☁️',   category: 'rain' },
  { text: 'Cloudburst!',              emoji: '⛈️',  category: 'rain' },

  // Cold (10)
  { text: 'Snow is falling!',         emoji: '🌨️',  category: 'cold' },
  { text: "It's snowing buckets!",    emoji: '❄️',  category: 'cold' },
  { text: 'Blizzard incoming!',       emoji: '🌨️',  category: 'cold' },
  { text: 'Frosty morning!',          emoji: '🥶',  category: 'cold' },
  { text: 'Hailstones!',              emoji: '🧊',  category: 'cold' },
  { text: 'Ice everywhere!',          emoji: '🧊',  category: 'cold' },
  { text: 'Big fluffy flakes!',       emoji: '❄️',  category: 'cold' },
  { text: 'Freezing rain!',           emoji: '❄️',  category: 'cold' },
  { text: 'Snowflakes drifting down.', emoji: '❄️', category: 'cold' },
  { text: 'Brrr — bundle up!',        emoji: '🥶',  category: 'cold' },

  // Hot (9)
  { text: 'Heatwave!',                emoji: '🥵',  category: 'hot' },
  { text: 'Scorching sun!',           emoji: '☀️',  category: 'hot' },
  { text: 'Sweltering hot!',          emoji: '🌡️',  category: 'hot' },
  { text: 'Sunny day!',               emoji: '☀️',  category: 'hot' },
  { text: 'Beach weather!',           emoji: '🏖️',  category: 'hot' },
  { text: 'Sizzling sidewalk!',       emoji: '🔥',  category: 'hot' },
  { text: "Sun's out, fun's out!",    emoji: '😎',  category: 'hot' },
  { text: 'Tropical sunshine!',       emoji: '🌴',  category: 'hot' },
  { text: 'Boiling hot!',             emoji: '🥵',  category: 'hot' },

  // Wind (9)
  { text: 'Windy day!',               emoji: '💨',  category: 'wind' },
  { text: 'Gusty wind!',              emoji: '💨',  category: 'wind' },
  { text: 'Tornado warning!',         emoji: '🌪️',  category: 'wind' },
  { text: 'Strong breeze!',           emoji: '🍃',  category: 'wind' },
  { text: 'Hurricane winds!',         emoji: '🌬️',  category: 'wind' },
  { text: 'Whirlwind!',               emoji: '🌪️',  category: 'wind' },
  { text: 'Leaves swirling!',         emoji: '🍂',  category: 'wind' },
  { text: 'Big puff of wind!',        emoji: '💨',  category: 'wind' },
  { text: 'Wind howling!',            emoji: '🌬️',  category: 'wind' },

  // Fog / humid (7)
  { text: 'Foggy morning!',           emoji: '🌫️',  category: 'fog' },
  { text: 'Misty meadow!',            emoji: '🌫️',  category: 'fog' },
  { text: 'Pea-soup fog!',            emoji: '🌫️',  category: 'fog' },
  { text: 'Steamy air!',              emoji: '♨️',  category: 'fog' },
  { text: 'Muggy and sticky!',        emoji: '💧',  category: 'fog' },
  { text: 'Humid heat!',              emoji: '🌡️',  category: 'fog' },
  { text: 'Hazy day!',                emoji: '🌫️',  category: 'fog' },

  // Special (8)
  { text: 'A rainbow!',               emoji: '🌈',  category: 'special' },
  { text: 'Double rainbow!',          emoji: '🌈',  category: 'special' },
  { text: 'Eye of the storm!',        emoji: '🌀',  category: 'special' },
  { text: 'Lightning strike!',        emoji: '⚡',  category: 'special' },
  { text: 'Solar eclipse!',           emoji: '🌑',  category: 'special' },
  { text: 'Aurora borealis!',         emoji: '🌌',  category: 'special' },
  { text: 'Meteor shower!',           emoji: '☄️',  category: 'special' },
  { text: 'Golden hour glow.',        emoji: '🌇',  category: 'special' },
];

export const REACTIONS = {
  rain: [
    { text: 'Jump in muddy puddles!',         emoji: '💦' },
    { text: 'Splash splash splash!',          emoji: '💧' },
    { text: 'Get out your umbrella!',         emoji: '☂️' },
    { text: 'Hop over the puddles!',          emoji: '🦘' },
    { text: 'Catch raindrops on your tongue!', emoji: '👅' },
    { text: 'Run for cover!',                 emoji: '🏃' },
    { text: 'Dance in the rain!',             emoji: '💃' },
    { text: 'Wiggle like a wet dog!',         emoji: '🐶' },
    { text: 'Squelch in the mud!',            emoji: '🟫' },
    { text: 'Look for a rainbow!',            emoji: '🌈' },
  ],
  cold: [
    { text: "Don't slip on the ice!",         emoji: '🧊' },
    { text: 'Build a snowman!',               emoji: '⛄' },
    { text: 'Throw a snowball!',              emoji: '☃️' },
    { text: 'Catch snowflakes on your tongue!', emoji: '👅' },
    { text: 'Shiver shiver shake!',           emoji: '🥶' },
    { text: 'Stomp through the snow!',        emoji: '👣' },
    { text: 'Slide on the ice!',              emoji: '⛸️' },
    { text: 'Make a snow angel!',             emoji: '😇' },
    { text: 'Skate skate skate!',             emoji: '⛸️' },
  ],
  hot: [
    { text: 'Melt like ice cream!',           emoji: '🍦' },
    { text: 'Fan yourself!',                  emoji: '🪭' },
    { text: 'Find some shade!',               emoji: '🌳' },
    { text: 'Drink a big cold drink!',        emoji: '🥤' },
    { text: 'Jump in the pool!',              emoji: '🏊' },
    { text: 'Sweat sweat sweat!',             emoji: '💦' },
    { text: 'Slap on the sunscreen!',         emoji: '🧴' },
    { text: 'Lay in the grass!',              emoji: '🌱' },
    { text: 'Sip some lemonade!',             emoji: '🍋' },
  ],
  wind: [
    { text: 'Hold onto your hat!',            emoji: '🧢' },
    { text: 'Fly like a kite!',               emoji: '🪁' },
    { text: 'Lean into the wind!',            emoji: '💨' },
    { text: 'Spin like a leaf!',              emoji: '🍃' },
    { text: 'Hair flying everywhere!',        emoji: '💇' },
    { text: 'Spread your arms — soar!',       emoji: '🪽' },
    { text: 'Hold tight to a tree!',          emoji: '🌳' },
    { text: 'Wobble side to side!',           emoji: '↔️' },
  ],
  fog: [
    { text: 'Walk veeery slowly!',            emoji: '🐌' },
    { text: 'Wave away the mist!',            emoji: '🙌' },
    { text: 'Wipe your foggy glasses!',       emoji: '👓' },
    { text: "Tippy-toe — can't see!",         emoji: '🤫' },
    { text: 'Swat the mosquitoes!',           emoji: '🦟' },
    { text: 'Take a deep humid breath!',      emoji: '😮‍💨' },
  ],
  special: [
    { text: 'Count the colors!',              emoji: '🔢' },
    { text: 'Make a wish!',                   emoji: '⭐' },
    { text: 'Run for cover!',                 emoji: '🏃' },
    { text: 'Cover your ears for the BOOM!',  emoji: '🙉' },
    { text: 'Stargaze in awe!',               emoji: '🌟' },
    { text: 'Twirl in the glow!',             emoji: '✨' },
    { text: 'Shield your eyes!',              emoji: '🙈' },
    { text: 'Sparkle and shine!',             emoji: '✨' },
  ],
};

export const CATEGORIES = ['rain', 'cold', 'hot', 'wind', 'fog', 'special'];
