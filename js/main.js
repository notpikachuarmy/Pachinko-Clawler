"use strict";

const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events,
  Common,
  Sleeping
} = Matter;

if (window.decomp) Common.setDecomp(window.decomp);

const CONFIG = Object.freeze({
  boardVersion: 4,
  boardWidth: 960,
  boardHeight: 1500,
  launchAreaHeight: 120,
  bottomZoneTop: 1340,
  wallThickness: 48,
  pegRadius: 10,
  shakeCooldownMs: 1200,
  enemyTurnDelayMs: 520,
  hazardHitCooldownMs: 650,
  maxAdaptationLevel: 5,
  colors: {
    background: "#171724",
    launchArea: "#24243a",
    launchLine: "#e4b84d",
    wall: "#4d4d65",
    peg: "#d8d8e4",
    activation: "#247a52",
    void: "#15151f",
    bumper: "#55556f"
  }
});

const SHOP_CONFIG = Object.freeze({
  width: 900,
  height: 660,
  launchY: 54,
  sensorY: 625,
  discountOptions: [20, 35, 50],
  offerCount: 3,
  colors: {
    background: "#171724",
    wall: "#51516a",
    peg: "#dedee8",
    normal: "#6b4a26",
    discount: "#247a52"
  }
});

const STARTING_LOADOUT = Object.freeze([
  "wood_sword",
  "wood_sword",
  "wood_sword",
  "wood_shield",
  "wood_shield",
  "hp_potion"
]);

const itemDefinitions = new Map((window.PACHINKRAWLER_ITEMS || []).map(item => [item.id, item]));
const enemyDefinitions = new Map((window.PACHINKRAWLER_ENEMIES || []).map(enemy => [enemy.id, enemy]));
const hazardDefinitions = new Map((window.PACHINKRAWLER_HAZARDS || []).map(hazard => [hazard.id, hazard]));
const statusDefinitions = window.PACHINKRAWLER_STATUSES || {};
const runeDefinitions = new Map((window.PACHINKRAWLER_RUNES || []).map(rune => [rune.id, rune]));
const evolutionDefinitions = new Map((window.PACHINKRAWLER_EVOLUTIONS || []).map(recipe => [recipe.id, recipe]));
const evolutionBySource = new Map((window.PACHINKRAWLER_EVOLUTIONS || []).map(recipe => [recipe.sourceItemId, recipe]));
const Storage = window.PachinkrawlerStorage;

const itemImages = preloadImages(itemDefinitions, definition => definition.sprite);
const hazardImages = preloadImages(hazardDefinitions, definition => definition.sprite);

const $ = selector => document.querySelector(selector);
const menuScreen = $("#menu-screen");
const gameScreen = $("#game-screen");
const shopScreen = $("#shop-screen");
const restScreen = $("#rest-screen");
const newRunButton = $("#new-run-button");
const continueButton = $("#continue-button");
const testRunButton = $("#test-run-button");
const deleteSaveButton = $("#delete-save-button");
const continueSummary = $("#continue-summary");
const menuButton = $("#menu-button");
const gameContainer = $("#game-container");
const shakeButton = $("#shake-button");
const debugButton = $("#debug-button");
const passButton = $("#pass-button");
const backpackButton = $("#backpack-button");
const closeBackpackButton = $("#close-backpack");
const backpackModal = $("#backpack-modal");
const inventoryList = $("#inventory-list");
const statusElement = $("#status");
const armorElement = $("#player-armor");
const healthElement = $("#player-health");
const healthFillElement = $("#player-health-fill");
const manaElement = $("#player-mana");
const manaFillElement = $("#player-mana-fill");
const logElement = $("#event-log");
const poolCountElement = $("#pool-count");
const selectedNameElement = $("#selected-name");
const selectedDetailElement = $("#selected-detail");
const selectedImageElement = $("#selected-image");
const turnLabelElement = $("#turn-label");
const roundLabelElement = $("#round-label");
const runModeLabel = $("#run-mode-label");
const goldValueElement = $("#gold-value");
const inventoryCountElement = $("#inventory-count");
const adaptationSummaryElement = $("#adaptation-summary");
const formationLabelElement = $("#formation-label");
const enemyFormationElement = $("#enemy-formation");
const playerCombatantElement = $("#player-combatant");
const playerStatusesElement = $("#player-statuses");
const resultModal = $("#result-modal");
const resultEyebrow = $("#result-eyebrow");
const resultTitle = $("#result-title");
const resultMessage = $("#result-message");
const resultDetails = $("#result-details");
const nextCombatButton = $("#next-combat-button");
const resultMenuButton = $("#result-menu-button");
const shopContainer = $("#shop-container");
const shopGoldValue = $("#shop-gold-value");
const shopDiscountLabel = $("#shop-discount-label");
const shopRoundLabel = $("#shop-round-label");
const shopOffersElement = $("#shop-offers");
const shopLogElement = $("#shop-log");
const rerollButton = $("#reroll-button");
const rerollCostElement = $("#reroll-cost");
const leaveShopButton = $("#leave-shop-button");
const shopMenuButton = $("#shop-menu-button");
const shopBackpackButton = $("#shop-backpack-button");
const menuCodexButton = $("#menu-codex-button");
const restGoldValue = $("#rest-gold-value");
const restMenuButton = $("#rest-menu-button");
const openShopButton = $("#open-shop-button");
const openCodexButton = $("#open-codex-button");
const restBackpackButton = $("#rest-backpack-button");
const continueRestButton = $("#continue-rest-button");
const restInventoryElement = $("#rest-inventory");
const anvilDetailElement = $("#anvil-detail");
const upgradeDurabilityButton = $("#upgrade-durability-button");
const evolveItemButton = $("#evolve-item-button");
const runeOffersElement = $("#rune-offers");
const runeRerollButton = $("#rune-reroll-button");
const runeRerollCostElement = $("#rune-reroll-cost");
const restLogElement = $("#rest-log");
const codexModal = $("#codex-modal");
const closeCodexButton = $("#close-codex");
const codexContentElement = $("#codex-content");
const codexTabButtons = [...document.querySelectorAll("[data-codex-tab]")];

const engine = Engine.create({
  // Dormir cuerpos provocaba que escudos y libros quedasen congelados
  // entre varios clavos. Con pocos objetos simultáneos es más estable
  // mantener la simulación despierta.
  enableSleeping: false,
  gravity: { x: 0, y: 1, scale: 0.001 }
});

const render = Render.create({
  element: gameContainer,
  engine,
  options: {
    width: CONFIG.boardWidth,
    height: CONFIG.boardHeight,
    wireframes: false,
    background: CONFIG.colors.background,
    pixelRatio: 1
  }
});

const runner = Runner.create();
Render.run(render);
Runner.run(runner, engine);

const shopEngine = Engine.create({
  enableSleeping: false,
  gravity: { x: 0, y: 1, scale: 0.00115 }
});
const shopRender = Render.create({
  element: shopContainer,
  engine: shopEngine,
  options: {
    width: SHOP_CONFIG.width,
    height: SHOP_CONFIG.height,
    wireframes: false,
    background: SHOP_CONFIG.colors.background,
    pixelRatio: 1
  }
});
const shopRunner = Runner.create();
Render.run(shopRender);
Runner.run(shopRunner, shopEngine);

const gameState = {
  run: null,
  scene: "menu",
  turn: "player",
  combatOver: false,
  enemies: [],
  activeItems: new Set(),
  boardBodies: [],
  hazardBodies: [],
  slots: [],
  selectedInstanceId: null,
  turnDrawPile: [],
  nextPhysicsId: 1,
  debugHitboxes: false,
  shakeReady: true,
  resultAction: "next",
  playerFlashUntil: 0,
  shopBodies: [],
  shopActiveBody: null,
  shopPurchase: null,
  shopBusy: false,
  restSelectedInstanceId: null,
  codexTab: "items"
};

function preloadImages(definitions, getSource) {
  const images = new Map();
  for (const definition of definitions.values()) {
    const image = new Image();
    image.src = getSource(definition);
    images.set(definition.id, image);
  }
  return images;
}

function createId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRun(isTestMode = false) {
  const itemIds = isTestMode ? [...itemDefinitions.keys()] : [...STARTING_LOADOUT];
  const maxHealth = isTestMode ? 30 : 20;
  const maxMana = isTestMode ? 20 : 10;
  const meta = Storage.loadMeta();
  const knownItems = new Set([...(meta.discoveredItems || []), ...STARTING_LOADOUT]);

  return {
    version: Storage.SAVE_VERSION,
    loadoutVersion: 2,
    id: createId("run"),
    isTestMode,
    phase: "combat",
    round: 1,
    gold: 0,
    player: {
      hp: maxHealth,
      maxHp: maxHealth,
      mp: maxMana,
      maxMp: maxMana,
      armor: 0
    },
    inventory: itemIds
      .filter(itemId => itemDefinitions.has(itemId))
      .map(itemId => createInventoryInstance(itemId)),
    adaptation: {},
    discoveredItems: isTestMode ? [...itemDefinitions.keys()] : [...knownItems],
    shopState: null,
    restState: null,
    combatSnapshot: null,
    lastResult: null
  };
}

function createInventoryInstance(itemId) {
  const definition = itemDefinitions.get(itemId);
  return {
    instanceId: createId("item"),
    itemId,
    durabilityLevel: 0,
    runes: [],
    evolvedFrom: null,
    currentDurability: definition?.durability ?? 1,
    broken: false,
    usedThisTurn: false,
    temperedUsedThisTurn: false
  };
}

function showMenu() {
  gameState.scene = "menu";
  clearActiveItems();
  clearShopItem();
  closeBackpackModal();
  resultModal.hidden = true;
  codexModal.hidden = true;
  gameScreen.hidden = true;
  shopScreen.hidden = true;
  restScreen.hidden = true;
  menuScreen.hidden = false;
  refreshMenu();
}

