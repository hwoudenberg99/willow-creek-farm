// ---------------------------------------------------------------------------
// World: outdoor map + building interiors (scenes), procedural tile sprites,
// crops, readable notes, doors
// ---------------------------------------------------------------------------

// Scene registry. `map`, `curMapW`, `curMapH` always point at the active scene.
const scenes = {};           // name -> { map, w, h }
let currentScene = "outdoor";
let map = null;
let curMapW = 0, curMapH = 0;

const crops = new Map();     // outdoor-only: "x,y" -> { stage, watered, timer }

// Outdoor door tile -> interior scene name
const DOOR_TARGETS = {
  "6,7": "farmhouse",
  "40,8": "bakery",
  "52,8": "shop",
  "44,24": "cottage1",
  "54,24": "cottage2",
};

// Interior scene -> outdoor tile to reappear on when leaving
const EXIT_RETURN = {
  farmhouse: [6, 8],
  bakery: [40, 9],
  shop: [52, 9],
  cottage1: [44, 25],
  cottage2: [54, 25],
};

// Where each readable note lives (outdoor scene): "x,y" -> note id
const NOTE_SPOTS = {
  "10,11": "farm",    // sign by the farm field
  "28,9": "pond",     // sign at the pond
  "48,9": "board",    // village notice board on the plaza
  "41,9": "bakery",   // menu by the bakery door
  "53,9": "shop",     // poster by the shop door
  "45,25": "house",   // old note by the south cottage
};

function setScene(name) {
  currentScene = name;
  const s = scenes[name];
  map = s.map;
  curMapW = s.w;
  curMapH = s.h;
}

function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= curMapW || ty >= curMapH) {
    return currentScene === "outdoor" ? T.TREE : T.WALL_I;
  }
  return map[ty][tx];
}

function isSolid(tx, ty) {
  return SOLID_TILES.has(tileAt(tx, ty));
}

function noteAt(tx, ty) {
  if (currentScene !== "outdoor") return null;
  return NOTE_SPOTS[tx + "," + ty] || null;
}

function doorAt(tx, ty) {
  if (currentScene !== "outdoor") return null;
  return DOOR_TARGETS[tx + "," + ty] || null;
}

// ---------------- Outdoor map generation ----------------
function placeBuilding(m, x0, y0, x1, y1, doorX, roofTile) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      m[y][x] = y <= y0 + 2 ? roofTile : T.HOUSE_WALL;
    }
  }
  m[y1][doorX] = T.HOUSE_DOOR;
}

