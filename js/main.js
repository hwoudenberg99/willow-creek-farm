// ---------------------------------------------------------------------------
// Main: game loop, scenes/buildings, farming, fishing, economy, energy,
// dialogue with choices, notes/phrasebook, language selection, HUD
// ---------------------------------------------------------------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ---------------- World / entities ----------------
generateMap();
buildInteriors();
buildTileSprites();
setScene("outdoor");

const player = new Character(6, 9, {
  skin: "#f2c79a", hair: "#6b4729", shirt: "#3d6fb5", pants: "#4a3b6b",
});

const npcs = [
  new NPC(22, 10, { skin: "#e8b48a", hair: "#2b1d0e", shirt: "#c04a4a", pants: "#7a3535" }, "elena", "Elena"),
  new NPC(28, 11, { skin: "#d9a87c", hair: "#9a9a9a", shirt: "#3a8a8a", pants: "#2f5d5d" }, "hugo", "Hugo"),
  // Vendors stand behind their counters inside their buildings
  new NPC(7, 3, { skin: "#f2c79a", hair: "#4a3520", shirt: "#e8e4d8", pants: "#6b4729" }, "mateo", "Mateo", "bakery", true),
  new NPC(7, 3, { skin: "#e8b48a", hair: "#c9a24a", shirt: "#4a8a5a", pants: "#35604a" }, "sofia", "Sofia", "shop", true),
];

// What each shop trades. Vendor key links the "Practice talking" button.
const SHOP_STOCK = {
  shop: {
    title: "🛒 Sofia's General Store",
    vendor: "sofia",
    buy: [
      { id: "seeds", name: "Parsnip Seeds", icon: "🌱", price: PRICES.seeds },
      { id: "bait", name: "Bait", icon: "🪱", price: PRICES.bait },
      { id: "rod", name: "Fishing Rod", icon: "🎣", price: PRICES.rod, once: true },
    ],
    sell: [
      { id: "parsnips", name: "Parsnip", icon: "🥕", price: PRICES.parsnip },
      { id: "fish", name: "Fish", icon: "🐟", price: PRICES.fish },
    ],
  },
  bakery: {
    title: "🥖 Mateo's Bakery",
    vendor: "mateo",
    buy: [
      { id: "bread", name: "Fresh Bread", icon: "🍞", price: PRICES.bread },
    ],
    sell: [],
  },
};

// ---------------- Game state ----------------
const state = {
  language: null,          // "es" | "fr" | "de" — chosen on the start screen
  tool: 0,                 // 0 hoe, 1 water, 2 seeds, 3 harvest, 4 rod
  day: 1,
  hour: 6, minute: 0,
  clockAcc: 0,
  // economy & items
  coins: START_COINS,
  seeds: START_SEEDS,
  parsnips: 0,
  bread: 0,
  fish: 0,
  bait: 0,
  rod: false,
  energy: MAX_ENERGY,
  fishing: null,           // { timer } while waiting for a bite
  // UI
  dialogue: null,          // { npc, topic, phase, choices, picked }
  notePanel: null,
  phrasebookOpen: false,
  shopOpen: null,          // scene name of the open shop ("shop" | "bakery")
  inventoryOpen: false,
  readNotes: new Set(),
  vocab: new Map(),        // targetWord -> english meaning
  toast: null,
};

function L(obj) { return obj[state.language]; }   // pick text in chosen language

function uiOpen() {
  return state.dialogue || state.notePanel || state.phrasebookOpen ||
         state.shopOpen || state.inventoryOpen || state.fishing;
}

// ---------------- Saving / loading ----------------
const SAVE_KEY = "willow-creek-farm-save";