function showGame() {
  gameState.scene = "game";
  codexModal.hidden = true;
  menuScreen.hidden = true;
  shopScreen.hidden = true;
  restScreen.hidden = true;
  gameScreen.hidden = false;

  // Algunos navegadores conservan el desplazamiento vertical del menú.
  // Al reanudar una run esto podía dejar la zona inferior fuera del
  // encuadre inicial aunque el canvas estuviese renderizado completo.
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function refreshMenu() {
  const saved = Storage.load();
  continueButton.disabled = !saved;
  deleteSaveButton.disabled = !saved;

  if (!saved) {
    continueSummary.textContent = "No hay una run guardada.";
    return;
  }

  const phaseLabels = {
    transition: "recompensa de victoria",
    rest: "en la zona de descanso",
    shop: "en la tienda",
    combat: "en combate"
  };
  const phase = phaseLabels[saved.phase] || "en la expedición";
  continueSummary.textContent = `Run guardada · Ronda ${saved.round} · ${phase} · ${saved.inventory.length} objetos · ${saved.gold || 0} oro`;
}

function beginNewRun(isTestMode = false) {
  if (!isTestMode && Storage.hasSave()) {
    const confirmed = window.confirm("Iniciar una nueva run sustituirá la partida guardada. ¿Continuar?");
    if (!confirmed) return;
  }

  gameState.run = createRun(isTestMode);
  if (!isTestMode) discoverItems(STARTING_LOADOUT);
  showGame();
  startCombat();
}

function continueSavedRun() {
  const loaded = Storage.load();
  if (!loaded) {
    refreshMenu();
    return;
  }

  const saved = migrateLoadedRun(loaded);
  gameState.run = saved;
  showGame();

  if (saved.phase === "transition") {
    // Las partidas guardadas entre combates también deben reaparecer con
    // la vida ya restaurada, incluso si proceden de una versión anterior.
    restorePlayerBetweenCombats();
    Storage.save(saved);
    gameState.enemies = [];
    gameState.turn = "ended";
    gameState.combatOver = true;
    createBoard(generateBoardConfiguration(saved.round, saved.lastSlotSignature));
    updateUi();
    showVictoryResult(saved.lastResult, true);
    return;
  }

  if (saved.phase === "shop") {
    showShop();
    return;
  }

  if (saved.phase === "rest") {
    showRest();
    return;
  }

  if (!saved.combatSnapshot) {
    startCombat();
    return;
  }

  restoreCombatSnapshot(saved.combatSnapshot);
}


function migrateLoadedRun(run) {
  run.discoveredItems = Array.isArray(run.discoveredItems)
    ? run.discoveredItems.filter(id => itemDefinitions.has(id))
    : [...new Set((run.inventory || []).map(instance => instance.itemId))];
  run.shopState = run.shopState || null;
  run.restState = run.restState || null;
  for (const instance of run.inventory || []) {
    instance.durabilityLevel = Number.isFinite(instance.durabilityLevel) ? instance.durabilityLevel : 0;
    instance.runes = Array.isArray(instance.runes) ? instance.runes.filter(id => runeDefinitions.has(id)) : [];
    instance.evolvedFrom = instance.evolvedFrom || null;
    instance.temperedUsedThisTurn = false;
    instance.currentDurability = Math.min(instance.currentDurability ?? getInstanceMaxDurability(instance), getInstanceMaxDurability(instance));
  }

  const meta = Storage.loadMeta();
  run.discoveredItems = [...new Set([...(run.discoveredItems || []), ...(meta.discoveredItems || [])])];
  if (!run.isTestMode) {
    Storage.updateMeta(persistent => addUnique(persistent.discoveredItems, run.discoveredItems));
  }

  // Durante el prototipo, una partida de la ronda 1 que aún conserve
  // exactamente el antiguo kit 1/1/1 recibe el nuevo kit inicial 3/2/1.
  // No alteramos runs avanzadas ni inventarios que ya hayan cambiado.
  if (run.loadoutVersion !== 2) {
    const ids = (run.inventory || []).map(instance => instance.itemId).sort();
    const oldStartingKit = ["hp_potion", "wood_shield", "wood_sword"];
    const isUntouchedOpening = !run.isTestMode && run.round === 1 && run.gold === 0 &&
      ids.length === oldStartingKit.length && ids.every((id, index) => id === oldStartingKit[index]);

    if (isUntouchedOpening) {
      run.inventory.push(
        createInventoryInstance("wood_sword"),
        createInventoryInstance("wood_sword"),
        createInventoryInstance("wood_shield")
      );
    }
    run.loadoutVersion = 2;
    Storage.save(run);
  }
  return run;
}

function startCombat() {
  clearActiveItems();
  clearShopItem();
  closeBackpackModal();
  resultModal.hidden = true;
  shopScreen.hidden = true;
  restScreen.hidden = true;
  gameScreen.hidden = false;

  const run = gameState.run;
  run.phase = "combat";
  run.player.armor = 0;
  gameState.enemies = generateEnemyFormation(run.round);
  gameState.turn = "player";
  gameState.combatOver = false;
  resetTurnPool();
  const boardConfig = generateBoardConfiguration(run.round, run.lastSlotSignature);
  run.lastSlotSignature = boardConfig.slots.slice(1, -1).join("|");
  createBoard(boardConfig);
  addLog(`Ronda ${run.round}: ${formationDescription(gameState.enemies)}. La zona inferior se ha reorganizado.`);
  updateUi();
  saveSafePoint();
}

function restoreCombatSnapshot(snapshot) {
  clearActiveItems();
  closeBackpackModal();
  resultModal.hidden = true;

  const run = gameState.run;
  run.player = clone(snapshot.player);
  run.inventory = clone(snapshot.inventory);
  gameState.enemies = clone(snapshot.enemies);
  gameState.turn = "player";
  gameState.combatOver = false;
  resetTurnPool(snapshot.drawOrder);
  const restoredBoard = snapshot.board?.version === CONFIG.boardVersion
    ? clone(snapshot.board)
    : generateBoardConfiguration(run.round, run.lastSlotSignature);
  if (snapshot.board?.version !== CONFIG.boardVersion) {
    run.lastSlotSignature = restoredBoard.slots.slice(1, -1).join("|");
  }
  createBoard(restoredBoard);
  addLog(snapshot.board?.version === CONFIG.boardVersion
    ? "Partida retomada al inicio del último turno guardado."
    : "Partida retomada con el tablero profundo actualizado.");
  updateUi();
}

function saveSafePoint() {
  const run = gameState.run;
  if (!run || run.isTestMode || gameState.turn !== "player" || gameState.combatOver) return;

  run.phase = "combat";
  run.combatSnapshot = {
    player: clone(run.player),
    inventory: clone(run.inventory.map(instance => ({
      ...instance,
      usedThisTurn: false
    }))),
    enemies: clone(gameState.enemies),
    drawOrder: clone(gameState.turnDrawPile),
    board: {
      version: CONFIG.boardVersion,
      slots: clone(gameState.slots),
      hazards: gameState.hazardBodies.map(body => clone(body.plugin.pachinkrawlerHazard.layout))
    }
  };
  Storage.save(run);
}

function generateEnemyFormation(round) {
  let formation;
  if (round === 1) {
    formation = [createEnemyState(enemyDefinitions.get("slime_green"), 0, round)];
  } else {
    const count = round < 4 ? 2 : 3;
    const pool = [...enemyDefinitions.values()];
    formation = [];
    for (let index = 0; index < count; index += 1) {
      const definition = weightedChoice(pool, enemy => enemy.weight || 1);
      formation.push(createEnemyState(definition, index, round));
    }
  }
  discoverEnemies(formation.map(enemy => enemy.definitionId));
  return formation;
}

function createEnemyState(definition, index, round) {
  const defeated = gameState.run.adaptation[definition.id] || 0;
  const adaptationLevel = Math.min(CONFIG.maxAdaptationLevel, Math.floor(defeated / 3));
  const roundHpScale = 1 + Math.max(0, round - 1) * 0.035;
  const adaptationHpScale = 1 + adaptationLevel * 0.12;
  const maxHp = Math.max(1, Math.round(definition.maxHp * roundHpScale * adaptationHpScale));
  const attack = definition.attack + Math.floor((round - 1) / 4) + Math.ceil(adaptationLevel / 2);
  const armor = definition.armor + Math.floor(adaptationLevel / 2);

  return {
    combatId: createId(`enemy-${index}`),
    definitionId: definition.id,
    name: definition.name,
    sprite: definition.sprite,
    maxHp,
    hp: maxHp,
    attack,
    armor,
    maxArmor: armor,
    adaptationLevel,
    statuses: {},
    defeatCounted: false,
    flashUntil: 0
  };
}

function formationDescription(enemies) {
  if (enemies.length === 1) return `aparece ${enemies[0].name}`;
  return `aparecen ${enemies.length} enemigos`;
}

function generateBoardConfiguration(round, previousSlotSignature = "") {
  // En la mayoría de combates las tres ranuras centrales contienen
  // exactamente una activación, un vacío y una pared. En una minoría
  // aparecen composiciones especiales, siempre con al menos una salida
  // de activación y riesgo real.
  const standardPattern = ["activation", "void", "wall"];
  const rarePatterns = [
    ["activation", "activation", "void"],
    ["activation", "activation", "wall"],
    ["activation", "void", "void"],
    ["activation", "wall", "wall"]
  ];

  let inner = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const base = Math.random() < 0.82
      ? standardPattern
      : rarePatterns[Math.floor(Math.random() * rarePatterns.length)];
    inner = shuffle(base);
    if (inner.join("|") !== previousSlotSignature) break;
  }
  const slots = ["wall", ...inner, "wall"];

  // Los peligros ocupan nodos reales del patrón en vez de superponerse
  // a una parrilla completa. Así quedan rutas legibles y se evitan
  // pinzas imposibles entre un peligro y un clavo situado debajo.
  const hazardCount = Math.min(8, 5 + Math.floor((round - 1) / 2));
  const candidates = shuffle(createPegLayout().filter(peg => (
    peg.row >= 1 &&
    peg.row <= 9 &&
    peg.x > 110 &&
    peg.x < CONFIG.boardWidth - 110
  )));
  const hazardIds = [...hazardDefinitions.keys()];
  const hazards = [];

  for (const candidate of candidates) {
    if (hazards.length >= hazardCount) break;
    const farEnough = hazards.every(hazard => (
      Math.hypot(hazard.x - candidate.x, hazard.y - candidate.y) >= 142
    ));
    if (!farEnough) continue;

    hazards.push({
      instanceId: createId("hazard"),
      definitionId: hazardIds[Math.floor(Math.random() * hazardIds.length)],
      x: candidate.x,
      y: candidate.y,
      angle: randomBetween(-0.16, 0.16)
    });
  }

  return { version: CONFIG.boardVersion, slots, hazards };
}

function createBoard(boardConfig) {
  clearBoardBodies();
  const bodies = [
    ...createWalls(),
    ...createPegs(boardConfig.hazards || []),
    ...createLowerGuides(),
    ...createBottomZone(boardConfig.slots || ["wall", "activation", "void", "activation", "wall"])
  ];
  gameState.boardBodies = bodies;
  Composite.add(engine.world, bodies);

  gameState.hazardBodies = (boardConfig.hazards || [])
    .map(layout => createHazardBody(layout))
    .filter(Boolean);
  Composite.add(engine.world, gameState.hazardBodies);
}

function clearBoardBodies() {
  for (const body of gameState.boardBodies) Composite.remove(engine.world, body);
  for (const body of gameState.hazardBodies) Composite.remove(engine.world, body);
  gameState.boardBodies = [];
  gameState.hazardBodies = [];
  gameState.slots = [];
}

function createWalls() {
  const half = CONFIG.wallThickness / 2;
  const options = {
    isStatic: true,
    restitution: 0.45,
    friction: 0.05,
    label: "board-wall",
    render: { fillStyle: CONFIG.colors.wall }
  };

  return [
    Bodies.rectangle(-half, CONFIG.boardHeight / 2, CONFIG.wallThickness, CONFIG.boardHeight, options),
    Bodies.rectangle(CONFIG.boardWidth + half, CONFIG.boardHeight / 2, CONFIG.wallThickness, CONFIG.boardHeight, options)
  ];
}

function createPegLayout() {
  // Separación útil de unos 90 px entre bordes. El escudo inicial
  // mide aproximadamente 83 px y ahora puede atravesar rutas normales.
  const rows = [
    [0, 1, 3, 4, 6, 7],
    [0, 2, 3, 5, 7],
    [0, 1, 2, 3, 4, 5, 6, 7],
    [0, 1, 3, 4, 6, 7],
    [0, 1, 2, 4, 5, 7],
    [0, 2, 3, 5, 6],
    [0, 1, 2, 3, 4, 5, 6, 7],
    [0, 1, 3, 4, 6, 7],
    [0, 2, 3, 5, 7],
    [0, 1, 2, 4, 5, 6, 7],
    [0, 1, 3, 4, 6, 7]
  ];
  const layout = [];
  const spacingX = 112;
  const spacingY = 103;
  const startX = 88;
  const startY = 190;

  rows.forEach((columns, row) => {
    const offset = row % 2 ? spacingX / 2 : 0;
    for (const column of columns) {
      const x = startX + column * spacingX + offset;
      if (x > CONFIG.boardWidth - 70) continue;
      layout.push({ x, y: startY + row * spacingY, row, column });
    }
  });

  return layout;
}

function createPegs(hazards = []) {
  const pegs = [];
  const hazardClearance = 68;

  for (const peg of createPegLayout()) {
    const replacedByHazard = hazards.some(hazard => (
      Math.hypot(hazard.x - peg.x, hazard.y - peg.y) < hazardClearance
    ));
    if (replacedByHazard) continue;

    pegs.push(Bodies.circle(peg.x, peg.y, CONFIG.pegRadius, {
      isStatic: true,
      restitution: 0.84,
      friction: 0.02,
      label: "peg",
      render: { fillStyle: CONFIG.colors.peg, strokeStyle: "#77778d", lineWidth: 2 }
    }));
  }
  return pegs;
}

function createLowerGuides() {
  // Guías laterales cortas: reducen rincones muertos sin convertir
  // los bordes en una entrada directa a los buzones.
  const options = {
    isStatic: true,
    restitution: 0.72,
    friction: 0.04,
    label: "board-guide",
    render: { fillStyle: CONFIG.colors.bumper, strokeStyle: "#80809c", lineWidth: 2 }
  };
  const left = Bodies.rectangle(92, 1282, 150, 18, options);
  const right = Bodies.rectangle(CONFIG.boardWidth - 92, 1282, 150, 18, options);
  Body.setAngle(left, 0.34);
  Body.setAngle(right, -0.34);
  return [left, right];
}