function generateMap() {
  const rnd = mulberry32(1337);
  const m = [];

  // Base grass with variation
  for (let y = 0; y < MAP_H; y++) {
    m[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const r = rnd();
      m[y][x] = r < 0.75 ? T.GRASS : (r < 0.93 ? T.GRASS2 : T.FLOWER);
    }
  }

  // Tree border (organic, ~2 tiles thick)
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const edge = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y);
      if (edge === 0) m[y][x] = T.TREE;
      else if (edge === 1 && rnd() < 0.7) m[y][x] = T.TREE;
      else if (edge === 2 && rnd() < 0.25) m[y][x] = T.TREE;
    }
  }

  // Pond (between farm and village)
  const pcx = 32, pcy = 6, prx = 4.2, pry = 2.9;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const dx = (x - pcx) / prx, dy = (y - pcy) / pry;
      if (dx * dx + dy * dy <= 1) m[y][x] = T.WATER;
    }
  }

  // ---- Farm (west) ----
  placeBuilding(m, 4, 3, 9, 7, 6, T.HOUSE_ROOF);       // farmhouse

  // Path: from the farmhouse door down, then east all the way to the village
  for (let y = 8; y <= 12; y++) m[y][6] = T.PATH;
  for (let x = 6; x <= 48; x++) m[12][x] = T.PATH;

  // Fenced field (the farm plot)
  const fx0 = 11, fx1 = 25, fy0 = 13, fy1 = 21;
  for (let x = fx0; x <= fx1; x++) {
    if (x !== 17 && x !== 18) m[fy0][x] = T.FENCE;      // gap = gate at top
    m[fy1][x] = T.FENCE;
  }
  for (let y = fy0; y <= fy1; y++) {
    m[y][fx0] = T.FENCE;
    m[y][fx1] = T.FENCE;
  }
  for (let y = fy0 + 1; y < fy1; y++) {
    for (let x = fx0 + 1; x < fx1; x++) {
      m[y][x] = rnd() < 0.85 ? T.GRASS : T.GRASS2;
    }
  }
  m[13][17] = T.GRASS;
  m[13][18] = T.GRASS;

  // ---- Village (east) ----
  for (let y = 10; y <= 16; y++) {
    for (let x = 44; x <= 52; x++) m[y][x] = T.PATH;    // plaza
  }

  placeBuilding(m, 38, 4, 43, 8, 40, T.HOUSE_ROOF);     // bakery
  placeBuilding(m, 50, 4, 55, 8, 52, T.HOUSE_ROOF2);    // shop
  placeBuilding(m, 42, 20, 47, 24, 44, T.HOUSE_ROOF);   // cottage 1
  placeBuilding(m, 52, 20, 57, 24, 54, T.HOUSE_ROOF2);  // cottage 2

  // Connecting paths
  for (let y = 9; y <= 10; y++) { m[y][40] = T.PATH; m[y][52] = T.PATH; }
  for (let y = 16; y <= 26; y++) m[y][46] = T.PATH;
  for (let x = 44; x <= 54; x++) m[26][x] = T.PATH;
  for (let y = 25; y <= 26; y++) { m[y][44] = T.PATH; m[y][54] = T.PATH; }

  // Scattered interior trees (avoid farm buildings, field, paths, village)
  for (let i = 0; i < 50; i++) {
    const x = 3 + Math.floor(rnd() * (MAP_W - 6));
    const y = 3 + Math.floor(rnd() * (MAP_H - 6));
    const t = m[y][x];
    const inField = x >= fx0 - 1 && x <= fx1 + 1 && y >= fy0 - 1 && y <= fy1 + 1;
    const inFarmhouse = x >= 3 && x <= 10 && y >= 2 && y <= 9;
    const inVillage = x >= 36 && x <= 59 && y >= 3 && y <= 28;
    if ((t === T.GRASS || t === T.GRASS2) && !inField && !inFarmhouse && !inVillage) {
      m[y][x] = T.TREE;
    }
  }

  // Readable signs & notice board (placed last so nothing overwrites them)
  for (const key of Object.keys(NOTE_SPOTS)) {
    const [x, y] = key.split(",").map(Number);
    m[y][x] = NOTE_SPOTS[key] === "board" ? T.BOARD : T.SIGN;
  }

  scenes.outdoor = { map: m, w: MAP_W, h: MAP_H };
}

// ---------------- Interiors ----------------
// All interiors are 15x10. Exit mat in the bottom wall at x=7.
function buildInterior(name, decor, hasCounter) {
  const w = 15, h = 10;
  const m = [];
  for (let y = 0; y < h; y++) {
    m[y] = [];
    for (let x = 0; x < w; x++) {
      const isWall = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      m[y][x] = isWall ? T.WALL_I : T.FLOOR;
    }
  }
  m[h - 1][7] = T.EXIT;                       // door mat
  if (hasCounter) {
    for (let x = 4; x <= 10; x++) m[4][x] = T.COUNTER;
  }
  for (const [x, y, t] of decor) m[y][x] = t;
  scenes[name] = { map: m, w, h };
}