function saveGame() {
  if (!state.language) return;
  try {
    // Tilled/watered soil is the only outdoor terrain the player changes
    const tiles = [];
    const om = scenes.outdoor.map;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (om[y][x] === T.TILLED || om[y][x] === T.WATERED) {
          tiles.push([x, y, om[y][x]]);
        }
      }
    }
    const data = {
      language: state.language,
      coins: state.coins, seeds: state.seeds, parsnips: state.parsnips,
      bread: state.bread, fish: state.fish, bait: state.bait, rod: state.rod,
      energy: state.energy, tool: state.tool,
      day: state.day, hour: state.hour, minute: state.minute,
      vocab: [...state.vocab],
      readNotes: [...state.readNotes],
      bonds: npcs.map((n) => ({ key: n.key, bond: n.bond, topicIndex: n.topicIndex })),
      crops: [...crops],
      tiles,
      player: { x: player.x, y: player.y, scene: currentScene },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable — play without saving */ }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!LANGS[d.language]) return false;

    state.language = d.language;
    state.coins = d.coins; state.seeds = d.seeds; state.parsnips = d.parsnips;
    state.bread = d.bread; state.fish = d.fish; state.bait = d.bait; state.rod = d.rod;
    state.energy = d.energy;
    state.day = d.day; state.hour = d.hour; state.minute = d.minute;
    state.vocab = new Map(d.vocab);
    state.readNotes = new Set(d.readNotes);
    for (const b of d.bonds) {
      const npc = npcs.find((n) => n.key === b.key);
      if (npc) { npc.bond = b.bond; npc.topicIndex = b.topicIndex; }
    }
    crops.clear();
    for (const [k, c] of d.crops) crops.set(k, c);
    for (const [x, y, t] of d.tiles) scenes.outdoor.map[y][x] = t;

    setScene(scenes[d.player.scene] ? d.player.scene : "outdoor");
    player.x = d.player.x;
    player.y = d.player.y;
    selectTool(d.tool || 0);
    updateHud();
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------- Start screen ----------------
const langButtonsEl = document.getElementById("lang-buttons");
for (const [code, info] of Object.entries(LANGS)) {
  const btn = document.createElement("button");
  btn.className = "lang-btn";
  btn.innerHTML = '<span class="flag">' + info.flag + "</span>" + info.name;
  btn.addEventListener("click", () => {
    clearSave();                               // picking a language = new game
    state.language = code;
    document.getElementById("start-screen").classList.add("hidden");
    toast("Welcome! Talk to villagers and look for signs 📖");
    updateHud();
    saveGame();
  });
  langButtonsEl.appendChild(btn);
}

if (hasSave()) {
  document.getElementById("continue-btn").classList.remove("hidden");
  document.getElementById("new-game-note").classList.remove("hidden");
}
document.getElementById("continue-btn").addEventListener("click", () => {
  if (loadGame()) {
    document.getElementById("start-screen").classList.add("hidden");
    toast("Welcome back! 💾 Day " + state.day);
  } else {
    toast("Save file was corrupted — starting fresh");
    document.getElementById("continue-btn").classList.add("hidden");
    document.getElementById("new-game-note").classList.add("hidden");
  }
});

// Autosave: every 5 seconds and when the page closes or is hidden
setInterval(saveGame, 5000);
window.addEventListener("beforeunload", saveGame);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveGame();
});

// ---------------- Input ----------------
const keys = new Set();

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (!state.language) return;                  // still on the start screen
  keys.add(e.key.toLowerCase());

  // Number keys: dialogue choices take priority over tool selection
  if (["1", "2", "3", "4", "5"].includes(e.key)) {
    const n = Number(e.key) - 1;
    if (state.dialogue && state.dialogue.phase === "choices") {
      if (n < state.dialogue.choices.length) pickChoice(n);
    } else if (!uiOpen()) {
      selectTool(n);
    }
    return;
  }

  if (e.key.toLowerCase() === "b" && !state.dialogue && !state.shopOpen) togglePhrasebook();
  if (e.key.toLowerCase() === "i" && !state.dialogue && !state.shopOpen) toggleInventory();

  if (e.key.toLowerCase() === "e" || e.key === " ") {
    if (!e.repeat) interact();
  }

  if (e.key === "Escape") {
    if (state.notePanel) closeNote();
    else if (state.shopOpen) closeShop();
    else if (state.inventoryOpen) toggleInventory();
    else if (state.phrasebookOpen) togglePhrasebook();
  }
});