function createBottomZone(types) {
  const slotCount = 5;
  const slotWidth = CONFIG.boardWidth / slotCount;
  const zoneHeight = CONFIG.boardHeight - CONFIG.bottomZoneTop;
  gameState.slots = types.map((type, index) => ({ type, x: index * slotWidth, width: slotWidth }));

  return types.map((type, index) => {
    const center = index * slotWidth + slotWidth / 2;
    if (type === "wall") {
      return Bodies.rectangle(center, CONFIG.bottomZoneTop + zoneHeight * 0.68, slotWidth - 12, 76, {
        isStatic: true,
        restitution: 0.72,
        friction: 0.07,
        label: "bottom-wall",
        render: { fillStyle: CONFIG.colors.bumper, strokeStyle: "#80809c", lineWidth: 2 }
      });
    }

    return Bodies.rectangle(center, CONFIG.bottomZoneTop + zoneHeight * 0.66, slotWidth - 10, 104, {
      isStatic: true,
      isSensor: true,
      label: type === "activation" ? "activation-slot" : "void-slot",
      render: { visible: false }
    });
  });
}

function createHazardBody(layout) {
  const definition = hazardDefinitions.get(layout.definitionId);
  if (!definition) return null;

  const options = {
    isStatic: true,
    isSensor: Boolean(definition.isSensor),
    restitution: definition.restitution ?? 0.5,
    friction: 0.05,
    label: "hazard",
    render: { visible: false },
    plugin: {
      pachinkrawlerHazard: {
        definitionId: definition.id,
        layout: clone(layout)
      }
    }
  };

  const body = definition.shape === "rectangle"
    ? Bodies.rectangle(layout.x, layout.y, definition.width, definition.height, options)
    : Bodies.circle(layout.x, layout.y, definition.radius, options);
  Body.setAngle(body, layout.angle || 0);
  return body;
}

function resetTurnPool(savedDrawOrder = null) {
  // La durabilidad es un recurso del turno, no de todo el combate.
  // Al comenzar un nuevo turno cada instancia vuelve a su valor base,
  // incluso si quedó rota durante el turno anterior.
  for (const instance of gameState.run.inventory) {
    instance.currentDurability = getInstanceMaxDurability(instance);
    instance.broken = false;
    instance.usedThisTurn = false;
    instance.temperedUsedThisTurn = false;
  }

  const availableIds = gameState.run.inventory.map(instance => instance.instanceId);
  const restored = Array.isArray(savedDrawOrder)
    ? savedDrawOrder.filter(id => availableIds.includes(id))
    : [];
  const missing = availableIds.filter(id => !restored.includes(id));
  gameState.turnDrawPile = restored.length
    ? [...restored, ...shuffle(missing)]
    : shuffle(availableIds);
  selectNextDrawnItem();
}

function remainingItems() {
  return gameState.run?.inventory.filter(instance => !instance.broken && !instance.usedThisTurn) || [];
}

function getSelectedInstance() {
  return gameState.run?.inventory.find(instance => (
    instance.instanceId === gameState.selectedInstanceId &&
    !instance.broken &&
    !instance.usedThisTurn
  )) || null;
}

function findInventoryInstance(instanceId) {
  return gameState.run?.inventory.find(instance => instance.instanceId === instanceId) || null;
}

function selectNextDrawnItem() {
  gameState.turnDrawPile = gameState.turnDrawPile.filter(instanceId => {
    const instance = findInventoryInstance(instanceId);
    return Boolean(instance && !instance.broken && !instance.usedThisTurn);
  });
  gameState.selectedInstanceId = gameState.turnDrawPile[0] || null;
}

function advanceTurnDraw() {
  const usedId = gameState.selectedInstanceId;
  gameState.turnDrawPile = gameState.turnDrawPile.filter(id => id !== usedId);
  selectNextDrawnItem();
}

function selectInventoryInstance() {
  addLog("La mochila es informativa: el siguiente objeto se roba al azar al comenzar el turno.");
}

function createItemBody(definition, inventoryInstance, x) {
  const vertices = definition.vertices.map(vertex => ({ x: vertex.x, y: vertex.y }));
  let body = Bodies.fromVertices(
    x,
    58,
    [vertices],
    {
      label: "player-item",
      restitution: getInstanceRestitution(definition, inventoryInstance),
      friction: definition.friction,
      frictionAir: 0.003,
      density: getInstanceDensity(definition, inventoryInstance),
      sleepThreshold: 90,
      plugin: {
        pachinkrawler: {
          physicsId: gameState.nextPhysicsId,
          inventoryInstanceId: inventoryInstance.instanceId,
          itemId: definition.id,
          resolved: false,
          hazardHits: {},
          flashUntil: 0
        }
      },
      render: { visible: false }
    },
    true
  );

  if (!body) {
    const xs = vertices.map(vertex => vertex.x);
    const ys = vertices.map(vertex => vertex.y);
    body = Bodies.rectangle(
      x,
      58,
      Math.max(12, Math.max(...xs) - Math.min(...xs)),
      Math.max(24, Math.max(...ys) - Math.min(...ys)),
      { render: { visible: false } }
    );
  }

  body.label = "player-item";
  body.plugin.pachinkrawler = body.plugin.pachinkrawler || {
    physicsId: gameState.nextPhysicsId,
    inventoryInstanceId: inventoryInstance.instanceId,
    itemId: definition.id,
    resolved: false,
    hazardHits: {},
    flashUntil: 0
  };

  for (const part of body.parts) {
    part.render.visible = false;
    part.label = "player-item-part";
  }
  return body;
}

function getRootBody(body) {
  return body?.parent && body.parent !== body ? body.parent : body;
}

function dropItem(x) {
  if (gameState.turn !== "player" || gameState.combatOver) {
    addLog("Ahora no puedes lanzar objetos.");
    return;
  }

  const inventoryInstance = getSelectedInstance();
  if (!inventoryInstance) {
    addLog("No quedan objetos disponibles. Puedes pasar el turno.");
    return;
  }

  const definition = itemDefinitions.get(inventoryInstance.itemId);
  if (!definition) return;

  const item = createItemBody(definition, inventoryInstance, clamp(x, 42, CONFIG.boardWidth - 42));
  gameState.nextPhysicsId += 1;
  inventoryInstance.usedThisTurn = true;

  Body.setAngle(item, randomBetween(-0.12, 0.12));
  Body.setVelocity(item, { x: randomBetween(-0.25, 0.25), y: 0 });
  gameState.activeItems.add(item);
  Composite.add(engine.world, item);

  advanceTurnDraw();
  updateUi();
}

function resolveItem(item, result) {
  const root = getRootBody(item);
  const data = root.plugin?.pachinkrawler;
  if (!data || data.resolved) return;

  data.resolved = true;
  const definition = itemDefinitions.get(data.itemId);
  removeItem(root, false);

  if (!definition) return;
  const instance = findInventoryInstance(data.inventoryInstanceId);
  if (result === "activation") activateEffect(definition, instance);
  else addLog(`${definition.name} cayó al vacío y no se activó.`);

  updateUi();
}

function damageItemFromHazard(item, hazardBody) {
  const root = getRootBody(item);
  const data = root.plugin?.pachinkrawler;
  const hazardData = hazardBody.plugin?.pachinkrawlerHazard;
  if (!data || data.resolved || !hazardData) return;

  const now = performance.now();
  const lastHit = data.hazardHits[hazardData.layout.instanceId] || 0;
  if (now - lastHit < CONFIG.hazardHitCooldownMs) return;
  data.hazardHits[hazardData.layout.instanceId] = now;

  const definition = itemDefinitions.get(data.itemId);
  const instance = findInventoryInstance(data.inventoryInstanceId);
  const hazardDefinition = hazardDefinitions.get(hazardData.definitionId);
  if (!definition || !instance || !hazardDefinition) return;

  const material = definition.material || "mixed";
  const multiplier = hazardDefinition.materialMultipliers?.[material] ?? 1;
  let durabilityDamage = Math.max(1, Math.round(hazardDefinition.damage * multiplier));
  if (hasRune(instance, "tempered") && !instance.temperedUsedThisTurn) {
    durabilityDamage = Math.max(0, durabilityDamage - 1);
    instance.temperedUsedThisTurn = true;
  }
  if (hasRune(instance, "fireproof") && hazardDefinition.id === "fire") {
    durabilityDamage = Math.max(0, durabilityDamage - 1);
  }
  instance.currentDurability = Math.max(0, instance.currentDurability - durabilityDamage);
  data.flashUntil = Date.now() + 220;
  const weaknessText = multiplier > 1
    ? ` Vulnerabilidad ${materialName(material)} ×${multiplier}.`
    : "";

  if (instance.currentDurability <= 0) {
    instance.broken = true;
    data.resolved = true;
    removeItem(root, false);
    addLog(`${definition.name} se rompió al tocar ${hazardDefinition.name}.${weaknessText} Volverá con durabilidad completa en tu próximo turno.`);
  } else {
    addLog(`${hazardDefinition.name} dañó ${definition.name} por ${durabilityDamage}: ${instance.currentDurability}/${getInstanceMaxDurability(instance)}.${weaknessText}`);
    Sleeping.set(root, false);
  }
  updateUi();
}

function activateEffect(definition, instance) {
  if (!gameState.run.discoveredItems.includes(definition.id)) {
    gameState.run.discoveredItems.push(definition.id);
    discoverItems([definition.id]);
    addLog(`Códice actualizado: has descubierto el efecto de ${definition.name}.`);
  }
  const effect = getEffectiveEffect(definition, instance);

  if (effect.type === "armor") {
    gameState.run.player.armor += effect.value;
    addLog(`${definition.name}: +${effect.value} de armadura.`);
    triggerRuneAfterActivation(definition, instance);
    return;
  }

  if (effect.type === "heal") {
    const healed = healPlayer(effect.value);
    addLog(`${definition.name}: +${healed} de vida.`);
    triggerRuneAfterActivation(definition, instance);
    return;
  }

  if (effect.type === "mana") {
    const restored = restoreMana(effect.value);
    addLog(`${definition.name}: +${restored} de maná.`);
    triggerRuneAfterActivation(definition, instance);
    return;
  }

  if (effect.type === "spellHeal") {
    if (!spendMana(effect.manaCost, definition.name)) return;
    const healed = healPlayer(effect.value);
    addLog(`${definition.name}: -${effect.manaCost} MP y +${healed} de vida.`);
    triggerRuneAfterActivation(definition, instance);
    return;
  }

  if (effect.type === "spellDamage") {
    if (!spendMana(effect.manaCost, definition.name)) return;
    const target = getEnemyTarget(effect.target);
    if (!target) return;
    const outcome = dealDamage(target, effect.value, effect.armorPierce || 0);
    applyOptionalStatus(target, effect.status);
    addLog(`${definition.name}: -${effect.manaCost} MP, ${outcome.hpDamage} de daño a ${target.name}${statusLog(effect.status)}.`);
    triggerRuneAfterActivation(definition, instance);
    checkCombatVictory();
    return;
  }

  if (effect.type === "cleave") {
    const targets = livingEnemies();
    const front = targets[0];
    const second = targets[1];
    if (!front) return;
    const mainOutcome = dealDamage(front, effect.value);
    let message = `${definition.name}: ${mainOutcome.hpDamage} de daño a ${front.name}`;
    if (second) {
      const splashOutcome = dealDamage(second, effect.splash || 0);
      message += ` y ${splashOutcome.hpDamage} a ${second.name}`;
    }
    addLog(`${message}.`);
    triggerRuneAfterActivation(definition, instance);
    checkCombatVictory();
    return;
  }

  const target = getEnemyTarget(effect.target);
  if (!target) return;
  let value = effect.value || 0;
  if (effect.type === "execute" && target.hp / target.maxHp <= (effect.threshold ?? 0.5)) {
    value += effect.bonus || 0;
  }
  const outcome = dealDamage(target, value, effect.armorPierce || 0);
  applyOptionalStatus(target, effect.status);
  addLog(`${definition.name}: ${outcome.hpDamage} de daño a ${target.name}${outcome.blocked ? ` (${outcome.blocked} bloqueado)` : ""}${statusLog(effect.status)}.`);
  triggerRuneAfterActivation(definition, instance);
  checkCombatVictory();
}

function spendMana(cost, itemName) {
  if (gameState.run.player.mp < cost) {
    addLog(`${itemName} llegó al buzón, pero necesitas ${cost} MP. El hechizo no se lanza.`);
    return false;
  }
  gameState.run.player.mp -= cost;
  return true;
}