function buildInteriors() {
  buildInterior("farmhouse", [
    [2, 2, T.BED], [3, 2, T.BED],
    [11, 2, T.TABLE], [12, 2, T.TABLE],
    [7, 5, T.RUG],
    [1, 5, T.PLANT], [13, 5, T.PLANT],
  ], false);

  buildInterior("bakery", [
    [1, 1, T.PLANT], [13, 1, T.PLANT],
    [2, 2, T.TABLE], [12, 2, T.TABLE],
    [7, 7, T.RUG],
  ], true);

  buildInterior("shop", [
    [1, 1, T.PLANT], [13, 1, T.PLANT],
    [2, 2, T.TABLE], [3, 2, T.TABLE], [11, 2, T.TABLE], [12, 2, T.TABLE],
    [7, 7, T.RUG],
  ], true);

  buildInterior("cottage1", [
    [2, 2, T.BED],
    [11, 2, T.TABLE],
    [7, 4, T.RUG],
    [13, 6, T.PLANT],
  ], false);

  buildInterior("cottage2", [
    [12, 2, T.BED],
    [2, 2, T.TABLE], [3, 2, T.TABLE],
    [7, 4, T.RUG],
    [1, 6, T.PLANT],
  ], false);
}

// ---------------- Procedural tile sprites ----------------
const tileSprites = {};

function px(c, x, y, w, h, color) {   // draw in 4px pixel-art blocks
  c.fillStyle = color;
  c.fillRect(x * 4, y * 4, w * 4, h * 4);
}

function makeTile(draw) {
  const cv = document.createElement("canvas");
  cv.width = TILE;
  cv.height = TILE;
  const c = cv.getContext("2d");
  draw(c);
  return cv;
}