window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

document.querySelectorAll(".slot").forEach((el) => {
  el.addEventListener("click", () => selectTool(Number(el.dataset.slot)));
});

function selectTool(i) {
  state.tool = i;
  document.querySelectorAll(".slot").forEach((el, idx) => {
    el.classList.toggle("selected", idx === i);
  });
}

// ---------------- Interaction ----------------
function interact() {
  if (state.fishing) return;                    // wait for the bite!
  if (state.notePanel) { closeNote(); return; }
  if (state.shopOpen) { closeShop(); return; }
  if (state.inventoryOpen) { toggleInventory(); return; }
  if (state.phrasebookOpen) { togglePhrasebook(); return; }

  if (state.dialogue) {
    advanceDialogue();
    return;
  }

  const face = player.facingTile();

  // Shop counter?
  if (tileAt(face.tx, face.ty) === T.COUNTER && SHOP_STOCK[currentScene]) {
    openShop(currentScene);
    return;
  }

  // Talk to a nearby NPC (same scene)?
  const near = npcs.find((n) => n.scene === currentScene &&
    Math.hypot(n.x - player.x, n.y - player.y) < TILE * 1.8);
  if (near) {
    startDialogue(near);
    return;
  }

  // Enter a building?
  const door = doorAt(face.tx, face.ty);
  if (door) {
    enterBuilding(door);
    return;
  }

  // Read a sign / note?
  const noteId = noteAt(face.tx, face.ty);
  if (noteId) {
    openNote(noteId);
    return;
  }

  // Otherwise: use the selected tool on the facing tile
  useTool(face.tx, face.ty);
}

// ---------------- Buildings ----------------
function enterBuilding(sceneName) {
  setScene(sceneName);
  player.x = 7 * TILE;
  player.y = 7.4 * TILE;
  player.dir = DIR.UP;
}

function leaveBuilding() {
  const [ox, oy] = EXIT_RETURN[currentScene];
  setScene("outdoor");
  player.x = ox * TILE;
  player.y = oy * TILE;
  player.dir = DIR.DOWN;
}

// ---------------- Tools / farming / fishing ----------------
function spendEnergy(cost) {
  if (state.energy < cost) {
    toast("Too tired! ⚡ Eat something (I → bag)");
    return false;
  }
  state.energy -= cost;
  updateHud();
  return true;
}

function useTool(tx, ty) {
  if (state.tool === 4) { tryFish(tx, ty); return; }

  if (currentScene !== "outdoor") {
    toast("Not in here!");
    return;
  }

  const t = tileAt(tx, ty);
  const key = cropKey(tx, ty);
  const crop = crops.get(key);

  switch (state.tool) {
    case 0: // Hoe
      if (TILLABLE.has(t)) {
        if (!spendEnergy(ENERGY_COST.hoe)) return;
        map[ty][tx] = T.TILLED;
        toast("Tilled the soil");
      } else if (t === T.TILLED || t === T.WATERED) {
        toast("Already tilled");
      } else {
        toast("Can't till here");
      }
      break;

    case 1: // Watering can
      if (t === T.TILLED) {
        if (!spendEnergy(ENERGY_COST.water)) return;
        map[ty][tx] = T.WATERED;
        if (crop) crop.watered = true;
        toast("Watered");
      } else if (t === T.WATERED) {
        toast("Already watered");
      } else if (t === T.WATER) {
        toast("Refilled the watering can");
      } else {
        toast("Nothing to water here");
      }
      break;

    case 2: // Seeds
      if ((t === T.TILLED || t === T.WATERED) && !crop) {
        if (state.seeds <= 0) {
          toast("No seeds! Sell parsnips at the shop to buy more 🌱");
          return;
        }
        if (!spendEnergy(ENERGY_COST.plant)) return;
        state.seeds--;
        plantCrop(tx, ty);
        if (t === T.WATERED) crops.get(key).watered = true;
        toast("Planted parsnip seeds (" + state.seeds + " left)");
        updateHud();
      } else if (crop) {
        toast("Something is already growing here");
      } else {
        toast("Till the soil first");
      }
      break;

    case 3: // Harvest
      if (crop && crop.stage >= MAX_STAGE) {
        if (!spendEnergy(ENERGY_COST.harvest)) return;
        crops.delete(key);
        map[ty][tx] = T.TILLED;
        state.parsnips++;
        toast("Harvested a parsnip! 🥕 (" + state.parsnips + ")");
        updateHud();
      } else if (crop) {
        toast("Not ready yet — keep it watered");
      } else {
        toast("Nothing to harvest");
      }
      break;
  }
}