function healPlayer(value) {
  const player = gameState.run.player;
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + value);
  return player.hp - before;
}

function restoreMana(value) {
  const player = gameState.run.player;
  const before = player.mp;
  player.mp = Math.min(player.maxMp, player.mp + value);
  return player.mp - before;
}

function livingEnemies() {
  return gameState.enemies.filter(enemy => enemy.hp > 0);
}

function getEnemyTarget(targetType = "front") {
  const living = livingEnemies();
  if (!living.length) return null;
  return targetType === "back" ? living[living.length - 1] : living[0];
}

function dealDamage(enemy, amount, armorPierce = 0) {
  if (!enemy || enemy.hp <= 0) return { hpDamage: 0, blocked: 0 };

  const pierced = Math.min(enemy.armor, armorPierce, amount);
  const remaining = Math.max(0, amount - pierced);
  const blockableArmor = Math.max(0, enemy.armor - pierced);
  const blocked = Math.min(blockableArmor, remaining);
  const hpDamage = Math.max(0, pierced + remaining - blocked);

  enemy.armor = Math.max(0, enemy.armor - blocked);
  enemy.hp = Math.max(0, enemy.hp - hpDamage);
  enemy.flashUntil = Date.now() + 240;
  countDefeatIfNeeded(enemy);
  window.setTimeout(updateCombatantsUi, 260);
  return { hpDamage, blocked };
}

function applyOptionalStatus(enemy, status) {
  if (!enemy || enemy.hp <= 0 || !status) return;
  const existing = enemy.statuses[status.id];
  enemy.statuses[status.id] = {
    power: Math.max(existing?.power || 0, status.power || 0),
    turns: Math.max(existing?.turns || 0, status.turns || 1)
  };
}

function statusLog(status) {
  if (!status) return "";
  const definition = statusDefinitions[status.id];
  return definition ? ` y aplica ${definition.name.toLowerCase()}` : "";
}

function countDefeatIfNeeded(enemy) {
  if (enemy.hp > 0 || enemy.defeatCounted) return;
  enemy.defeatCounted = true;
  const id = enemy.definitionId;
  gameState.run.adaptation[id] = (gameState.run.adaptation[id] || 0) + 1;
}

function checkCombatVictory() {
  updateUi();
  if (livingEnemies().length === 0) finishCombatVictory();
}

function finishCombatVictory() {
  if (gameState.combatOver) return;
  gameState.combatOver = true;
  gameState.turn = "ended";
  clearActiveItems();

  const hpBeforeRecovery = gameState.run.player.hp;
  restorePlayerBetweenCombats();
  const hpRestored = gameState.run.player.hp - hpBeforeRecovery;

  for (const instance of gameState.run.inventory) {
    instance.currentDurability = getInstanceMaxDurability(instance);
    instance.broken = false;
    instance.usedThisTurn = false;
    instance.temperedUsedThisTurn = false;
  }

  const goldReward = 10 + Math.floor(Math.random() * 4);
  gameState.run.gold += goldReward;
  gameState.run.phase = "transition";
  gameState.run.shopState = null;
  gameState.run.restState = null;
  gameState.run.combatSnapshot = null;
  gameState.run.lastResult = {
    round: gameState.run.round,
    goldReward,
    hpRestored,
    defeated: gameState.enemies.map(enemy => enemy.name)
  };
  Storage.save(gameState.run);

  addLog("¡Combate superado!");
  updateUi();
  window.setTimeout(() => showVictoryResult(gameState.run.lastResult, false), 300);
}

function finishCombatDefeat() {
  if (gameState.combatOver) return;
  gameState.combatOver = true;
  gameState.turn = "ended";
  clearActiveItems();
  if (!gameState.run.isTestMode) Storage.clear();
  addLog("La run ha terminado.");
  updateUi();

  resultEyebrow.textContent = "Run terminada";
  resultTitle.textContent = "Derrota";
  resultMessage.textContent = "El jugador se ha quedado sin vida.";
  resultDetails.innerHTML = `<span>Has alcanzado la ronda <strong>${gameState.run.round}</strong>.</span>`;
  nextCombatButton.textContent = "Iniciar nueva run";
  nextCombatButton.hidden = false;
  gameState.resultAction = "new-run";
  resultModal.hidden = false;
}

function showVictoryResult(result, resumed) {
  const safeResult = result || { round: gameState.run.round, goldReward: 0, hpRestored: 0, defeated: [] };
  resultEyebrow.textContent = resumed ? "Partida guardada" : "Combate terminado";
  resultTitle.textContent = "Victoria";
  resultMessage.textContent = "Has recuperado la vida. La zona de descanso está disponible antes del siguiente combate.";
  resultDetails.innerHTML = `
    <span>Ronda superada: <strong>${safeResult.round}</strong></span>
    <span>Oro obtenido: <strong>+${safeResult.goldReward}</strong></span>
    <span>Vida restaurada para el siguiente combate: <strong>${gameState.run.player.hp}/${gameState.run.player.maxHp}</strong>${safeResult.hpRestored ? ` (+${safeResult.hpRestored})` : ""}.</span>
    <span>Durabilidad de la mochila restaurada.</span>
  `;
  nextCombatButton.textContent = "Ir a la zona de descanso";
  nextCombatButton.hidden = false;
  gameState.resultAction = "rest";
  resultModal.hidden = false;
}

function restorePlayerBetweenCombats() {
  const player = gameState.run?.player;
  if (!player) return;

  player.hp = player.maxHp;
  player.armor = 0;
}

function startNextCombat() {
  // También se aplica aquí para migrar partidas guardadas en una transición
  // creada antes de que la curación completa entre combates existiera.
  restorePlayerBetweenCombats();
  gameState.run.round += 1;
  gameState.run.phase = "combat";
  gameState.run.shopState = null;
  gameState.run.restState = null;
  gameState.run.lastResult = null;
  startCombat();
}

function hasRune(instance, runeId) {
  return Boolean(instance?.runes?.includes(runeId));
}

function getInstanceMaxDurability(instance) {
  const definition = itemDefinitions.get(instance?.itemId);
  if (!definition) return 1;
  const levelBonus = Math.max(0, instance?.durabilityLevel || 0);
  const metalBonus = hasRune(instance, "metal") ? 1 : 0;
  return definition.durability + levelBonus + metalBonus;
}

function getInstanceDensity(definition, instance) {
  return (definition.density || 0.002) * (hasRune(instance, "heavy") ? 1.45 : 1);
}

function getInstanceRestitution(definition, instance) {
  let value = definition.restitution ?? 0.4;
  if (hasRune(instance, "heavy")) value *= 0.72;
  if (hasRune(instance, "bouncy")) value += 0.18;
  return clamp(value, 0.12, 0.96);
}

function getEffectiveEffect(definition, instance) {
  const effect = clone(definition.effect || { type: "damage", value: 1, target: "front" });
  if (hasRune(instance, "sharp") && definition.category === "weapon") {
    if (Number.isFinite(effect.value)) effect.value += 1;
    if (Number.isFinite(effect.splash)) effect.splash += 1;
  }
  if (hasRune(instance, "arcane") && definition.category === "spellbook" && Number.isFinite(effect.manaCost)) {
    effect.manaCost = Math.max(1, effect.manaCost - 1);
  }
  return effect;
}

function triggerRuneAfterActivation(definition, instance) {
  if (definition.category === "weapon" && hasRune(instance, "vampiric")) {
    const healed = healPlayer(1);
    if (healed > 0) addLog(`Runa vampírica: +${healed} de vida.`);
  }
}

function addUnique(values, additions) {
  for (const value of additions) {
    if (value && !values.includes(value)) values.push(value);
  }
}

function discoverItems(ids) {
  if (gameState.run?.isTestMode) return;
  Storage.updateMeta(meta => addUnique(meta.discoveredItems, ids.filter(id => itemDefinitions.has(id))));
}

function discoverRunes(ids) {
  if (gameState.run?.isTestMode) return;
  Storage.updateMeta(meta => addUnique(meta.discoveredRunes, ids.filter(id => runeDefinitions.has(id))));
}

function discoverEnemies(ids) {
  if (gameState.run?.isTestMode) return;
  Storage.updateMeta(meta => addUnique(meta.discoveredEnemies, ids.filter(id => enemyDefinitions.has(id))));
}

function discoverEvolution(id) {
  if (gameState.run?.isTestMode) return;
  Storage.updateMeta(meta => addUnique(meta.discoveredEvolutions, evolutionDefinitions.has(id) ? [id] : []));
}

function createRestState(round) {
  const runeOffers = generateRuneOffers();
  return {
    round,
    runeOffers,
    runeRerollCount: 0
  };
}

function generateRuneOffers() {
  const ids = shuffle([...runeDefinitions.keys()]).slice(0, 3);
  discoverRunes(ids);
  return ids;
}