function buildTileSprites() {
  const rnd = mulberry32(42);

  const grassBase = (c) => {
    px(c, 0, 0, 8, 8, "#63b04a");
    for (let i = 0; i < 7; i++) {
      px(c, Math.floor(rnd() * 8), Math.floor(rnd() * 8), 1, 1,
         rnd() < 0.5 ? "#579e40" : "#70bd55");
    }
  };

  const floorBase = (c) => {
    px(c, 0, 0, 8, 8, "#a8794a");
    px(c, 0, 2, 8, 1, "#966a3e");
    px(c, 0, 5, 8, 1, "#966a3e");
    px(c, 3, 0, 1, 2, "#966a3e");
    px(c, 6, 3, 1, 2, "#966a3e");
    px(c, 1, 6, 1, 2, "#966a3e");
  };

  tileSprites[T.GRASS] = makeTile((c) => grassBase(c));

  tileSprites[T.GRASS2] = makeTile((c) => {
    grassBase(c);
    px(c, 2, 3, 1, 2, "#3f8531");
    px(c, 5, 5, 1, 2, "#3f8531");
    px(c, 6, 1, 1, 2, "#3f8531");
  });

  tileSprites[T.FLOWER] = makeTile((c) => {
    grassBase(c);
    px(c, 3, 3, 1, 1, "#ffffff");
    px(c, 2, 2, 1, 1, "#ffd75e");
    px(c, 5, 5, 1, 1, "#ff8ab0");
    px(c, 6, 2, 1, 1, "#ffffff");
  });

  tileSprites[T.TILLED] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#8a5a33");
    px(c, 0, 1, 8, 1, "#734a28");
    px(c, 0, 4, 8, 1, "#734a28");
    px(c, 0, 6, 8, 1, "#734a28");
    px(c, 2, 2, 1, 1, "#9c6a3f");
    px(c, 5, 5, 1, 1, "#9c6a3f");
  });

  tileSprites[T.WATERED] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#5e3d22");
    px(c, 0, 1, 8, 1, "#4d3119");
    px(c, 0, 4, 8, 1, "#4d3119");
    px(c, 0, 6, 8, 1, "#4d3119");
    px(c, 3, 2, 1, 1, "#6b4729");
    px(c, 6, 5, 1, 1, "#6b4729");
  });

  tileSprites[T.WATER] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#3d7bd6");
    px(c, 1, 1, 3, 1, "#5b95e8");
    px(c, 4, 4, 3, 1, "#5b95e8");
    px(c, 2, 6, 2, 1, "#5b95e8");
    px(c, 6, 2, 1, 1, "#7fb2f5");
  });

  tileSprites[T.TREE] = makeTile((c) => {
    grassBase(c);
    px(c, 3, 5, 2, 3, "#6b4729");                    // trunk
    px(c, 1, 0, 6, 5, "#2e7d32");                    // canopy
    px(c, 0, 1, 8, 3, "#2e7d32");
    px(c, 2, 0, 2, 2, "#43a047");
    px(c, 5, 2, 2, 1, "#43a047");
    px(c, 1, 3, 2, 1, "#1b5e20");
    px(c, 6, 1, 1, 1, "#1b5e20");
  });

  tileSprites[T.FENCE] = makeTile((c) => {
    grassBase(c);
    px(c, 1, 1, 1, 6, "#8a5a33");
    px(c, 6, 1, 1, 6, "#8a5a33");
    px(c, 0, 2, 8, 1, "#a5713f");
    px(c, 0, 5, 8, 1, "#a5713f");
    px(c, 1, 0, 1, 1, "#734a28");
    px(c, 6, 0, 1, 1, "#734a28");
  });

  tileSprites[T.PATH] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#c9a36a");
    px(c, 1, 2, 2, 1, "#b8905a");
    px(c, 5, 5, 2, 1, "#b8905a");
    px(c, 4, 1, 1, 1, "#dbb87e");
    px(c, 2, 6, 1, 1, "#dbb87e");
    px(c, 6, 3, 1, 1, "#a58252");
  });

  tileSprites[T.HOUSE_WALL] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#b98d5e");
    px(c, 0, 2, 8, 1, "#a57a4e");
    px(c, 0, 5, 8, 1, "#a57a4e");
    px(c, 3, 0, 1, 8, "#a57a4e");
  });

  tileSprites[T.HOUSE_ROOF] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#a5432e");
    px(c, 0, 1, 8, 1, "#8c3624");
    px(c, 0, 4, 8, 1, "#8c3624");
    px(c, 0, 7, 8, 1, "#8c3624");
    px(c, 2, 2, 1, 1, "#bf5540");
    px(c, 5, 5, 1, 1, "#bf5540");
  });

  tileSprites[T.HOUSE_ROOF2] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#4a6a8a");
    px(c, 0, 1, 8, 1, "#3d5872");
    px(c, 0, 4, 8, 1, "#3d5872");
    px(c, 0, 7, 8, 1, "#3d5872");
    px(c, 2, 2, 1, 1, "#5d7fa3");
    px(c, 5, 5, 1, 1, "#5d7fa3");
  });

  tileSprites[T.HOUSE_DOOR] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#b98d5e");
    px(c, 1, 1, 6, 7, "#5e3d22");
    px(c, 2, 2, 4, 6, "#734a28");
    px(c, 5, 4, 1, 1, "#ffd75e");                    // knob
  });

  tileSprites[T.SIGN] = makeTile((c) => {
    grassBase(c);
    px(c, 3, 4, 2, 4, "#8a5a33");                    // post
    px(c, 1, 1, 6, 3, "#c9a36a");                    // board
    px(c, 1, 1, 6, 1, "#dbb87e");
    px(c, 2, 2, 4, 1, "#8a5a33");                    // "writing"
  });

  tileSprites[T.BOARD] = makeTile((c) => {
    grassBase(c);
    px(c, 1, 5, 1, 3, "#6b4729");                    // legs
    px(c, 6, 5, 1, 3, "#6b4729");
    px(c, 0, 0, 8, 5, "#8a5a33");                    // frame
    px(c, 1, 1, 6, 3, "#e8d9a0");                    // paper
    px(c, 2, 1, 2, 1, "#a5432e");                    // pinned notes
    px(c, 5, 2, 1, 1, "#3d7bd6");
    px(c, 2, 3, 3, 1, "#8a5a33");
  });

  // ---- Interior sprites ----
  tileSprites[T.FLOOR] = makeTile((c) => floorBase(c));

  tileSprites[T.WALL_I] = makeTile((c) => {
    px(c, 0, 0, 8, 8, "#6b4a30");
    px(c, 0, 6, 8, 2, "#5a3d26");                    // baseboard
    px(c, 0, 2, 8, 1, "#5f4229");
    px(c, 4, 0, 1, 6, "#5f4229");
  });

  tileSprites[T.COUNTER] = makeTile((c) => {
    floorBase(c);
    px(c, 0, 1, 8, 4, "#8a5a33");                    // countertop
    px(c, 0, 1, 8, 1, "#c9a36a");
    px(c, 0, 5, 8, 2, "#734a28");                    // front panel
  });

  tileSprites[T.TABLE] = makeTile((c) => {
    floorBase(c);
    px(c, 1, 2, 6, 3, "#c9a36a");                    // top
    px(c, 1, 2, 6, 1, "#dbb87e");
    px(c, 1, 5, 1, 2, "#8a5a33");                    // legs
    px(c, 6, 5, 1, 2, "#8a5a33");
  });

  tileSprites[T.RUG] = makeTile((c) => {
    floorBase(c);
    px(c, 0, 1, 8, 6, "#a5432e");
    px(c, 1, 2, 6, 4, "#c05540");
    px(c, 3, 3, 2, 2, "#ffd75e");
  });

  tileSprites[T.BED] = makeTile((c) => {
    floorBase(c);
    px(c, 0, 0, 8, 8, "#8a5a33");                    // frame
    px(c, 1, 1, 6, 6, "#e8e4d8");                    // sheet
    px(c, 1, 1, 6, 2, "#c04a4a");                    // blanket
    px(c, 2, 5, 4, 1, "#d9d9d9");                    // pillow-ish
  });

  tileSprites[T.PLANT] = makeTile((c) => {
    floorBase(c);
    px(c, 3, 5, 2, 2, "#a5432e");                    // pot
    px(c, 2, 2, 4, 3, "#2e7d32");                    // leaves
    px(c, 3, 1, 2, 2, "#43a047");
  });

  tileSprites[T.EXIT] = makeTile((c) => {
    floorBase(c);
    px(c, 1, 2, 6, 4, "#c9a36a");                    // mat
    px(c, 2, 3, 4, 2, "#dbb87e");
  });
}