function tryFish(tx, ty) {
  if (!state.rod) { toast("You need a fishing rod — Sofia sells them 🎣"); return; }
  if (tileAt(tx, ty) !== T.WATER) { toast("Face the water to fish"); return; }
  if (state.bait <= 0) { toast("Out of bait! Buy more at the shop 🪱"); return; }
  if (!spendEnergy(ENERGY_COST.fish)) return;
  state.bait--;
  state.fishing = { timer: 1.5 + Math.random() * 2.5 };
  toast("🎣 Fishing…");
  state.toast.timer = 99;                       // hold the toast until resolved
  updateHud();
}

function resolveFishing() {
  state.fishing = null;
  if (Math.random() < FISH_CATCH_CHANCE) {
    state.fish++;
    toast("Caught a fish! 🐟 (" + state.fish + ")");
  } else {
    toast("It got away… 💨");
  }
  updateHud();
}

// ---------------- Shop ----------------
function openShop(sceneName) {
  state.shopOpen = sceneName;
  renderShop();
  document.getElementById("shop-panel").classList.remove("hidden");
}

function closeShop() {
  state.shopOpen = null;
  document.getElementById("shop-panel").classList.add("hidden");
}

function renderShop() {
  const stock = SHOP_STOCK[state.shopOpen];
  document.getElementById("shop-title").textContent = stock.title;
  document.getElementById("shop-coins").textContent = "Your coins: 🪙 " + state.coins;

  const buyEl = document.getElementById("shop-buy");
  buyEl.innerHTML = "";
  for (const item of stock.buy) {
    const owned = item.id === "rod" && state.rod;
    const row = document.createElement("div");
    row.className = "shop-row";
    row.innerHTML =
      "<span>" + item.icon + "</span><span class='item-name'>" + item.name +
      (owned ? " <span class='item-count'>(owned)</span>" : "") +
      "</span><span class='item-price'>🪙 " + item.price + "</span>";
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = "Buy";
    btn.disabled = owned || state.coins < item.price;
    btn.addEventListener("click", () => buyItem(item));
    row.appendChild(btn);
    buyEl.appendChild(row);
  }
  document.getElementById("shop-buy-section").style.display = stock.buy.length ? "" : "none";

  const sellEl = document.getElementById("shop-sell");
  sellEl.innerHTML = "";
  for (const item of stock.sell) {
    const have = state[item.id];
    const row = document.createElement("div");
    row.className = "shop-row";
    row.innerHTML =
      "<span>" + item.icon + "</span><span class='item-name'>" + item.name +
      " <span class='item-count'>(you have " + have + ")</span></span>" +
      "<span class='item-price'>🪙 " + item.price + "</span>";
    const one = document.createElement("button");
    one.className = "shop-btn";
    one.textContent = "Sell 1";
    one.disabled = have <= 0;
    one.addEventListener("click", () => sellItem(item, 1));
    const all = document.createElement("button");
    all.className = "shop-btn";
    all.textContent = "All";
    all.disabled = have <= 0;
    all.addEventListener("click", () => sellItem(item, state[item.id]));
    row.appendChild(one);
    row.appendChild(all);
    sellEl.appendChild(row);
  }
  document.getElementById("shop-sell-section").style.display = stock.sell.length ? "" : "none";
}

function buyItem(item) {
  if (state.coins < item.price) return;
  state.coins -= item.price;
  if (item.id === "seeds") state.seeds++;
  else if (item.id === "bait") state.bait++;
  else if (item.id === "bread") state.bread++;
  else if (item.id === "rod") state.rod = true;
  toast("Bought " + item.name + " " + item.icon);
  updateHud();
  renderShop();
}