function showRest() {
  const run = gameState.run;
  if (!run) return;

  clearActiveItems();
  clearShopItem();
  closeBackpackModal();
  codexModal.hidden = true;
  resultModal.hidden = true;
  menuScreen.hidden = true;
  gameScreen.hidden = true;
  shopScreen.hidden = true;
  restScreen.hidden = false;
  gameState.scene = "rest";
  gameState.turn = "ended";
  gameState.combatOver = true;

  restorePlayerBetweenCombats();
  run.phase = "rest";
  if (!run.restState || run.restState.round !== run.round) {
    run.restState = createRestState(run.round);
  }
  if (!run.inventory.some(instance => instance.instanceId === gameState.restSelectedInstanceId)) {
    gameState.restSelectedInstanceId = run.inventory[0]?.instanceId || null;
  }
  updateRestUi();
  Storage.save(run);
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function getRestSelectedInstance() {
  return gameState.run?.inventory.find(instance => instance.instanceId === gameState.restSelectedInstanceId) || null;
}

function getDurabilityUpgradeCost(level) {
  return [8, 13, 20][level] ?? null;
}

function getRuneRerollCost(count) {
  const costs = [4, 7, 11, 16];
  return costs[count] ?? (16 + (count - 3) * 6);
}

function renderRestInventory() {
  restInventoryElement.innerHTML = "";
  const run = gameState.run;
  if (!run) return;

  for (const instance of run.inventory) {
    const definition = itemDefinitions.get(instance.itemId);
    if (!definition) continue;
    const rune = runeDefinitions.get(instance.runes?.[0]);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rest-item-button";
    button.classList.toggle("is-selected", instance.instanceId === gameState.restSelectedInstanceId);
    button.title = `${definition.name} · Durabilidad ${getInstanceMaxDurability(instance)}${rune ? ` · ${rune.name}` : " · Sin runa"}`;
    button.innerHTML = `
      <img src="${definition.sprite}" alt="${definition.name}">
      <span>${getInstanceMaxDurability(instance)}</span>
      ${rune ? `<img class="rest-rune-badge" src="${rune.icon}" alt="${rune.name}">` : ""}
    `;
    button.addEventListener("click", () => {
      gameState.restSelectedInstanceId = instance.instanceId;
      updateRestUi();
    });
    restInventoryElement.append(button);
  }
}

function renderAnvilDetail() {
  const run = gameState.run;
  const instance = getRestSelectedInstance();
  if (!run || !instance) {
    anvilDetailElement.className = "workshop-detail empty-detail";
    anvilDetailElement.textContent = "Selecciona un objeto de la mochila.";
    upgradeDurabilityButton.disabled = true;
    evolveItemButton.disabled = true;
    return;
  }

  const definition = itemDefinitions.get(instance.itemId);
  const level = instance.durabilityLevel || 0;
  const upgradeCost = getDurabilityUpgradeCost(level);
  const rune = runeDefinitions.get(instance.runes?.[0]);
  const recipe = evolutionBySource.get(instance.itemId);
  const evolutionStatus = recipe ? getEvolutionStatus(instance, recipe) : null;
  const target = recipe ? itemDefinitions.get(recipe.targetItemId) : null;

  anvilDetailElement.className = "workshop-detail";
  anvilDetailElement.innerHTML = `
    <div class="anvil-object-summary">
      <img src="${definition.sprite}" alt="${definition.name}">
      <div>
        <h3>${definition.name}</h3>
        <p>${effectTextWithInstance(definition, instance)}</p>
        <p>Durabilidad máxima: <strong>${getInstanceMaxDurability(instance)}</strong> · Mejora ${level}/3</p>
        <p>Runa: <strong>${rune?.name || "Ninguna"}</strong></p>
      </div>
    </div>
    <div class="evolution-preview ${recipe ? "" : "is-locked"}">
      <img src="${recipe ? target.sprite : "./assets/sprites/ui/lock.png"}" alt="">
      <div>
        <strong>${recipe ? `Evolución: ${target.name}` : "Este objeto no tiene evolución conocida"}</strong>
        <span>${recipe ? evolutionRequirementText(recipe) : "No todos los objetos pueden evolucionar."}</span>
        ${recipe ? `<small>${recipe.description}</small>` : ""}
      </div>
    </div>
  `;

  upgradeDurabilityButton.textContent = upgradeCost === null
    ? "Durabilidad al máximo"
    : `Mejorar durabilidad · ${upgradeCost} oro`;
  upgradeDurabilityButton.disabled = upgradeCost === null || run.gold < upgradeCost;

  evolveItemButton.textContent = recipe ? `Evolucionar · ${recipe.cost} oro` : "Sin evolución";
  evolveItemButton.disabled = !recipe || !evolutionStatus.ready || run.gold < recipe.cost;
  evolveItemButton.title = recipe && !evolutionStatus.ready ? evolutionStatus.missing.join(" · ") : "";
}

function evolutionRequirementText(recipe) {
  const runeNames = (recipe.requirements.runeIds || [])
    .map(id => runeDefinitions.get(id)?.name || id)
    .join(", ");
  return `Requiere mejora de durabilidad ${recipe.requirements.durabilityLevel}/3${runeNames ? ` y ${runeNames}` : ""}. Coste: ${recipe.cost} oro.`;
}

function getEvolutionStatus(instance, recipe) {
  const missing = [];
  if ((instance.durabilityLevel || 0) < (recipe.requirements.durabilityLevel || 0)) {
    missing.push(`Mejora la durabilidad a nivel ${recipe.requirements.durabilityLevel}`);
  }
  for (const runeId of recipe.requirements.runeIds || []) {
    if (!hasRune(instance, runeId)) missing.push(`Aplica ${runeDefinitions.get(runeId)?.name || runeId}`);
  }
  return { ready: missing.length === 0, missing };
}

function renderRuneOffers() {
  runeOffersElement.innerHTML = "";
  const run = gameState.run;
  const state = run?.restState;
  const selected = getRestSelectedInstance();
  const selectedDefinition = selected ? itemDefinitions.get(selected.itemId) : null;
  if (!run || !state) return;

  for (const runeId of state.runeOffers) {
    const rune = runeDefinitions.get(runeId);
    if (!rune) continue;
    const compatible = selectedDefinition && rune.categories.includes(selectedDefinition.category);
    const alreadyRuned = Boolean(selected?.runes?.length);
    const card = document.createElement("article");
    card.className = "rune-offer";
    card.innerHTML = `
      <img src="${rune.icon}" alt="${rune.name}">
      <div><strong>${rune.name}</strong><p>${rune.description}</p></div>
      <button type="button">Aplicar · ${rune.price} oro</button>
    `;
    const button = card.querySelector("button");
    button.disabled = !selected || !compatible || alreadyRuned || run.gold < rune.price;
    button.title = !selected
      ? "Selecciona una instancia."
      : alreadyRuned
        ? "La instancia ya tiene una runa."
        : !compatible
          ? "Esta runa no es compatible con la categoría del objeto."
          : run.gold < rune.price
            ? `Necesitas ${rune.price} de oro.`
            : "Aplicar a la instancia seleccionada.";
    button.addEventListener("click", () => applyRuneToSelected(runeId));
    runeOffersElement.append(card);
  }
}

function updateRestUi() {
  if (!gameState.run) return;
  restGoldValue.textContent = gameState.run.gold;
  renderRestInventory();
  renderAnvilDetail();
  renderRuneOffers();
  const cost = getRuneRerollCost(gameState.run.restState?.runeRerollCount || 0);
  runeRerollCostElement.textContent = cost;
  runeRerollButton.disabled = gameState.run.gold < cost;
}

function upgradeSelectedDurability() {
  const run = gameState.run;
  const instance = getRestSelectedInstance();
  if (!run || !instance) return;
  const level = instance.durabilityLevel || 0;
  const cost = getDurabilityUpgradeCost(level);
  if (cost === null || run.gold < cost) return;

  run.gold -= cost;
  instance.durabilityLevel = level + 1;
  instance.currentDurability = getInstanceMaxDurability(instance);
  restLogElement.textContent = `${itemDefinitions.get(instance.itemId).name} alcanza mejora de durabilidad ${instance.durabilityLevel}/3.`;
  Storage.save(run);
  updateRestUi();
}

function applyRuneToSelected(runeId) {
  const run = gameState.run;
  const instance = getRestSelectedInstance();
  const rune = runeDefinitions.get(runeId);
  const definition = itemDefinitions.get(instance?.itemId);
  if (!run || !instance || !rune || !definition) return;
  if (instance.runes?.length || !rune.categories.includes(definition.category) || run.gold < rune.price) return;

  run.gold -= rune.price;
  instance.runes = [runeId];
  instance.currentDurability = getInstanceMaxDurability(instance);
  discoverRunes([runeId]);
  restLogElement.textContent = `${rune.name} aplicada a ${definition.name}.`;
  Storage.save(run);
  updateRestUi();
}

function rerollRunes() {
  const run = gameState.run;
  const state = run?.restState;
  if (!run || !state) return;
  const cost = getRuneRerollCost(state.runeRerollCount || 0);
  if (run.gold < cost) {
    restLogElement.textContent = `Necesitas ${cost} de oro para rerollear las runas.`;
    return;
  }
  run.gold -= cost;
  state.runeRerollCount = (state.runeRerollCount || 0) + 1;
  state.runeOffers = generateRuneOffers();
  restLogElement.textContent = `Las runas ofrecidas han cambiado por ${cost} de oro.`;
  Storage.save(run);
  updateRestUi();
}

function evolveSelectedItem() {
  const run = gameState.run;
  const instance = getRestSelectedInstance();
  const recipe = evolutionBySource.get(instance?.itemId);
  if (!run || !instance || !recipe) return;
  const status = getEvolutionStatus(instance, recipe);
  if (!status.ready || run.gold < recipe.cost) return;

  const source = itemDefinitions.get(instance.itemId);
  const target = itemDefinitions.get(recipe.targetItemId);
  run.gold -= recipe.cost;
  instance.evolvedFrom = source.id;
  instance.itemId = target.id;
  instance.durabilityLevel = 0;
  instance.runes = (instance.runes || []).filter(id => !(recipe.consumesRunes || []).includes(id));
  instance.currentDurability = getInstanceMaxDurability(instance);
  instance.broken = false;
  instance.usedThisTurn = false;
  addUnique(run.discoveredItems, [target.id]);
  discoverItems([target.id]);
  discoverEvolution(recipe.id);
  restLogElement.textContent = `${source.name} ha evolucionado a ${target.name}.`;
  Storage.save(run);
  updateRestUi();
}

function openCodex(tab = gameState.codexTab || "items") {
  gameState.codexTab = tab;
  codexModal.hidden = false;
  renderCodex();
}

function closeCodex() {
  codexModal.hidden = true;
}

function renderCodex() {
  const meta = Storage.loadMeta();
  codexTabButtons.forEach(button => button.classList.toggle("is-active", button.dataset.codexTab === gameState.codexTab));
  codexContentElement.innerHTML = "";

  if (gameState.codexTab === "items") {
    for (const definition of itemDefinitions.values()) {
      const known = meta.discoveredItems.includes(definition.id);
      codexContentElement.append(createCodexEntry(
        known ? definition.sprite : "./assets/sprites/ui/lock.png",
        known ? definition.name : "Objeto desconocido",
        known ? `${effectText(definition)} · ${materialName(definition.material)} · Durabilidad base ${definition.durability}. ${definition.description}` : "Actívalo con éxito durante una run para revelar su efecto.",
        known
      ));
    }
    return;
  }

  if (gameState.codexTab === "runes") {
    for (const rune of runeDefinitions.values()) {
      const known = meta.discoveredRunes.includes(rune.id);
      codexContentElement.append(createCodexEntry(
        known ? rune.icon : "./assets/sprites/ui/lock.png",
        known ? rune.name : "Runa desconocida",
        known ? `${rune.description} Compatible con: ${rune.categories.map(categoryName).join(", ")}.` : "Encuéntrala en un altar rúnico para revelar sus datos.",
        known
      ));
    }
    return;
  }

  if (gameState.codexTab === "enemies") {
    for (const enemy of enemyDefinitions.values()) {
      const known = meta.discoveredEnemies.includes(enemy.id);
      codexContentElement.append(createCodexEntry(
        known ? enemy.sprite : "./assets/sprites/ui/lock.png",
        known ? enemy.name : "Enemigo desconocido",
        known ? `Vida base ${enemy.maxHp} · Ataque ${enemy.attack} · Armadura ${enemy.armor}. La especie se adapta cada 3 derrotas durante una run.` : "Encuéntralo en combate para registrar la especie.",
        known
      ));
    }
    return;
  }

  for (const recipe of evolutionDefinitions.values()) {
    const source = itemDefinitions.get(recipe.sourceItemId);
    const target = itemDefinitions.get(recipe.targetItemId);
    const runeIds = recipe.requirements.runeIds || [];
    const requirementsKnown = meta.discoveredItems.includes(source.id) && runeIds.every(id => meta.discoveredRunes.includes(id));
    const completed = meta.discoveredEvolutions.includes(recipe.id);
    const known = requirementsKnown || completed;
    const entry = document.createElement("article");
    entry.className = `codex-entry evolution-entry ${known ? "is-known" : "is-locked"}`;
    entry.innerHTML = known ? `
      <div class="evolution-chain">
        <img src="${source.sprite}" alt="${source.name}">
        <span>+</span>
        ${runeIds.map(id => `<img src="${runeDefinitions.get(id).icon}" alt="${runeDefinitions.get(id).name}">`).join("")}
        <span>→</span>
        <img src="${target.sprite}" alt="${target.name}">
      </div>
      <div><h3>${source.name} → ${target.name}</h3><p>${evolutionRequirementText(recipe)}</p><p><strong>Resultado:</strong> ${effectText(target)} · Durabilidad base ${target.durability}. ${recipe.description}</p>${completed ? "<small>Evolución completada al menos una vez.</small>" : ""}</div>
    ` : `
      <img src="./assets/sprites/ui/lock.png" alt="Bloqueado">
      <div><h3>Receta desconocida</h3><p>Descubre el objeto de origen y las runas requeridas.</p></div>
    `;
    codexContentElement.append(entry);
  }
}

function createCodexEntry(image, title, description, known) {
  const entry = document.createElement("article");
  entry.className = `codex-entry ${known ? "is-known" : "is-locked"}`;
  entry.innerHTML = `<img src="${image}" alt=""><div><h3>${title}</h3><p>${description}</p></div>`;
  return entry;
}

function categoryName(category) {
  const names = { weapon: "armas", shield: "escudos", potion: "pociones", spellbook: "libros" };
  return names[category] || category;
}

function effectTextWithInstance(definition, instance) {
  const effect = getEffectiveEffect(definition, instance);
  return effectText({ ...definition, effect });
}


function showShop() {
  const run = gameState.run;
  if (!run) return;

  clearActiveItems();
  clearShopItem();
  closeBackpackModal();
  codexModal.hidden = true;
  resultModal.hidden = true;
  menuScreen.hidden = true;
  gameScreen.hidden = true;
  restScreen.hidden = true;
  shopScreen.hidden = false;
  gameState.scene = "shop";
  gameState.turn = "ended";
  gameState.combatOver = true;
  gameState.shopBusy = false;

  restorePlayerBetweenCombats();
  run.phase = "shop";
  const isNewShop = !run.shopState || run.shopState.round !== run.round;
  if (isNewShop) {
    run.shopState = createShopState(run.round);
  }
  shopLogElement.textContent = isNewShop
    ? "Selecciona un objeto de la vitrina."
    : "Tienda retomada. Las ofertas y el descuento se han conservado.";

  createShopBoard();
  renderShopOffers();
  updateShopUi();
  Storage.save(run);
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function createShopState(round) {
  const discount = SHOP_CONFIG.discountOptions[Math.floor(Math.random() * SHOP_CONFIG.discountOptions.length)];
  return {
    round,
    discount,
    rerollCount: 0,
    offers: generateShopOffers()
  };
}

function generateShopOffers() {
  const allItems = [...itemDefinitions.values()];
  const commonItems = allItems.filter(item => item.rarity === "common");
  const selected = [];

  if (commonItems.length) selected.push(commonItems[Math.floor(Math.random() * commonItems.length)]);

  while (selected.length < SHOP_CONFIG.offerCount && allItems.length) {
    let candidate = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const rolled = weightedChoice(allItems, item => rarityShopWeight(item.rarity));
      const copies = selected.filter(item => item.id === rolled.id).length;
      if (copies < 2) {
        candidate = rolled;
        break;
      }
    }
    candidate = candidate || allItems.find(item => selected.filter(value => value.id === item.id).length < 2) || allItems[0];
    selected.push(candidate);
  }

  return shuffle(selected).map(definition => ({
    offerId: createId("offer"),
    itemId: definition.id,
    price: rollShopPrice(definition.rarity)
  }));
}

function rarityShopWeight(rarity) {
  if (rarity === "rare") return 1;
  if (rarity === "uncommon") return 3;
  return 8;
}

function rollShopPrice(rarity) {
  const ranges = {
    common: [6, 10],
    uncommon: [13, 19],
    rare: [22, 32]
  };
  const [minimum, maximum] = ranges[rarity] || ranges.common;
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function getRerollCost(rerollCount = 0) {
  const costs = [4, 7, 11, 16];
  return costs[rerollCount] ?? (16 + (rerollCount - 3) * 6);
}

function rarityName(rarity) {
  const names = { common: "Común", uncommon: "Poco común", rare: "Raro" };
  return names[rarity] || "Común";
}

function renderShopOffers() {
  shopOffersElement.innerHTML = "";
  const run = gameState.run;
  const state = run?.shopState;
  if (!run || !state) return;

  state.offers.forEach((offer, slotIndex) => {
    if (!offer) {
      const empty = document.createElement("article");
      empty.className = "shop-offer is-empty";
      empty.innerHTML = `<strong>Hueco comprado</strong><span>El próximo reroll lo reabastece.</span>`;
      shopOffersElement.append(empty);
      return;
    }

    const definition = itemDefinitions.get(offer.itemId);
    if (!definition) return;
    const discovered = run.discoveredItems.includes(definition.id);
    const card = document.createElement("article");
    card.className = `shop-offer is-${definition.rarity || "common"}`;
    card.innerHTML = `
      <img src="${definition.sprite}" alt="${discovered ? definition.name : "Objeto no identificado"}">
      <span class="offer-rarity">${rarityName(definition.rarity)}</span>
      <h3 title="${discovered ? definition.name : "Objeto desconocido"}">${discovered ? definition.name : "Objeto desconocido"}</h3>
      <p class="offer-effect">${discovered ? effectText(definition) : "Efecto: ???"}</p>
      <p class="offer-meta">${materialName(definition.material)} · Durabilidad ${definition.durability}</p>
      <div class="offer-price"><img src="./assets/sprites/ui/gold_coin.png" alt=""><span>${offer.price}</span></div>
      <button type="button" data-shop-slot="${slotIndex}">Lanzar compra</button>
    `;
    const button = card.querySelector("button");
    button.disabled = gameState.shopBusy || run.gold < offer.price;
    button.title = run.gold < offer.price
      ? `Necesitas ${offer.price} de oro para garantizar la compra.`
      : "Soltar este objeto desde el centro del mini pachinko.";
    button.addEventListener("click", () => launchShopPurchase(slotIndex));
    shopOffersElement.append(card);
  });
}

function updateShopUi() {
  const run = gameState.run;
  const state = run?.shopState;
  if (!run || !state) return;

  shopGoldValue.textContent = run.gold;
  shopDiscountLabel.textContent = `-${state.discount}%`;
  shopRoundLabel.textContent = `Tras ronda ${state.round}`;
  const rerollCost = getRerollCost(state.rerollCount);
  rerollCostElement.textContent = rerollCost;
  rerollButton.disabled = gameState.shopBusy || run.gold < rerollCost;
  leaveShopButton.disabled = gameState.shopBusy;
  shopMenuButton.disabled = gameState.shopBusy;
  shopBackpackButton.disabled = gameState.shopBusy;
  renderShopOffers();
}

function rerollShop() {
  const run = gameState.run;
  const state = run?.shopState;
  if (!run || !state || gameState.shopBusy) return;

  const cost = getRerollCost(state.rerollCount);
  if (run.gold < cost) {
    shopLogElement.textContent = `Necesitas ${cost} de oro para hacer reroll.`;
    return;
  }

  run.gold -= cost;
  state.rerollCount += 1;
  state.offers = generateShopOffers();
  shopLogElement.textContent = `Vitrina reabastecida por ${cost} de oro. El descuento sigue siendo -${state.discount}%.`;
  Storage.save(run);
  updateShopUi();
}

function createShopBoard() {
  clearShopItem();
  for (const body of gameState.shopBodies) Composite.remove(shopEngine.world, body);
  gameState.shopBodies = [];

  const wallOptions = {
    isStatic: true,
    restitution: 0.56,
    friction: 0.04,
    label: "shop-wall",
    render: { fillStyle: SHOP_CONFIG.colors.wall }
  };
  const bodies = [
    Bodies.rectangle(-20, SHOP_CONFIG.height / 2, 40, SHOP_CONFIG.height, wallOptions),
    Bodies.rectangle(SHOP_CONFIG.width + 20, SHOP_CONFIG.height / 2, 40, SHOP_CONFIG.height, wallOptions),
    Bodies.rectangle(SHOP_CONFIG.width / 2, 570, 18, 155, wallOptions)
  ];

  // Mini pachinko de tienda: más ancho, con gran separación entre tornillos
  // y sin la última fila inferior para que escudos y objetos grandes puedan pasar.
  const pegSpacing = 118;
  const pegRows = [
    { y: 136, columns: 7, startX: 96, skip: [] },
    { y: 210, columns: 6, startX: 155, skip: [2] },
    { y: 288, columns: 7, startX: 96, skip: [4] },
    { y: 372, columns: 6, startX: 155, skip: [1, 4] }
  ];

  for (const row of pegRows) {
    for (let column = 0; column < row.columns; column += 1) {
      if (row.skip.includes(column)) continue;
      const x = row.startX + column * pegSpacing;
      if (x > SHOP_CONFIG.width - 42) continue;
      bodies.push(Bodies.circle(x, row.y, 9, {
        isStatic: true,
        restitution: 0.88,
        friction: 0.015,
        label: "shop-peg",
        render: { fillStyle: SHOP_CONFIG.colors.peg, strokeStyle: "#85859c", lineWidth: 2 }
      }));
    }
  }

  bodies.push(
    Bodies.rectangle(SHOP_CONFIG.width * 0.25, SHOP_CONFIG.sensorY, SHOP_CONFIG.width / 2 - 12, 55, {
      isStatic: true, isSensor: true, label: "shop-normal-slot", render: { visible: false }
    }),
    Bodies.rectangle(SHOP_CONFIG.width * 0.75, SHOP_CONFIG.sensorY, SHOP_CONFIG.width / 2 - 12, 55, {
      isStatic: true, isSensor: true, label: "shop-discount-slot", render: { visible: false }
    })
  );

  gameState.shopBodies = bodies;
  Composite.add(shopEngine.world, bodies);
}

function createShopItemBody(definition) {
  const physicsScale = 0.82;
  const vertices = definition.vertices.map(vertex => ({ x: vertex.x * physicsScale, y: vertex.y * physicsScale }));
  let body = Bodies.fromVertices(
    SHOP_CONFIG.width / 2,
    SHOP_CONFIG.launchY,
    [vertices],
    {
      label: "shop-item",
      restitution: Math.max(0.38, definition.restitution || 0.4),
      friction: definition.friction || 0.14,
      frictionAir: 0.0035,
      density: definition.density || 0.002,
      plugin: { pachinkrawlerShop: { itemId: definition.id, resolved: false, physicsScale } },
      render: { visible: false }
    },
    true
  );

  if (!body) {
    body = Bodies.rectangle(SHOP_CONFIG.width / 2, SHOP_CONFIG.launchY, 44, 70, {
      label: "shop-item",
      restitution: 0.45,
      render: { visible: false },
      plugin: { pachinkrawlerShop: { itemId: definition.id, resolved: false, physicsScale } }
    });
  }

  body.label = "shop-item";
  body.plugin.pachinkrawlerShop = body.plugin.pachinkrawlerShop || { itemId: definition.id, resolved: false, physicsScale };
  for (const part of body.parts) {
    part.label = "shop-item-part";
    part.render.visible = false;
  }
  return body;
}

function launchShopPurchase(slotIndex) {
  const run = gameState.run;
  const state = run?.shopState;
  const offer = state?.offers?.[slotIndex];
  if (!run || !state || !offer || gameState.shopBusy) return;
  if (run.gold < offer.price) {
    shopLogElement.textContent = `Necesitas ${offer.price} de oro para garantizar esta compra.`;
    return;
  }

  const definition = itemDefinitions.get(offer.itemId);
  if (!definition) return;
  clearShopItem();
  gameState.shopBusy = true;
  gameState.shopPurchase = { slotIndex, offer: clone(offer), startedAt: Date.now() };
  const body = createShopItemBody(definition);
  gameState.shopActiveBody = body;
  Body.setAngle(body, randomBetween(-0.13, 0.13));
  Body.setVelocity(body, { x: randomBetween(-0.22, 0.22), y: 0 });
  Body.setAngularVelocity(body, randomBetween(-0.045, 0.045));
  Composite.add(shopEngine.world, body);
  shopLogElement.textContent = `${definition.name} cae desde el centro…`;
  updateShopUi();
}

function getShopRootBody(body) {
  return body?.parent && body.parent !== body ? body.parent : body;
}

function resolveShopPurchase(outcome) {
  const run = gameState.run;
  const state = run?.shopState;
  const purchase = gameState.shopPurchase;
  const body = gameState.shopActiveBody;
  if (!run || !state || !purchase || !body) return;

  const root = getShopRootBody(body);
  const data = root.plugin?.pachinkrawlerShop;
  if (!data || data.resolved) return;
  data.resolved = true;

  const offer = state.offers[purchase.slotIndex];
  if (!offer || offer.offerId !== purchase.offer.offerId) {
    clearShopItem();
    gameState.shopBusy = false;
    updateShopUi();
    return;
  }

  const definition = itemDefinitions.get(offer.itemId);
  const paid = outcome === "discount"
    ? Math.max(1, Math.ceil(offer.price * (100 - state.discount) / 100))
    : offer.price;

  run.gold = Math.max(0, run.gold - paid);
  run.inventory.push(createInventoryInstance(offer.itemId));
  state.offers[purchase.slotIndex] = null;
  Storage.save(run);

  const saving = offer.price - paid;
  shopLogElement.textContent = outcome === "discount"
    ? `${definition.name} comprado por ${paid} de oro. ¡Has ahorrado ${saving} con el -${state.discount}%!`
    : `${definition.name} comprado por ${paid} de oro a precio normal.`;

  window.setTimeout(() => {
    clearShopItem();
    gameState.shopBusy = false;
    updateShopUi();
  }, 420);
}

function clearShopItem() {
  if (gameState.shopActiveBody) Composite.remove(shopEngine.world, gameState.shopActiveBody);
  gameState.shopActiveBody = null;
  gameState.shopPurchase = null;
}

function leaveShop() {
  if (gameState.shopBusy || !gameState.run) return;
  Storage.save(gameState.run);
  showRest();
}

Events.on(shopEngine, "collisionStart", event => {
  for (const pair of event.pairs) {
    const bodies = [pair.bodyA, pair.bodyB];
    const itemPart = bodies.find(body => body.label === "shop-item" || body.label === "shop-item-part");
    if (!itemPart) continue;
    const other = itemPart === pair.bodyA ? pair.bodyB : pair.bodyA;
    if (other.label === "shop-normal-slot") resolveShopPurchase("normal");
    else if (other.label === "shop-discount-slot") resolveShopPurchase("discount");
  }
});

Events.on(shopEngine, "afterUpdate", () => {
  const body = gameState.shopActiveBody;
  if (!body) return;
  const elapsed = Date.now() - (gameState.shopPurchase?.startedAt || Date.now());
  if (body.position.y > SHOP_CONFIG.height + 80 || elapsed > 12000) {
    resolveShopPurchase(body.position.x >= SHOP_CONFIG.width / 2 ? "discount" : "normal");
  }
});

Events.on(shopRender, "afterRender", () => {
  const context = shopRender.context;
  const state = gameState.run?.shopState;
  context.save();

  context.fillStyle = SHOP_CONFIG.colors.normal;
  context.fillRect(4, 590, SHOP_CONFIG.width / 2 - 8, 66);
  context.fillStyle = SHOP_CONFIG.colors.discount;
  context.fillRect(SHOP_CONFIG.width / 2 + 4, 590, SHOP_CONFIG.width / 2 - 8, 66);
  context.fillStyle = "#fff";
  context.font = "800 17px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("PRECIO NORMAL", SHOP_CONFIG.width * .25, 624);
  context.fillText(state ? `DESCUENTO -${state.discount}%` : "DESCUENTO", SHOP_CONFIG.width * .75, 624);

  const body = gameState.shopActiveBody;
  if (body) {
    const data = body.plugin?.pachinkrawlerShop;
    const definition = itemDefinitions.get(data?.itemId);
    const image = itemImages.get(data?.itemId);
    if (definition && image?.complete && image.naturalWidth) {
      const visualScale = definition.spriteScale * (data.physicsScale || .82);
      const origin = definition.spriteOrigin || { x: image.naturalWidth / 2, y: image.naturalHeight / 2 };
      context.translate(body.position.x, body.position.y);
      context.rotate(body.angle);
      context.drawImage(
        image,
        -origin.x * visualScale,
        -origin.y * visualScale,
        image.naturalWidth * visualScale,
        image.naturalHeight * visualScale
      );
    }
  }
  context.restore();
});

Events.on(engine, "collisionStart", event => {
  for (const pair of event.pairs) {
    const bodies = [pair.bodyA, pair.bodyB];
    const itemPart = bodies.find(body => body.label === "player-item" || body.label === "player-item-part");
    if (!itemPart) continue;

    const other = itemPart === pair.bodyA ? pair.bodyB : pair.bodyA;
    const item = getRootBody(itemPart);

    if (other.label === "activation-slot") resolveItem(item, "activation");
    else if (other.label === "void-slot") resolveItem(item, "void");
    else if (other.label === "hazard") damageItemFromHazard(item, other);
  }
});

Events.on(engine, "afterUpdate", () => {
  for (const item of [...gameState.activeItems]) {
    if (
      item.position.y > CONFIG.boardHeight + 150 ||
      item.position.x < -180 ||
      item.position.x > CONFIG.boardWidth + 180
    ) {
      resolveItem(item, "void");
    }
  }
});

function endPlayerTurn() {
  if (gameState.turn !== "player" || gameState.combatOver) return;

  const discarded = gameState.activeItems.size;
  clearActiveItems();
  gameState.turn = "enemy";
  closeBackpackModal();

  if (discarded > 0) {
    addLog(`Pasaste turno: ${discarded} objeto${discarded === 1 ? "" : "s"} aún activo${discarded === 1 ? "" : "s"} se pierde${discarded === 1 ? "" : "n"} sin activar.`);
  } else {
    addLog("Turno enemigo…");
  }

  updateUi();
  window.setTimeout(enemyTurn, CONFIG.enemyTurnDelayMs);
}

function enemyTurn() {
  if (gameState.combatOver) return;

  processEnemyDamageStatuses();
  const frontEnemy = livingEnemies()[0];
  if (!frontEnemy) {
    finishCombatVictory();
    return;
  }

  let attackMessage = "";
  let totalHpDamage = 0;
  let totalBlocked = 0;

  // Solo el enemigo situado al frente puede actuar. La retaguardia espera
  // hasta que los enemigos anteriores sean derrotados.
  const stun = frontEnemy.statuses.stun;
  if (stun?.turns > 0) {
    stun.turns -= 1;
    if (stun.turns <= 0) delete frontEnemy.statuses.stun;
    attackMessage = `${frontEnemy.name} está aturdido y no puede atacar`;
  } else {
    let attack = frontEnemy.attack;
    const freeze = frontEnemy.statuses.freeze;
    if (freeze?.turns > 0) {
      attack = Math.max(0, attack - freeze.power);
      freeze.turns -= 1;
      if (freeze.turns <= 0) delete frontEnemy.statuses.freeze;
    }

    const blocked = Math.min(gameState.run.player.armor, attack);
    gameState.run.player.armor -= blocked;
    const hpDamage = Math.max(0, attack - blocked);
    gameState.run.player.hp = Math.max(0, gameState.run.player.hp - hpDamage);
    totalBlocked = blocked;
    totalHpDamage = hpDamage;
    attackMessage = `${frontEnemy.name}, desde el frente: ${attack}`;
  }

  if (totalHpDamage > 0 || totalBlocked > 0) flashPlayer();
  addLog(`${attackMessage}. Total: ${totalBlocked} bloqueado, ${totalHpDamage} de daño. La retaguardia no ataca.`);

  if (gameState.run.player.hp <= 0) {
    finishCombatDefeat();
    return;
  }

  resetTurnPool();
  gameState.turn = "player";
  updateUi();
  saveSafePoint();
}

function processEnemyDamageStatuses() {
  const messages = [];
  for (const enemy of livingEnemies()) {
    for (const statusId of ["burn", "bleed", "poison"]) {
      const status = enemy.statuses[statusId];
      if (!status?.turns) continue;
      enemy.hp = Math.max(0, enemy.hp - status.power);
      enemy.flashUntil = Date.now() + 220;
      messages.push(`${enemy.name} recibe ${status.power} por ${statusDefinitions[statusId]?.name || statusId}`);
      status.turns -= 1;
      if (status.turns <= 0) delete enemy.statuses[statusId];
      countDefeatIfNeeded(enemy);
      if (enemy.hp <= 0) break;
    }
  }
  if (messages.length) addLog(messages.join(" · "));
  updateCombatantsUi();
}

function flashPlayer() {
  gameState.playerFlashUntil = Date.now() + 240;
  updateCombatantsUi();
  window.setTimeout(updateCombatantsUi, 260);
}

function shakeMachine() {
  if (!gameState.shakeReady || gameState.activeItems.size === 0) return;

  gameState.shakeReady = false;
  updateUi();

  for (const item of gameState.activeItems) {
    Sleeping.set(item, false);
    Body.applyForce(item, item.position, {
      x: randomBetween(-0.012, 0.012) * item.mass,
      y: randomBetween(-0.006, -0.002) * item.mass
    });
    Body.setAngularVelocity(item, item.angularVelocity + randomBetween(-0.08, 0.08));
  }

  window.setTimeout(() => {
    gameState.shakeReady = true;
    updateUi();
  }, CONFIG.shakeCooldownMs);
}

function removeItem(item, shouldUpdate = true) {
  Composite.remove(engine.world, item);
  gameState.activeItems.delete(item);
  if (shouldUpdate) updateUi();
}

function clearActiveItems() {
  for (const item of [...gameState.activeItems]) {
    const data = item.plugin?.pachinkrawler;
    if (data) data.resolved = true;
    Composite.remove(engine.world, item);
  }
  gameState.activeItems.clear();
}

function openBackpack() {
  renderInventory();
  backpackModal.hidden = false;
}

function closeBackpackModal() {
  backpackModal.hidden = true;
}

function renderInventory() {
  inventoryList.innerHTML = "";
  if (!gameState.run) return;

  for (const instance of gameState.run.inventory) {
    const definition = itemDefinitions.get(instance.itemId);
    if (!definition) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "inventory-item";
    button.classList.toggle("is-selected", instance.instanceId === gameState.selectedInstanceId && !instance.usedThisTurn && !instance.broken);
    button.classList.toggle("is-used", instance.usedThisTurn);
    button.classList.toggle("is-broken", instance.broken);
    button.classList.add("is-readonly");
    button.setAttribute("aria-disabled", "true");
    const rune = runeDefinitions.get(instance.runes?.[0]);
    const maxDurability = getInstanceMaxDurability(instance);
    button.setAttribute("aria-label", `${definition.name}. ${effectTextWithInstance(definition, instance)}. Material ${materialName(definition.material)}. Durabilidad ${instance.currentDurability} de ${maxDurability}.${rune ? ` Runa ${rune.name}.` : ""}`);
    button.dataset.tooltip = `${definition.name} · ${effectTextWithInstance(definition, instance)} · ${materialName(definition.material)} · Durabilidad ${instance.currentDurability}/${maxDurability}${rune ? ` · ${rune.name}` : ""}. ${definition.description}`;
    button.innerHTML = `
      <img src="${definition.sprite}" alt="">
      <span class="durability-pip">${instance.currentDurability}/${maxDurability}</span>
      ${rune ? `<img class="inventory-rune-badge" src="${rune.icon}" alt="${rune.name}">` : ""}
    `;
    inventoryList.append(button);
  }
}

function materialName(material) {
  const labels = {
    wood: "Madera",
    metal: "Metal",
    glass: "Vidrio",
    paper: "Papel",
    mixed: "Mixto"
  };
  return labels[material] || "Material desconocido";
}

function effectText(definition) {
  const effect = definition.effect;
  if (!effect) return "Efecto desconocido";
  if (effect.type === "armor") return `+${effect.value} de armadura`;
  if (effect.type === "heal") return `+${effect.value} de vida`;
  if (effect.type === "mana") return `+${effect.value} de maná`;
  if (effect.type === "spellHeal") return `Cura ${effect.value} · ${effect.manaCost} MP`;
  if (effect.type === "spellDamage") return `${effect.value} de daño · ${effect.manaCost} MP`;
  if (effect.type === "cleave") return `${effect.value} al frente · ${effect.splash} al siguiente`;
  if (effect.type === "execute") return `${effect.value} de daño · bonus contra heridos`;
  const target = effect.target === "back" ? "retaguardia" : "frente";
  return `${effect.value} de daño · ${target}`;
}

render.canvas.addEventListener("pointerdown", event => {
  const bounds = render.canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * (CONFIG.boardWidth / bounds.width);
  const y = (event.clientY - bounds.top) * (CONFIG.boardHeight / bounds.height);

  if (y <= CONFIG.launchAreaHeight) dropItem(x);
  else setStatus("Haz clic dentro de la franja superior.");
});

Events.on(render, "afterRender", () => {
  const context = render.context;
  context.save();
  drawLaunchArea(context);
  drawBottomSlots(context);
  drawHazards(context);
  drawItemSprites(context);
  if (gameState.debugHitboxes) drawHitboxes(context);
  context.restore();
});

function drawLaunchArea(context) {
  context.fillStyle = CONFIG.colors.launchArea;
  context.globalAlpha = 0.75;
  context.fillRect(0, 0, CONFIG.boardWidth, CONFIG.launchAreaHeight);
  context.globalAlpha = 1;
  context.strokeStyle = CONFIG.colors.launchLine;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, CONFIG.launchAreaHeight);
  context.lineTo(CONFIG.boardWidth, CONFIG.launchAreaHeight);
  context.stroke();
  context.fillStyle = "#f4f4f8";
  context.font = "600 18px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let text = "COMBATE TERMINADO";
  if (!gameState.combatOver && gameState.turn === "player") {
    text = remainingItems().length ? "HAZ CLIC AQUÍ PARA SOLTAR UN OBJETO" : "SIN OBJETOS · PUEDES PASAR EL TURNO";
  } else if (!gameState.combatOver) {
    text = "TURNO ENEMIGO";
  }
  context.fillText(text, CONFIG.boardWidth / 2, CONFIG.launchAreaHeight / 2);
}

function drawBottomSlots(context) {
  const zoneHeight = CONFIG.boardHeight - CONFIG.bottomZoneTop;
  const labelY = CONFIG.bottomZoneTop + zoneHeight * 0.52;
  context.font = "700 16px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const slot of gameState.slots) {
    if (slot.type === "activation") {
      context.fillStyle = CONFIG.colors.activation;
      context.fillRect(slot.x + 5, CONFIG.bottomZoneTop, slot.width - 10, zoneHeight);
      context.fillStyle = "#f4fff9";
      context.fillText("ACTIVAR", slot.x + slot.width / 2, labelY);
    } else if (slot.type === "void") {
      context.fillStyle = CONFIG.colors.void;
      context.fillRect(slot.x + 5, CONFIG.bottomZoneTop, slot.width - 10, zoneHeight);
      context.strokeStyle = "#555568";
      context.lineWidth = 3;
      context.setLineDash([9, 9]);
      context.strokeRect(slot.x + 10, CONFIG.bottomZoneTop + 6, slot.width - 20, zoneHeight - 12);
      context.setLineDash([]);
      context.fillStyle = "#a5a5b7";
      context.fillText("VACÍO", slot.x + slot.width / 2, labelY);
    }
  }
}

