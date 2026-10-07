// ---------------------------------------------------------------------------
// Global constants
// ---------------------------------------------------------------------------
const TILE = 32;            // tile size in px
const MAP_W = 64;           // outdoor map width in tiles
const MAP_H = 40;           // outdoor map height in tiles
const VIEW_W = 960;         // canvas width
const VIEW_H = 640;         // canvas height

// Tile type ids
const T = {
  GRASS: 0,
  GRASS2: 1,      // grass variant with tufts
  FLOWER: 2,
  TILLED: 3,
  WATERED: 4,
  WATER: 5,
  TREE: 6,
  FENCE: 7,
  PATH: 8,
  HOUSE_WALL: 9,
  HOUSE_ROOF: 10,
  HOUSE_DOOR: 11,
  HOUSE_ROOF2: 12, // blue-slate roof variant (shop)
  SIGN: 13,        // readable wooden sign / note
  BOARD: 14,       // village notice board
  // ---- interior tiles ----
  FLOOR: 15,       // wooden floor
  WALL_I: 16,      // interior wall
  COUNTER: 17,     // shop counter
  TABLE: 18,
  RUG: 19,
  BED: 20,
  PLANT: 21,       // potted plant
  EXIT: 22,        // door mat — walk onto it to leave the building
};

// Tiles the player cannot walk through
const SOLID_TILES = new Set([
  T.WATER, T.TREE, T.FENCE, T.HOUSE_WALL, T.HOUSE_ROOF, T.HOUSE_DOOR,
  T.HOUSE_ROOF2, T.SIGN, T.BOARD,
  T.WALL_I, T.COUNTER, T.TABLE, T.BED, T.PLANT,
]);

// Tiles that a hoe can till
const TILLABLE = new Set([T.GRASS, T.GRASS2, T.FLOWER]);

// Crop growth: seconds of "watered time" needed per stage (stages 0..3)
const GROW_SECONDS = 12;
const MAX_STAGE = 3;

// Clock: real seconds per in-game hour
const SECONDS_PER_HOUR = 5;

// Max bond (hearts) per villager
const MAX_BOND = 10;

// ---------------- Economy ----------------
const START_COINS = 30;
const START_SEEDS = 5;

const PRICES = {
  seeds: 10,     // buy
  bait: 5,       // buy
  rod: 50,       // buy, one-time
  bread: 15,     // buy
  parsnip: 15,   // sell
  fish: 25,      // sell
};

// ---------------- Energy ----------------
const MAX_ENERGY = 100;
const ENERGY_COST = { hoe: 3, water: 2, plant: 2, harvest: 2, fish: 5 };
const FOOD_ENERGY = { bread: 40, parsnip: 15, fish: 20 };

// Fishing
const FISH_CATCH_CHANCE = 0.65;

// Deterministic PRNG so the map is the same every run
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