function sellItem(item, count) {
  if (count <= 0) return;
  state[item.id] -= count;
  state.coins += item.price * count;
  toast("Sold " + count + " × " + item.name + " for 🪙 " + item.price * count);
  updateHud();
  renderShop();
}

document.getElementById("shop-chat").addEventListener("click", () => {
  const stock = SHOP_STOCK[state.shopOpen];
  const vendor = npcs.find((n) => n.key === stock.vendor);
  closeShop();
  startDialogue(vendor);
});

// ---------------- Inventory / eating ----------------
function toggleInventory() {
  state.inventoryOpen = !state.inventoryOpen;
  const panel = document.getElementById("inventory");
  if (state.inventoryOpen) {
    renderInventory();
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
}

function renderInventory() {
  const list = document.getElementById("inventory-entries");
  list.innerHTML = "";
  const rows = [
    { icon: "🪙", name: "Coins", count: state.coins },
    { icon: "⚡", name: "Energy", count: Math.round(state.energy) + " / " + MAX_ENERGY },
    { icon: "🌱", name: "Seeds", count: state.seeds },
    { icon: "🪱", name: "Bait", count: state.bait },
    { icon: "🎣", name: "Fishing Rod", count: state.rod ? "owned" : "—" },
    { icon: "🥕", name: "Parsnips", count: state.parsnips, eat: "parsnips", energy: FOOD_ENERGY.parsnip },
    { icon: "🍞", name: "Bread", count: state.bread, eat: "bread", energy: FOOD_ENERGY.bread },
    { icon: "🐟", name: "Fish", count: state.fish, eat: "fish", energy: FOOD_ENERGY.fish },
  ];
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "shop-row";
    row.innerHTML = "<span>" + r.icon + "</span><span class='item-name'>" + r.name +
      "</span><span class='item-count'>" + r.count + "</span>";
    if (r.eat) {
      const btn = document.createElement("button");
      btn.className = "shop-btn";
      btn.textContent = "Eat +" + r.energy + "⚡";
      btn.disabled = state[r.eat] <= 0 || state.energy >= MAX_ENERGY;
      btn.addEventListener("click", () => {
        state[r.eat]--;
        state.energy = Math.min(MAX_ENERGY, state.energy + r.energy);
        toast("Yum! +" + r.energy + " energy " + r.icon);
        updateHud();
        renderInventory();
      });
      row.appendChild(btn);
    }
    list.appendChild(row);
  }
}

// ---------------- Dialogue with choices ----------------
const dlgEl = document.getElementById("dialogue");
const dlgName = document.getElementById("dialogue-name");
const dlgText = document.getElementById("dialogue-text");
const dlgGloss = document.getElementById("dialogue-gloss");
const dlgChoices = document.getElementById("dialogue-choices");
const dlgNext = document.getElementById("dialogue-next");

function startDialogue(npc) {
  npc.paused = true;
  npc.facePoint(player.x, player.y);

  const data = DIALOGUES[npc.key];
  const topic = data.topics[npc.topicIndex % data.topics.length];
  npc.topicIndex++;

  // Shuffle answer order so the correct one isn't always first
  const choices = [...topic.choices];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  state.dialogue = { npc, topic, choices, phase: "line", picked: null };
  renderDialogue();
}

function advanceDialogue() {
  const d = state.dialogue;
  if (d.phase === "line") {
    d.phase = "choices";
    renderDialogue();
  } else if (d.phase === "reply") {
    d.npc.paused = false;
    state.dialogue = null;
    dlgEl.classList.add("hidden");
  }
  // phase "choices": E does nothing — the player must pick an answer
}