function drawHazards(context) {
  const time = performance.now();
  for (const body of gameState.hazardBodies) {
    const hazardData = body.plugin?.pachinkrawlerHazard;
    const definition = hazardDefinitions.get(hazardData?.definitionId);
    const image = hazardImages.get(hazardData?.definitionId);
    if (!definition || !image?.complete || !image.naturalWidth) continue;

    let angle = body.angle;
    let scale = 1;
    if (definition.id === "saw") angle += time / 350;
    if (definition.id === "fire") scale = 1 + Math.sin(time / 180) * 0.035;

    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(angle);
    context.scale(scale, scale);
    context.drawImage(
      image,
      -definition.renderWidth / 2,
      -definition.renderHeight / 2,
      definition.renderWidth,
      definition.renderHeight
    );
    context.restore();
  }
}

function drawItemSprites(context) {
  for (const item of gameState.activeItems) {
    const data = item.plugin?.pachinkrawler;
    const definition = itemDefinitions.get(data?.itemId);
    const image = itemImages.get(data?.itemId);
    if (!definition || !image?.complete || !image.naturalWidth) continue;

    const scale = definition.spriteScale;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const origin = definition.spriteOrigin || { x: image.naturalWidth / 2, y: image.naturalHeight / 2 };

    context.save();
    context.translate(item.position.x, item.position.y);
    context.rotate(item.angle);
    if ((data.flashUntil || 0) > Date.now()) {
      context.globalAlpha = .55;
      context.filter = "brightness(2) saturate(.4)";
    }
    context.drawImage(image, -origin.x * scale, -origin.y * scale, width, height);
    context.restore();
  }
}

