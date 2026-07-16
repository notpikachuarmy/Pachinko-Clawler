"use strict";

const { Engine, Render, Runner, Bodies, Body, Composite, Events, Common, Sleeping } = Matter;
if (window.decomp) Common.setDecomp(window.decomp);

const CONFIG = Object.freeze({
  boardWidth: 720,
  boardHeight: 900,
  launchAreaHeight: 110,
  bottomZoneTop: 790,
  wallThickness: 40,
  pegRadius: 11,
  shakeCooldownMs: 1200,
  enemyAttack: 3,
  enemyTurnDelayMs: 450,
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

const STARTING_LOADOUT = Object.freeze([
  "wood_sword",
  "wood_shield",
  "hp_potion"
]);

const itemDefinitions = new Map((window.PACHINKRAWLER_ITEMS || []).map(item => [item.id, item]));
const itemImages = new Map();
for (const definition of itemDefinitions.values()) {
  const image = new Image();
  image.src = definition.sprite;
  itemImages.set(definition.id, image);
}

const $ = selector => document.querySelector(selector);
const gameContainer = $("#game-container");
const shakeButton = $("#shake-button");
const debugButton = $("#debug-button");
const passButton = $("#pass-button");
const backpackButton = $("#backpack-button");
const closeBackpack = $("#close-backpack");
const backpackModal = $("#backpack-modal");
const inventoryList = $("#inventory-list");
const statusElement = $("#status");
const enemyHpElement = $("#enemy-hp");
const armorElement = $("#player-armor");
const healthElement = $("#player-health");
const healthFillElement = $("#player-health-fill");
const manaElement = $("#player-mana");
const manaFillElement = $("#player-mana-fill");
const logElement = $("#event-log");
const poolCountElement = $("#pool-count");
const selectedNameElement = $("#selected-name");
const selectedImageElement = $("#selected-image");
const turnLabelElement = $("#turn-label");

const engine = Engine.create({
  enableSleeping: true,
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

const gameState = {
  activeItems: new Set(),
  hand: [],
  selectedInstanceId: null,
  nextPhysicsId: 1,
  nextInventoryId: 1,
  debugHitboxes: false,
  shakeReady: true,
  boardBodies: [],
  slots: [],
  enemyHp: 30,
  enemyMaxHp: 30,
  playerArmor: 0,
  playerHealth: 20,
  maxHealth: 20,
  playerMana: 0,
  maxMana: 10,
  turn: "player",
  combatOver: false
};

Render.run(render);
Runner.run(runner, engine);

function createBoard() {
  clearBoardBodies();
  const bodies = [...createWalls(), ...createPegs(), ...createBottomZone()];
  gameState.boardBodies = bodies;
  Composite.add(engine.world, bodies);
}

function clearBoardBodies() {
  for (const body of gameState.boardBodies) Composite.remove(engine.world, body);
  gameState.boardBodies = [];
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

function createPegs() {
  const pegs = [];
  for (let row = 0; row < 8; row += 1) {
    const offset = row % 2 ? 41 : 0;
    for (let col = 0; col < 8; col += 1) {
      const x = 72 + col * 82 + offset;
      const y = 180 + row * 72;
      if (x > CONFIG.boardWidth - 45) continue;
      pegs.push(Bodies.circle(x, y, CONFIG.pegRadius, {
        isStatic: true,
        restitution: 0.82,
        friction: 0.025,
        label: "peg",
        render: { fillStyle: CONFIG.colors.peg, strokeStyle: "#77778d", lineWidth: 2 }
      }));
    }
  }
  return pegs;
}

function createBottomZone() {
  const slotCount = 5;
  const slotWidth = CONFIG.boardWidth / slotCount;
  const types = shuffle(["activation", "wall", "activation", "void", "wall"]);
  gameState.slots = types.map((type, index) => ({ type, x: index * slotWidth, width: slotWidth }));

  const bodies = [];
  for (let index = 0; index < slotCount; index += 1) {
    const type = types[index];
    const center = index * slotWidth + slotWidth / 2;

    if (type === "wall") {
      bodies.push(Bodies.rectangle(center, 865, slotWidth - 10, 60, {
        isStatic: true,
        restitution: 0.7,
        friction: 0.08,
        label: "bottom-wall",
        render: { fillStyle: CONFIG.colors.bumper, strokeStyle: "#80809c", lineWidth: 2 }
      }));
    } else {
      bodies.push(Bodies.rectangle(center, 875, slotWidth - 8, 42, {
        isStatic: true,
        isSensor: true,
        label: type === "activation" ? "activation-slot" : "void-slot",
        render: { visible: false }
      }));
    }
  }
  return bodies;
}

function buildHand() {
  gameState.hand = STARTING_LOADOUT
    .filter(itemId => itemDefinitions.has(itemId))
    .map(itemId => ({
      instanceId: `inventory-${gameState.nextInventoryId++}`,
      itemId,
      consumed: false
    }));
  selectRandomRemainingItem();
}

function remainingItems() {
  return gameState.hand.filter(instance => !instance.consumed);
}

function getSelectedInstance() {
  return gameState.hand.find(instance => instance.instanceId === gameState.selectedInstanceId && !instance.consumed) || null;
}

function selectRandomRemainingItem() {
  const remaining = remainingItems();
  gameState.selectedInstanceId = remaining.length
    ? remaining[Math.floor(Math.random() * remaining.length)].instanceId
    : null;
}

function selectInventoryInstance(instanceId) {
  const instance = gameState.hand.find(entry => entry.instanceId === instanceId && !entry.consumed);
  if (!instance || gameState.turn !== "player" || gameState.combatOver) return;
  gameState.selectedInstanceId = instance.instanceId;
  closeBackpackModal();
  updateUi();
}

function createItemBody(definition, inventoryInstance, x) {
  const body = Bodies.fromVertices(
    x,
    58,
    [definition.vertices.map(vertex => ({ x: vertex.x, y: vertex.y }))],
    {
      label: "player-item",
      restitution: definition.restitution,
      friction: definition.friction,
      frictionAir: 0.003,
      density: definition.density,
      sleepThreshold: 90,
      plugin: {
        pachinkrawler: {
          physicsId: gameState.nextPhysicsId,
          inventoryInstanceId: inventoryInstance.instanceId,
          itemId: definition.id,
          resolved: false
        }
      },
      render: { visible: false }
    },
    true
  );

  body.label = "player-item";
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
    addLog("No quedan objetos disponibles en este turno.");
    return;
  }

  const definition = itemDefinitions.get(inventoryInstance.itemId);
  if (!definition) return;

  const item = createItemBody(definition, inventoryInstance, clamp(x, 40, CONFIG.boardWidth - 40));
  gameState.nextPhysicsId += 1;
  inventoryInstance.consumed = true;

  Body.setAngle(item, randomBetween(-0.12, 0.12));
  Body.setVelocity(item, { x: randomBetween(-0.25, 0.25), y: 0 });
  gameState.activeItems.add(item);
  Composite.add(engine.world, item);

  selectRandomRemainingItem();
  updateUi();
}

function resolveItem(item, result) {
  const root = getRootBody(item);
  const data = root.plugin?.pachinkrawler;
  if (!data || data.resolved) return;

  data.resolved = true;
  const definition = itemDefinitions.get(data.itemId);
  if (result === "activation") activateEffect(definition);
  else addLog(`${definition.name} cayó al vacío y no se activó.`);

  removeItem(root);
}

function activateEffect(definition) {
  const effect = definition.effect || { type: "damage", value: 1 };

  if (effect.type === "damage") {
    gameState.enemyHp = Math.max(0, gameState.enemyHp - effect.value);
    addLog(`${definition.name} se activó: ${effect.value} de daño.`);
  } else if (effect.type === "armor") {
    gameState.playerArmor += effect.value;
    addLog(`${definition.name} se activó: +${effect.value} de armadura.`);
  } else if (effect.type === "heal") {
    const before = gameState.playerHealth;
    gameState.playerHealth = Math.min(gameState.maxHealth, gameState.playerHealth + effect.value);
    addLog(`${definition.name} se activó: +${gameState.playerHealth - before} de vida.`);
  } else if (effect.type === "mana") {
    const before = gameState.playerMana;
    gameState.playerMana = Math.min(gameState.maxMana, gameState.playerMana + effect.value);
    addLog(`${definition.name} se activó: +${gameState.playerMana - before} de maná.`);
  } else if (effect.type === "spell") {
    const manaCost = effect.manaCost || 0;
    if (gameState.playerMana < manaCost) {
      addLog(`${definition.name} llegó al buzón, pero no tienes suficiente maná (${manaCost} MP).`);
    } else {
      gameState.playerMana -= manaCost;
      gameState.enemyHp = Math.max(0, gameState.enemyHp - (effect.value || 0));
      addLog(`${definition.name} se lanzó: -${manaCost} MP y ${effect.value || 0} de daño.`);
    }
  }

  if (gameState.enemyHp <= 0) {
    gameState.combatOver = true;
    gameState.turn = "ended";
    clearActiveItems("victory");
    addLog("¡Enemigo derrotado!");
  }
  updateUi();
}

Events.on(engine, "collisionStart", event => {
  for (const pair of event.pairs) {
    const candidates = [pair.bodyA, pair.bodyB];
    const part = candidates.find(body => body.label === "player-item" || body.label === "player-item-part");
    if (!part) continue;

    const item = getRootBody(part);
    const target = candidates.find(body => body !== part);
    if (target?.label === "activation-slot") resolveItem(item, "activation");
    else if (target?.label === "void-slot") resolveItem(item, "void");
  }
});

Events.on(engine, "afterUpdate", () => {
  for (const item of [...gameState.activeItems]) {
    if (
      item.position.y > CONFIG.boardHeight + 140 ||
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
  clearActiveItems("turn-ended");
  gameState.turn = "enemy";
  closeBackpackModal();

  if (discarded > 0) {
    addLog(`Turno terminado: ${discarded} objeto${discarded === 1 ? "" : "s"} activo${discarded === 1 ? "" : "s"} se pierde${discarded === 1 ? "" : "n"} sin activar.`);
  } else {
    addLog("Turno enemigo…");
  }

  updateUi();
  window.setTimeout(enemyTurn, CONFIG.enemyTurnDelayMs);
}

function enemyTurn() {
  if (gameState.combatOver) return;

  let damage = CONFIG.enemyAttack;
  const blocked = Math.min(gameState.playerArmor, damage);
  gameState.playerArmor -= blocked;
  damage -= blocked;
  gameState.playerHealth = Math.max(0, gameState.playerHealth - damage);

  addLog(`El enemigo ataca por ${CONFIG.enemyAttack}: ${blocked} bloqueado, ${damage} de daño.`);

  if (gameState.playerHealth <= 0) {
    gameState.combatOver = true;
    gameState.turn = "ended";
    addLog("Has sido derrotado.");
  } else {
    buildHand();
    gameState.turn = "player";
  }
  updateUi();
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

  for (const instance of gameState.hand) {
    const definition = itemDefinitions.get(instance.itemId);
    if (!definition) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "inventory-item";
    button.classList.toggle("is-selected", instance.instanceId === gameState.selectedInstanceId && !instance.consumed);
    button.classList.toggle("is-consumed", instance.consumed);
    button.disabled = instance.consumed || gameState.turn !== "player" || gameState.combatOver;
    button.setAttribute("aria-label", `${definition.name}. ${effectText(definition)}`);
    button.dataset.tooltip = `${definition.name} · ${effectText(definition)}`;
    button.innerHTML = `<img src="${definition.sprite}" alt="">`;
    button.addEventListener("click", () => selectInventoryInstance(instance.instanceId));
    inventoryList.append(button);
  }
}

function effectText(definition) {
  const effect = definition.effect;
  if (!effect) return "Efecto desconocido";
  if (effect.type === "damage") return `${effect.value} de daño`;
  if (effect.type === "armor") return `${effect.value} de armadura`;
  if (effect.type === "heal") return `${effect.value} de vida`;
  if (effect.type === "mana") return `${effect.value} de maná`;
  if (effect.type === "spell") return `${effect.value} de daño · cuesta ${effect.manaCost || 0} MP`;
  return "Efecto desconocido";
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

function removeItem(item) {
  Composite.remove(engine.world, item);
  gameState.activeItems.delete(item);
  updateUi();
}

function clearActiveItems() {
  for (const item of [...gameState.activeItems]) {
    const data = item.plugin?.pachinkrawler;
    if (data) data.resolved = true;
    Composite.remove(engine.world, item);
  }
  gameState.activeItems.clear();
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
  drawItemSprites(context);
  if (gameState.debugHitboxes) drawHitboxes(context);
  context.restore();
});

function drawLaunchArea(context) {
  context.fillStyle = CONFIG.colors.launchArea;
  context.globalAlpha = 0.72;
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

  const text = gameState.turn === "player"
    ? (remainingItems().length ? "HAZ CLIC AQUÍ PARA SOLTAR UN OBJETO" : "SIN OBJETOS · PASA EL TURNO")
    : "TURNO ENEMIGO";
  context.fillText(text, CONFIG.boardWidth / 2, CONFIG.launchAreaHeight / 2);
}

function drawBottomSlots(context) {
  context.font = "700 15px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const slot of gameState.slots) {
    if (slot.type === "activation") {
      context.fillStyle = CONFIG.colors.activation;
      context.fillRect(slot.x + 4, CONFIG.bottomZoneTop, slot.width - 8, 110);
      context.fillStyle = "#f4fff9";
      context.fillText("ACTIVAR", slot.x + slot.width / 2, 845);
    } else if (slot.type === "void") {
      context.fillStyle = CONFIG.colors.void;
      context.fillRect(slot.x + 4, CONFIG.bottomZoneTop, slot.width - 8, 110);
      context.strokeStyle = "#555568";
      context.setLineDash([8, 8]);
      context.strokeRect(slot.x + 8, CONFIG.bottomZoneTop + 4, slot.width - 16, 100);
      context.setLineDash([]);
      context.fillStyle = "#a5a5b7";
      context.fillText("VACÍO", slot.x + slot.width / 2, 845);
    }
  }
}

function drawItemSprites(context) {
  for (const item of gameState.activeItems) {
    const itemId = item.plugin?.pachinkrawler?.itemId;
    const definition = itemDefinitions.get(itemId);
    const image = itemImages.get(itemId);
    if (!definition || !image?.complete || !image.naturalWidth) continue;

    const width = image.naturalWidth * definition.scale;
    const height = image.naturalHeight * definition.scale;
    context.save();
    context.translate(item.position.x, item.position.y);
    context.rotate(item.angle);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore();
  }
}

function drawHitboxes(context) {
  context.strokeStyle = "#ff4d6d";
  context.fillStyle = "rgba(255,77,109,.13)";
  context.lineWidth = 2;

  for (const item of gameState.activeItems) {
    const parts = item.parts.length > 1 ? item.parts.slice(1) : item.parts;
    for (const part of parts) {
      context.beginPath();
      part.vertices.forEach((vertex, index) => {
        if (index) context.lineTo(vertex.x, vertex.y);
        else context.moveTo(vertex.x, vertex.y);
      });
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
}

function updateUi() {
  const selectedInstance = getSelectedInstance();
  const definition = selectedInstance ? itemDefinitions.get(selectedInstance.itemId) : null;

  enemyHpElement.textContent = `${gameState.enemyHp}/${gameState.enemyMaxHp}`;
  armorElement.textContent = gameState.playerArmor;
  healthElement.textContent = `${gameState.playerHealth}/${gameState.maxHealth}`;
  manaElement.textContent = `${gameState.playerMana}/${gameState.maxMana}`;
  healthFillElement.style.width = `${(gameState.playerHealth / gameState.maxHealth) * 100}%`;
  manaFillElement.style.width = `${(gameState.playerMana / gameState.maxMana) * 100}%`;
  poolCountElement.textContent = remainingItems().length;
  selectedNameElement.textContent = definition?.name || "Sin objetos";
  selectedImageElement.hidden = !definition;
  if (definition) selectedImageElement.src = definition.sprite;

  turnLabelElement.textContent = gameState.combatOver
    ? "Combate terminado"
    : gameState.turn === "player"
      ? "Turno del jugador"
      : "Turno del enemigo";

  passButton.disabled = gameState.turn !== "player" || gameState.combatOver;
  backpackButton.disabled = gameState.turn !== "player" || gameState.combatOver || remainingItems().length === 0;
  shakeButton.disabled = !gameState.shakeReady || gameState.activeItems.size === 0;
  setStatus(`Objetos activos: ${gameState.activeItems.size} · Pool: ${remainingItems().length}`);

  if (!backpackModal.hidden) renderInventory();
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

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
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

shakeButton.addEventListener("click", shakeMachine);
debugButton.addEventListener("click", toggleDebug);
passButton.addEventListener("click", endPlayerTurn);
backpackButton.addEventListener("click", openBackpack);
closeBackpack.addEventListener("click", closeBackpackModal);
backpackModal.addEventListener("click", event => {
  if (event.target === backpackModal) closeBackpackModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeBackpackModal();
});

createBoard();
buildHand();
updateUi();