// ---------------- Crops (outdoor scene only) ----------------
function cropKey(tx, ty) { return tx + "," + ty; }

function plantCrop(tx, ty) {
  crops.set(cropKey(tx, ty), { stage: 0, watered: false, timer: 0 });
}

function updateCrops(dt) {
  const om = scenes.outdoor.map;
  for (const [key, crop] of crops) {
    if (!crop.watered || crop.stage >= MAX_STAGE) continue;
    crop.timer += dt;
    if (crop.timer >= GROW_SECONDS) {
      crop.timer = 0;
      crop.stage++;
      if (crop.stage < MAX_STAGE) {
        // each stage needs fresh water
        crop.watered = false;
        const parts = key.split(",");
        const tx = Number(parts[0]), ty = Number(parts[1]);
        if (om[ty][tx] === T.WATERED) om[ty][tx] = T.TILLED;
      }
    }
  }
}

// Draw a crop on top of its tile (sx, sy = screen px of tile top-left)
function drawCrop(ctx, crop, sx, sy) {
  ctx.save();
  ctx.translate(sx, sy);
  const P = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x * 4, y * 4, w * 4, h * 4);
  };
  switch (crop.stage) {
    case 0: // seeds
      P(3, 5, 1, 1, "#e8d9a0"); P(5, 4, 1, 1, "#e8d9a0"); P(2, 3, 1, 1, "#e8d9a0");
      break;
    case 1: // sprout
      P(3, 4, 1, 3, "#4caf50"); P(2, 3, 1, 1, "#66bb6a"); P(4, 3, 1, 1, "#66bb6a");
      break;
    case 2: // leafy
      P(3, 3, 2, 4, "#388e3c"); P(1, 2, 2, 2, "#4caf50"); P(5, 2, 2, 2, "#4caf50");
      P(3, 1, 2, 2, "#66bb6a");
      break;
    case 3: // ready to harvest
      P(3, 4, 2, 3, "#ffcf7a");                       // root peeking out
      P(3, 1, 2, 3, "#388e3c"); P(1, 1, 2, 2, "#4caf50"); P(5, 1, 2, 2, "#4caf50");
      P(2, 0, 4, 1, "#66bb6a");
      break;
  }
  ctx.restore();
}