function drawHitboxes(context) {
  context.lineWidth = 2;

  context.strokeStyle = "#ff4d6d";
  context.fillStyle = "rgba(255,77,109,.13)";
  for (const item of gameState.activeItems) {
    const parts = item.parts.length > 1 ? item.parts.slice(1) : item.parts;
    for (const part of parts) drawVertices(context, part.vertices);
  }

  context.strokeStyle = "#ffb347";
  context.fillStyle = "rgba(255,179,71,.12)";
  for (const hazard of gameState.hazardBodies) drawVertices(context, hazard.vertices);
}

function drawVertices(context, vertices) {
  context.beginPath();
  vertices.forEach((vertex, index) => {
    if (index) context.lineTo(vertex.x, vertex.y);
    else context.moveTo(vertex.x, vertex.y);
  });
  context.closePath();
  context.fill();
  context.stroke();
}

function updateUi() {
  if (!gameState.run) return;
  const player = gameState.run.player;
  const selectedInstance = getSelectedInstance();
  const definition = selectedInstance ? itemDefinitions.get(selectedInstance.itemId) : null;

  armorElement.textContent = player.armor;
  healthElement.textContent = `${player.hp}/${player.maxHp}`;
  manaElement.textContent = `${player.mp}/${player.maxMp}`;
  healthFillElement.style.width = `${percentage(player.hp, player.maxHp)}%`;
  manaFillElement.style.width = `${percentage(player.mp, player.maxMp)}%`;
  poolCountElement.textContent = remainingItems().length;
  selectedNameElement.textContent = definition?.name || "Sin objetos";
  selectedDetailElement.textContent = definition && selectedInstance
    ? `${effectTextWithInstance(definition, selectedInstance)} · ${materialName(definition.material)} · Durabilidad ${selectedInstance.currentDurability}/${getInstanceMaxDurability(selectedInstance)}${selectedInstance.runes?.length ? ` · ${runeDefinitions.get(selectedInstance.runes[0])?.name}` : ""}`
    : "Pasa el turno cuando hayas terminado.";
  selectedImageElement.hidden = !definition;
  if (definition) {
    selectedImageElement.src = definition.sprite;
    selectedImageElement.alt = definition.name;
  }

  roundLabelElement.textContent = `Ronda ${gameState.run.round}`;
  runModeLabel.textContent = gameState.run.isTestMode ? "Modo de pruebas · no se guarda" : "Run normal · guardado automático";
  turnLabelElement.textContent = gameState.combatOver
    ? "Combate terminado"
    : gameState.turn === "player"
      ? "Turno del jugador"
      : "Turno del enemigo";

  goldValueElement.textContent = gameState.run.gold;
  inventoryCountElement.textContent = gameState.run.inventory.length;
  passButton.disabled = gameState.turn !== "player" || gameState.combatOver;
  backpackButton.disabled = !gameState.run;
  shakeButton.disabled = !gameState.shakeReady || gameState.activeItems.size === 0 || gameState.combatOver;
  setStatus(`Objetos activos: ${gameState.activeItems.size} · Disponibles: ${remainingItems().length} · Rotos: ${gameState.run.inventory.filter(item => item.broken).length}`);

  updateCombatantsUi();
  updateAdaptationSummary();
  if (!backpackModal.hidden) renderInventory();
}