function pickChoice(i) {
  const d = state.dialogue;
  d.picked = d.choices[i];
  const data = DIALOGUES[d.npc.key];

  if (d.picked.correct) {
    if (d.npc.bond < MAX_BOND) d.npc.bond++;
    d.replyHtml =
      "<span class='result-good'>♥ +1 &nbsp;(" + d.npc.name + ": " + d.npc.bond + "/" + MAX_BOND + ")</span><br>" +
      escapeHtml(L(data.success)) +
      "<div class='you-said'>You said: “" + escapeHtml(d.picked.t.en) + "” ✓</div>";
  } else {
    d.replyHtml =
      "<span class='result-bad'>" + d.npc.name + " looks confused…</span><br>" +
      escapeHtml(L(data.fail)) +
      "<div class='you-said'>You said: “" + escapeHtml(d.picked.t.en) + "” — that wasn't about " +
      "what they asked.</div>";
  }
  d.phase = "reply";
  renderDialogue();
}

function renderDialogue() {
  const d = state.dialogue;
  dlgEl.classList.remove("hidden");
  dlgName.innerHTML = escapeHtml(d.npc.name) +
    "<span class='hearts'>" + "♥".repeat(d.npc.bond) + "<span style='opacity:.3'>" +
    "♥".repeat(MAX_BOND - d.npc.bond) + "</span></span>";

  if (d.phase === "line") {
    dlgText.textContent = L(d.topic.line);
    dlgGloss.innerHTML = glossHtml(L(d.topic.line));
    dlgChoices.innerHTML = "";
    dlgNext.classList.remove("hidden");
  } else if (d.phase === "choices") {
    dlgText.textContent = L(d.topic.line);
    dlgGloss.innerHTML = glossHtml(L(d.topic.line));
    dlgChoices.innerHTML = "";
    d.choices.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = "<span class='num'>" + (i + 1) + "</span>" + escapeHtml(L(c.t));
      btn.addEventListener("click", () => pickChoice(i));
      dlgChoices.appendChild(btn);
    });
    dlgNext.classList.add("hidden");
  } else { // reply
    dlgText.innerHTML = d.replyHtml;
    dlgGloss.innerHTML = "";
    dlgChoices.innerHTML = "";
    dlgNext.classList.remove("hidden");
  }
}

// Show translations for any phrasebook words found in this sentence
function glossHtml(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const [word, meaning] of state.vocab) {
    if (lower.includes(word.toLowerCase())) {
      hits.push("<b>" + escapeHtml(word) + "</b> = " + escapeHtml(meaning));
    }
  }
  if (hits.length === 0) {
    return "<span class='hint'>You don't recognize any words… find notes and signs around town!</span>";
  }
  return "📖 " + hits.join(" &nbsp;·&nbsp; ");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------- Notes / phrasebook ----------------
function openNote(id) {
  state.notePanel = id;
  const note = NOTES[id];
  document.getElementById("note-title").textContent =
    "📜 " + L(note.title) + " (" + note.title.en + ")";
  const list = document.getElementById("note-entries");
  list.innerHTML = "";
  let newWords = 0;
  for (const entry of note.entries) {
    const word = L(entry.w);
    if (!state.vocab.has(word)) { state.vocab.set(word, entry.en); newWords++; }
    const row = document.createElement("div");
    row.className = "vocab-row";
    row.innerHTML = "<span class='word'>" + escapeHtml(word) + "</span>" +
                    "<span class='meaning'>" + escapeHtml(entry.en) + "</span>";
    list.appendChild(row);
  }
  if (!state.readNotes.has(id)) {
    state.readNotes.add(id);
    if (newWords > 0) toast("+" + newWords + " new words! 📖");
  }
  updateHud();
  document.getElementById("note-panel").classList.remove("hidden");
}

function closeNote() {
  state.notePanel = null;
  document.getElementById("note-panel").classList.add("hidden");
}

