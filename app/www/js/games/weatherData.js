/* Data for the Weather Report game.
 *
 * WEATHER: { text, emoji, category } — what the phone announces.
 *
 * Six categories, each with a body-bg class set by weatherReport.js:
 *   rain → rain-bg, cold → cold-bg, hot → hot-bg, wind → wind-bg,
 *   fog → fog-bg, special → special-bg
 *
 * Prompts are action-first rather than weather-label — each line should
 * make a kid want to immediately do something physical. Pure atmosphere
 * labels ("Hazy day!", "Tropical sunshine!") got pulled 2026-05-11 in
 * favor of "Stumble through thick fog!" / "Melt in the tropical heat!"
 * style entries.
 *
 * (Earlier versions also exported REACTIONS — a per-category pool of
 * follow-up actions chained after each weather call. Removed alongside
 * the labels pass; weatherReport.js no longer chains.)
 */

export const WEATHER = [
  // Rain (10)
  { text: "It's raining!",            emoji: '🌧️',  category: 'rain' },
  { text: "It's pouring!",            emoji: '☔',   category: 'rain' },
  { text: 'Heavy downpour!',          emoji: '🌧️',  category: 'rain' },
  { text: 'Sun shower!',              emoji: '🌦️',  category: 'rain' },
  { text: 'Thunderstorm rolling in!', emoji: '⛈️',  category: 'rain' },
  { text: 'Storm warning!',           emoji: '⛈️',  category: 'rain' },
  { text: 'Cloudburst!',              emoji: '⛈️',  category: 'rain' },
  { text: 'Dark clouds gathering!',   emoji: '☁️',   category: 'rain' },
  { text: 'Dodge the raindrops!',     emoji: '🌧️',  category: 'rain' },
  { text: 'Run through the sprinklers!', emoji: '💦', category: 'rain' },

  // Cold (10)
  { text: 'Snow is falling!',         emoji: '🌨️',  category: 'cold' },
  { text: "It's snowing buckets!",    emoji: '❄️',  category: 'cold' },
  { text: 'Blizzard incoming!',       emoji: '🌨️',  category: 'cold' },
  { text: 'Frosty morning!',          emoji: '🥶',  category: 'cold' },
  { text: 'Hailstones!',              emoji: '🧊',  category: 'cold' },
  { text: 'Ice everywhere!',          emoji: '🧊',  category: 'cold' },
  { text: 'Big fluffy flakes!',       emoji: '❄️',  category: 'cold' },
  { text: 'Freezing rain!',           emoji: '❄️',  category: 'cold' },
  { text: 'Brrr — bundle up!',        emoji: '🥶',  category: 'cold' },
  { text: 'Wade through deep snow!',  emoji: '🌨️',  category: 'cold' },

  // Hot (8)
  { text: 'Heatwave!',                                    emoji: '🥵',  category: 'hot' },
  { text: 'Scorching sun!',                               emoji: '☀️',  category: 'hot' },
  { text: 'Sunny day!',                                   emoji: '☀️',  category: 'hot' },
  { text: 'Shield your eyes from the blazing sun!',       emoji: '😎',  category: 'hot' },
  { text: 'Melt in the tropical heat!',                   emoji: '🌴',  category: 'hot' },
  { text: "It's so hot the ground is sizzling — hop!",    emoji: '🔥',  category: 'hot' },
  { text: 'Fan yourself faster — heat wave!',             emoji: '🌡️',  category: 'hot' },
  { text: 'Sweltering hot!',                              emoji: '🌡️',  category: 'hot' },

  // Wind (8)
  { text: 'Tornado warning!',           emoji: '🌪️',  category: 'wind' },
  { text: 'Whirlwind!',                 emoji: '🌪️',  category: 'wind' },
  { text: 'Hurricane winds!',           emoji: '🌬️',  category: 'wind' },
  { text: 'Big puff of wind!',          emoji: '💨',  category: 'wind' },
  { text: 'Hold onto your hat — gale force!', emoji: '🧢', category: 'wind' },
  { text: 'Chase swirling leaves!',     emoji: '🍂',  category: 'wind' },
  { text: 'Brace against the hurricane!', emoji: '🌬️', category: 'wind' },
  { text: 'Squint through the sandstorm!', emoji: '🏜️', category: 'wind' },

  // Fog / humid (5)
  { text: 'Stumble through thick fog!',                emoji: '🌫️',  category: 'fog' },
  { text: "Wave your arms through the fog — can't see!", emoji: '🙌', category: 'fog' },
  { text: 'Tippy-toe — visibility zero!',              emoji: '🌫️',  category: 'fog' },
  { text: 'Swat the swamp mosquitoes!',                emoji: '🦟',  category: 'fog' },
  { text: 'Wipe the steam off your glasses!',          emoji: '👓',  category: 'fog' },

  // Special (8)
  { text: 'Eye of the storm — freeze!',                 emoji: '🌀',  category: 'special' },
  { text: 'Lightning flash — freeze!',                  emoji: '⚡',  category: 'special' },
  { text: 'Duck from giant hailstones!',                emoji: '🧊',  category: 'special' },
  { text: 'Solar eclipse — shield your eyes!',          emoji: '🌑',  category: 'special' },
  { text: 'Aurora borealis — dance under the lights!',  emoji: '🌌',  category: 'special' },
  { text: 'Meteor shower — duck and dodge!',            emoji: '☄️',  category: 'special' },
  { text: 'Spot a shooting star and make a wish!',      emoji: '🌠',  category: 'special' },
  { text: 'Rainbow! Run to find the end!',              emoji: '🌈',  category: 'special' },
];

export const CATEGORIES = ['rain', 'cold', 'hot', 'wind', 'fog', 'special'];