function updateCombatantsUi() {
  if (!gameState.run) return;
  playerCombatantElement.classList.toggle("is-hit", gameState.playerFlashUntil > Date.now());
  playerStatusesElement.innerHTML = "";

  const living = livingEnemies();
  formationLabelElement.textContent = `${living.length} enemigo${living.length === 1 ? "" : "s"} activo${living.length === 1 ? "" : "s"}`;
  enemyFormationElement.innerHTML = "";

  gameState.enemies.forEach(enemy => {
    const livingIndex = living.findIndex(candidate => candidate.combatId === enemy.combatId);
    const card = document.createElement("article");
    card.className = "enemy-card";
    card.dataset.enemyId = enemy.combatId;
    card.classList.toggle("is-defeated", enemy.hp <= 0);
    card.classList.toggle("is-front", livingIndex === 0 && enemy.hp > 0);
    card.classList.toggle("is-back", livingIndex === living.length - 1 && living.length > 1 && enemy.hp > 0);
    card.classList.toggle("is-hit", enemy.flashUntil > Date.now());

    const positionText = enemy.hp <= 0
      ? "Derrotado"
      : livingIndex === 0
        ? "Frente"
        : livingIndex === living.length - 1
          ? "Retaguardia"
          : "Centro";

    card.innerHTML = `
      ${enemy.adaptationLevel > 0 ? `<span class="adaptation-badge">A${enemy.adaptationLevel}</span>` : ""}
      <span class="enemy-position">${positionText}</span>
      <img class="enemy-sprite" src="${enemy.sprite}" alt="${enemy.name}">
      <strong class="enemy-name" title="${enemy.name}">${enemy.name}</strong>
      <div class="enemy-health-label"><span>Vida</span><strong>${enemy.hp}/${enemy.maxHp}</strong></div>
      <div class="enemy-health-bar"><div class="enemy-health-fill" style="width:${percentage(enemy.hp, enemy.maxHp)}%"></div></div>
      <span class="enemy-armor">Armadura: ${enemy.armor}</span>
      <div class="status-icons"></div>
    `;

    const statusesContainer = card.querySelector(".status-icons");
    renderStatuses(statusesContainer, enemy.statuses);
    enemyFormationElement.append(card);
  });
}

function renderStatuses(container, statuses) {
  for (const [statusId, status] of Object.entries(statuses || {})) {
    const definition = statusDefinitions[statusId];
    if (!definition || status.turns <= 0) continue;
    const icon = document.createElement("span");
    icon.className = "status-icon";
    icon.title = `${definition.name}: ${status.turns} turno${status.turns === 1 ? "" : "s"}`;
    icon.innerHTML = `<img src="${definition.sprite}" alt="${definition.name}"><span>${status.turns}</span>`;
    container.append(icon);
  }
}

function updateAdaptationSummary() {
  const adapted = Object.entries(gameState.run.adaptation)
    .map(([id, defeats]) => ({ definition: enemyDefinitions.get(id), defeats, level: Math.floor(defeats / 3) }))
    .filter(entry => entry.level > 0 && entry.definition)
    .sort((a, b) => b.level - a.level);

  adaptationSummaryElement.textContent = adapted.length
    ? adapted.map(entry => `${entry.definition.name}: Adaptación ${Math.min(entry.level, CONFIG.maxAdaptationLevel)}`).join(" · ")
    : "Los enemigos se adaptarán cada 3 derrotas de la misma especie.";
}

function addLog(message) {
  logElement.textContent = message;
}

function setStatus(message) {
  statusElement.textContent = message;
}

function toggleDebug() {
  gameState.debugHitboxes = !gameState.debugHitboxes;
  debugButton.textContent = `Hitboxes: ${gameState.debugHitboxes ? "ON" : "OFF"}`;
}

function returnToMenu() {
  if (gameState.scene === "shop" || gameState.scene === "rest") {
    Storage.save(gameState.run);
    showMenu();
    return;
  }

  const hasUnsafeProgress = gameState.activeItems.size > 0 || (gameState.turn === "player" && !gameState.combatOver);
  if (hasUnsafeProgress) {
    const message = gameState.run?.isTestMode
      ? "El modo de pruebas no se guarda. ¿Volver al menú?"
      : "La partida continuará desde el inicio del turno guardado. ¿Volver al menú?";
    if (!window.confirm(message)) return;
  }
  showMenu();
}

function handleResultAction() {
  resultModal.hidden = true;
  if (gameState.resultAction === "new-run") beginNewRun(false);
  else if (gameState.resultAction === "rest") showRest();
  else if (gameState.resultAction === "shop") showShop();
  else startNextCombat();
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function percentage(value, maximum) {
  if (maximum <= 0) return 0;
  return clamp((value / maximum) * 100, 0, 100);
}

function randomBetween(minimum, maximum) {
  return Math.random() * (maximum - minimum) + minimum;
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function weightedChoice(values, getWeight) {
  const total = values.reduce((sum, value) => sum + getWeight(value), 0);
  let roll = Math.random() * total;
  for (const value of values) {
    roll -= getWeight(value);
    if (roll <= 0) return value;
  }
  return values[values.length - 1];
}

newRunButton.addEventListener("click", () => beginNewRun(false));
testRunButton.addEventListener("click", () => beginNewRun(true));
continueButton.addEventListener("click", continueSavedRun);
deleteSaveButton.addEventListener("click", () => {
  if (!Storage.hasSave()) return;
  if (!window.confirm("¿Borrar la partida guardada?")) return;
  Storage.clear();
  refreshMenu();
});
menuButton.addEventListener("click", returnToMenu);
shakeButton.addEventListener("click", shakeMachine);
debugButton.addEventListener("click", toggleDebug);
passButton.addEventListener("click", endPlayerTurn);
backpackButton.addEventListener("click", openBackpack);
closeBackpackButton.addEventListener("click", closeBackpackModal);
backpackModal.addEventListener("click", event => {
  if (event.target === backpackModal) closeBackpackModal();
});
nextCombatButton.addEventListener("click", handleResultAction);
resultMenuButton.addEventListener("click", showMenu);
rerollButton.addEventListener("click", rerollShop);
leaveShopButton.addEventListener("click", leaveShop);
shopMenuButton.addEventListener("click", returnToMenu);
shopBackpackButton.addEventListener("click", openBackpack);
menuCodexButton.addEventListener("click", () => openCodex("items"));
restMenuButton.addEventListener("click", returnToMenu);
openShopButton.addEventListener("click", showShop);
openCodexButton.addEventListener("click", () => openCodex("items"));
restBackpackButton.addEventListener("click", openBackpack);
continueRestButton.addEventListener("click", startNextCombat);
upgradeDurabilityButton.addEventListener("click", upgradeSelectedDurability);
evolveItemButton.addEventListener("click", evolveSelectedItem);
runeRerollButton.addEventListener("click", rerollRunes);
closeCodexButton.addEventListener("click", closeCodex);
codexModal.addEventListener("click", event => {
  if (event.target === codexModal) closeCodex();
});
codexTabButtons.forEach(button => button.addEventListener("click", () => {
  gameState.codexTab = button.dataset.codexTab;
  renderCodex();
}));

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!backpackModal.hidden) closeBackpackModal();
    else if (!codexModal.hidden) closeCodex();
  }
});

refreshMenu();
showMenu();