function togglePhrasebook() {
  state.phrasebookOpen = !state.phrasebookOpen;
  const panel = document.getElementById("phrasebook");
  if (state.phrasebookOpen) {
    const list = document.getElementById("phrasebook-entries");
    list.innerHTML = "";
    if (state.vocab.size === 0) {
      list.innerHTML = "<div style='text-align:center;color:#c9a36a;font-size:14px'>" +
        "Empty! Read signs 🪧 and notice boards around the valley.</div>";
    }
    for (const [word, meaning] of state.vocab) {
      const row = document.createElement("div");
      row.className = "vocab-row";
      row.innerHTML = "<span class='word'>" + escapeHtml(word) + "</span>" +
                      "<span class='meaning'>" + escapeHtml(meaning) + "</span>";
      list.appendChild(row);
    }
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
}

// ---------------- Toast + HUD ----------------
function toast(text) {
  state.toast = { text, timer: 2.0 };
}

function updateHud() {
  document.getElementById("coin-count").textContent = state.coins;
  document.getElementById("vocab-count").textContent = state.vocab.size;
  document.getElementById("energy-fill").style.width =
    Math.round((state.energy / MAX_ENERGY) * 100) + "%";
}

// ---------------- Clock ----------------
function updateClock(dt) {
  state.clockAcc += dt;
  const secondsPer10Min = SECONDS_PER_HOUR / 6;
  while (state.clockAcc >= secondsPer10Min) {
    state.clockAcc -= secondsPer10Min;
    state.minute += 10;
    if (state.minute >= 60) {
      state.minute = 0;
      state.hour++;
      if (state.hour >= 24) {
        state.hour = 0;
        state.day++;
        state.energy = MAX_ENERGY;             // a night's rest
        toast("☀️ Day " + state.day + " — energy restored!");
        updateHud();
      }
    }
  }
  const h12 = state.hour % 12 === 0 ? 12 : state.hour % 12;
  const ampm = state.hour < 12 ? "AM" : "PM";
  const mm = String(state.minute).padStart(2, "0");
  document.getElementById("clock").innerHTML =
    "Day " + state.day + " &nbsp; " + h12 + ":" + mm + " " + ampm;
}

// Night darkness: 0 at midday, up to 0.45 late at night (outdoors only)
function nightAlpha() {
  if (currentScene !== "outdoor") return 0;
  const h = state.hour + state.minute / 60;
  if (h >= 6 && h < 17) return 0;
  if (h >= 17 && h < 21) return ((h - 17) / 4) * 0.45;
  if (h >= 21 || h < 4) return 0.45;
  return (1 - (h - 4) / 2) * 0.45;   // 4am–6am fades to daylight
}

// ---------------- Render ----------------
function drawLabel(text, sx, sy) {
  ctx.font = "bold 12px Verdana";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  const w = ctx.measureText(text).width + 10;
  ctx.fillRect(sx - w / 2, sy - 13, w, 17);
  ctx.fillStyle = "#ffe9c4";
  ctx.fillText(text, sx, sy);
}

function cameraPos() {
  // Center small interiors; clamp the camera on the big outdoor map
  let camX, camY;
  if (curMapW * TILE <= VIEW_W) {
    camX = (curMapW * TILE - VIEW_W) / 2;
  } else {
    camX = Math.max(0, Math.min(curMapW * TILE - VIEW_W, player.x + TILE / 2 - VIEW_W / 2));
  }
  if (curMapH * TILE <= VIEW_H) {
    camY = (curMapH * TILE - VIEW_H) / 2;
  } else {
    camY = Math.max(0, Math.min(curMapH * TILE - VIEW_H, player.y + TILE / 2 - VIEW_H / 2));
  }
  return { camX, camY };
}

function draw() {
  const { camX, camY } = cameraPos();

  ctx.fillStyle = "#14100a";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const tx0 = Math.max(0, Math.floor(camX / TILE));
  const ty0 = Math.max(0, Math.floor(camY / TILE));
  const tx1 = Math.min(curMapW - 1, Math.ceil((camX + VIEW_W) / TILE));
  const ty1 = Math.min(curMapH - 1, Math.ceil((camY + VIEW_H) / TILE));

  // Tiles
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const sx = Math.round(x * TILE - camX);
      const sy = Math.round(y * TILE - camY);
      ctx.drawImage(tileSprites[map[y][x]], sx, sy);
    }
  }

  // Crops (outdoor only)
  if (currentScene === "outdoor") {
    for (const [key, crop] of crops) {
      const parts = key.split(",");
      const cx = Number(parts[0]), cy = Number(parts[1]);
      if (cx < tx0 || cx > tx1 || cy < ty0 || cy > ty1) continue;
      drawCrop(ctx, crop, Math.round(cx * TILE - camX), Math.round(cy * TILE - camY));
    }
  }

  // Facing-tile cursor + context hints
  if (!uiOpen()) {
    const { tx, ty } = player.facingTile();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(tx * TILE - camX) + 1, Math.round(ty * TILE - camY) + 1,
                   TILE - 2, TILE - 2);
    const lx = Math.round(tx * TILE - camX) + TILE / 2;
    const ly = Math.round(ty * TILE - camY) - 6;
    if (noteAt(tx, ty)) drawLabel("📜 E to read", lx, ly);
    else if (doorAt(tx, ty)) drawLabel("🚪 E to enter", lx, ly);
    else if (tileAt(tx, ty) === T.COUNTER && SHOP_STOCK[currentScene]) drawLabel("🛒 E to shop", lx, ly);
    else if (tileAt(tx, ty) === T.WATER && state.rod && state.tool === 4) drawLabel("🎣 E to cast", lx, ly);
  }

  // Entities in this scene, sorted by y so lower ones draw in front
  const sceneNpcs = npcs.filter((n) => n.scene === currentScene);
  const entities = [player, ...sceneNpcs].sort((a, b) => a.y - b.y);
  for (const e of entities) e.draw(ctx, camX, camY);

  // NPC name + hearts + talk hint
  for (const n of sceneNpcs) {
    const dist = Math.hypot(n.x - player.x, n.y - player.y);
    if (dist < TILE * 2.8) {
      const sx = Math.round(n.x - camX) + TILE / 2;
      const sy = Math.round(n.y - camY) - 8;
      drawLabel(n.name + " ♥" + n.bond + "  (E to talk)", sx, sy);
    }
  }

  // Fishing bobber
  if (state.fishing) {
    const { tx, ty } = player.facingTile();
    const bx = Math.round(tx * TILE - camX) + TILE / 2;
    const by = Math.round(ty * TILE - camY) + TILE / 2;
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(bx, by + Math.sin(performance.now() / 200) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bx, by + Math.sin(performance.now() / 200) * 3 - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Night overlay
  const na = nightAlpha();
  if (na > 0) {
    ctx.fillStyle = "rgba(10, 12, 60," + na + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Toast
  if (state.toast) {
    ctx.font = "bold 15px Verdana";
    ctx.textAlign = "center";
    const w = ctx.measureText(state.toast.text).width + 24;
    ctx.fillStyle = "rgba(43,29,14,0.9)";
    ctx.fillRect(VIEW_W / 2 - w / 2, 76, w, 30);
    ctx.strokeStyle = "#8a5a33";
    ctx.lineWidth = 2;
    ctx.strokeRect(VIEW_W / 2 - w / 2, 76, w, 30);
    ctx.fillStyle = "#ffe9c4";
    ctx.fillText(state.toast.text, VIEW_W / 2, 96);
  }
}

// ---------------- Main loop ----------------
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (state.language) {
    // Player movement (frozen while any UI is open or fishing)
    if (!uiOpen()) {
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      player.move(dx, dy, dt);

      // Walked onto the exit mat inside a building?
      if (currentScene !== "outdoor" &&
          tileAt(player.tileX, player.tileY) === T.EXIT) {
        leaveBuilding();
      }
    }

    // Fishing bite timer
    if (state.fishing) {
      state.fishing.timer -= dt;
      if (state.fishing.timer <= 0) resolveFishing();
    }

    for (const n of npcs) {
      if (n.scene === currentScene) n.update(dt);
    }
    updateCrops(dt);
    updateClock(dt);

    if (state.toast) {
      state.toast.timer -= dt;
      if (state.toast.timer <= 0) state.toast = null;
    }
  }

  draw();
  requestAnimationFrame(frame);
}

updateHud();
requestAnimationFrame(frame);
