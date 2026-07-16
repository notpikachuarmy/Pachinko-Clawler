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
  maxActiveItems: 12,
  shakeCooldownMs: 1200,
  colors: {
    background: "#171724", launchArea: "#24243a", launchLine: "#e4b84d",
    wall: "#4d4d65", peg: "#d8d8e4", activation: "#247a52",
    void: "#15151f", bumper: "#55556f"
  }
});

const itemDefinitions = new Map((window.PACHINKRAWLER_ITEMS || []).map((item) => [item.id, item]));
const itemImages = new Map();
for (const definition of itemDefinitions.values()) {
  const image = new Image(); image.src = definition.sprite; itemImages.set(definition.id, image);
}

const gameContainer = document.querySelector("#game-container");
const resetButton = document.querySelector("#reset-button");
const boardButton = document.querySelector("#board-button");
const shakeButton = document.querySelector("#shake-button");
const debugButton = document.querySelector("#debug-button");
const statusElement = document.querySelector("#status");
const enemyHpElement = document.querySelector("#enemy-hp");
const armorElement = document.querySelector("#player-armor");
const healthElement = document.querySelector("#player-health");
const logElement = document.querySelector("#event-log");
const itemButtons = [...document.querySelectorAll(".item-button")];

const engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1, scale: 0.001 } });
const render = Render.create({
  element: gameContainer, engine,
  options: { width: CONFIG.boardWidth, height: CONFIG.boardHeight, wireframes: false, background: CONFIG.colors.background, pixelRatio: 1 }
});
const runner = Runner.create();

const gameState = {
  activeItems: new Set(), selectedItemId: "sword_test", nextItemId: 1,
  debugHitboxes: false, shakeReady: true, boardBodies: [], slots: [],
  enemyHp: 30, playerArmor: 0, playerHealth: 12, maxHealth: 20
};

Render.run(render); Runner.run(runner, engine);

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
  const options = { isStatic: true, restitution: 0.45, friction: 0.05, label: "board-wall", render: { fillStyle: CONFIG.colors.wall } };
  return [
    Bodies.rectangle(-half, CONFIG.boardHeight / 2, CONFIG.wallThickness, CONFIG.boardHeight, options),
    Bodies.rectangle(CONFIG.boardWidth + half, CONFIG.boardHeight / 2, CONFIG.wallThickness, CONFIG.boardHeight, options)
  ];
}

function createPegs() {
  const pegs = [], columns = 8, rows = 8, dx = 82, dy = 72, startX = 72, startY = 180;
  for (let row = 0; row < rows; row += 1) {
    const offset = row % 2 === 0 ? 0 : dx / 2;
    for (let col = 0; col < columns; col += 1) {
      const x = startX + col * dx + offset, y = startY + row * dy;
      if (x > CONFIG.boardWidth - 45) continue;
      pegs.push(Bodies.circle(x, y, CONFIG.pegRadius, {
        isStatic: true, restitution: 0.82, friction: 0.025, label: "peg",
        render: { fillStyle: CONFIG.colors.peg, strokeStyle: "#77778d", lineWidth: 2 }
      }));
    }
  }
  return pegs;
}

function createBottomZone() {
  const slotCount = 5, slotWidth = CONFIG.boardWidth / slotCount;
  const types = shuffle(["activation", "wall", "activation", "void", "wall"]);
  gameState.slots = types.map((type, index) => ({ type, x: index * slotWidth, width: slotWidth }));
  const bodies = [];

  for (let index = 0; index < slotCount; index += 1) {
    const type = types[index], x = index * slotWidth, centerX = x + slotWidth / 2;
    if (type === "wall") {
      bodies.push(Bodies.rectangle(centerX, 865, slotWidth - 10, 60, {
        isStatic: true, restitution: 0.7, friction: 0.08, label: "bottom-wall",
        render: { fillStyle: CONFIG.colors.bumper, strokeStyle: "#80809c", lineWidth: 2 }
      }));
    } else {
      bodies.push(Bodies.rectangle(centerX, 875, slotWidth - 8, 42, {
        isStatic: true, isSensor: true, label: type === "activation" ? "activation-slot" : "void-slot",
        plugin: { pachinkrawler: { slotIndex: index, slotType: type } },
        render: { visible: false }
      }));
    }
  }
  return bodies;
}

function createItemBody(definition, x) {
  const body = Bodies.fromVertices(x, 58, [definition.vertices.map((v) => ({ x: v.x, y: v.y }))], {
    label: "player-item", restitution: definition.restitution, friction: definition.friction,
    frictionAir: 0.003, density: definition.density, sleepThreshold: 90,
    plugin: { pachinkrawler: { instanceId: gameState.nextItemId, itemId: definition.id, durability: definition.durability, resolved: false } },
    render: { visible: false }
  }, true);
  for (const part of body.parts) part.render.visible = false;
  return body;
}

function dropItem(x) {
  if (gameState.activeItems.size >= CONFIG.maxActiveItems) return setStatus("Hay demasiados objetos activos.");
  const definition = itemDefinitions.get(gameState.selectedItemId);
  const item = createItemBody(definition, clamp(x, 40, CONFIG.boardWidth - 40));
  gameState.nextItemId += 1;
  Body.setAngle(item, randomBetween(-0.12, 0.12));
  Body.setVelocity(item, { x: randomBetween(-0.25, 0.25), y: 0 });
  gameState.activeItems.add(item); Composite.add(engine.world, item); updateStatus();
}

function resolveItem(item, result) {
  const data = item.plugin?.pachinkrawler;
  if (!data || data.resolved) return;
  data.resolved = true;
  const definition = itemDefinitions.get(data.itemId);
  if (result === "activation") activateEffect(definition);
  else addLog(`${definition.name} cayó al vacío y no se activó.`);
  removeItem(item);
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
  }
  updateHud();
}

Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    const item = pair.bodyA.label === "player-item" ? pair.bodyA : pair.bodyB.label === "player-item" ? pair.bodyB : null;
    const target = pair.bodyA === item ? pair.bodyB : pair.bodyA;
    if (!item) continue;
    if (target.label === "activation-slot") resolveItem(item, "activation");
    if (target.label === "void-slot") resolveItem(item, "void");
  }
});

Events.on(engine, "afterUpdate", () => {
  for (const item of [...gameState.activeItems]) {
    if (item.position.y > CONFIG.boardHeight + 140 || item.position.x < -180 || item.position.x > CONFIG.boardWidth + 180) resolveItem(item, "void");
  }
});

function selectItem(id) {
  if (!itemDefinitions.has(id)) return;
  gameState.selectedItemId = id;
  itemButtons.forEach((button) => button.classList.toggle("is-selected", button.dataset.itemId === id));
  updateStatus();
}

function shakeMachine() {
  if (!gameState.shakeReady || gameState.activeItems.size === 0) return;
  gameState.shakeReady = false; shakeButton.disabled = true;
  for (const item of gameState.activeItems) {
    Sleeping.set(item, false);
    Body.applyForce(item, item.position, { x: randomBetween(-0.012, 0.012) * item.mass, y: randomBetween(-0.006, -0.002) * item.mass });
    Body.setAngularVelocity(item, item.angularVelocity + randomBetween(-0.08, 0.08));
  }
  window.setTimeout(() => { gameState.shakeReady = true; shakeButton.disabled = false; }, CONFIG.shakeCooldownMs);
}

function resetItems() {
  for (const item of [...gameState.activeItems]) removeItem(item);
  gameState.nextItemId = 1; updateStatus();
}

function newBoard() {
  resetItems(); createBoard(); addLog("Se generó una nueva distribución inferior.");
}

function fullReset() {
  resetItems(); gameState.enemyHp = 30; gameState.playerArmor = 0; gameState.playerHealth = 12;
  createBoard(); logElement.textContent = "Prueba los tres objetos en los buzones verdes."; updateHud();
}

function removeItem(item) { Composite.remove(engine.world, item); gameState.activeItems.delete(item); updateStatus(); }

render.canvas.addEventListener("pointerdown", (event) => {
  const bounds = render.canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * (CONFIG.boardWidth / bounds.width);
  const y = (event.clientY - bounds.top) * (CONFIG.boardHeight / bounds.height);
  if (y <= CONFIG.launchAreaHeight) dropItem(x); else setStatus("Haz clic dentro de la franja superior.");
});

Events.on(render, "afterRender", () => {
  const ctx = render.context; ctx.save();
  drawLaunchArea(ctx); drawBottomSlots(ctx); drawItemSprites(ctx);
  if (gameState.debugHitboxes) drawHitboxes(ctx);
  ctx.restore();
});

function drawLaunchArea(ctx) {
  ctx.fillStyle = CONFIG.colors.launchArea; ctx.globalAlpha = 0.72; ctx.fillRect(0, 0, CONFIG.boardWidth, CONFIG.launchAreaHeight); ctx.globalAlpha = 1;
  ctx.strokeStyle = CONFIG.colors.launchLine; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, CONFIG.launchAreaHeight); ctx.lineTo(CONFIG.boardWidth, CONFIG.launchAreaHeight); ctx.stroke();
  ctx.fillStyle = "#f4f4f8"; ctx.font = "600 18px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("HAZ CLIC AQUÍ PARA SOLTAR UN OBJETO", CONFIG.boardWidth / 2, CONFIG.launchAreaHeight / 2);
}

function drawBottomSlots(ctx) {
  ctx.font = "700 15px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const slot of gameState.slots) {
    if (slot.type === "activation") {
      ctx.fillStyle = CONFIG.colors.activation; ctx.fillRect(slot.x + 4, CONFIG.bottomZoneTop, slot.width - 8, 110);
      ctx.fillStyle = "#f4fff9"; ctx.fillText("ACTIVAR", slot.x + slot.width / 2, 845);
    } else if (slot.type === "void") {
      ctx.fillStyle = CONFIG.colors.void; ctx.fillRect(slot.x + 4, CONFIG.bottomZoneTop, slot.width - 8, 110);
      ctx.strokeStyle = "#555568"; ctx.setLineDash([8, 8]); ctx.strokeRect(slot.x + 8, CONFIG.bottomZoneTop + 4, slot.width - 16, 100); ctx.setLineDash([]);
      ctx.fillStyle = "#a5a5b7"; ctx.fillText("VACÍO", slot.x + slot.width / 2, 845);
    }
  }
}

function drawItemSprites(ctx) {
  for (const item of gameState.activeItems) {
    const id = item.plugin?.pachinkrawler?.itemId, definition = itemDefinitions.get(id), image = itemImages.get(id);
    if (!definition || !image?.complete || image.naturalWidth === 0) continue;
    const width = image.naturalWidth * definition.scale, height = image.naturalHeight * definition.scale;
    ctx.save(); ctx.translate(item.position.x, item.position.y); ctx.rotate(item.angle); ctx.drawImage(image, -width / 2, -height / 2, width, height); ctx.restore();
  }
}

function drawHitboxes(ctx) {
  ctx.strokeStyle = "#ff4d6d"; ctx.fillStyle = "rgba(255,77,109,.13)"; ctx.lineWidth = 2;
  for (const item of gameState.activeItems) {
    const parts = item.parts.length > 1 ? item.parts.slice(1) : item.parts;
    for (const part of parts) {
      ctx.beginPath(); part.vertices.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}

function updateHud() {
  enemyHpElement.textContent = `${gameState.enemyHp}/30`;
  armorElement.textContent = gameState.playerArmor;
  healthElement.textContent = `${gameState.playerHealth}/${gameState.maxHealth}`;
}
function updateStatus() { setStatus(`Seleccionado: ${itemDefinitions.get(gameState.selectedItemId)?.name || "—"} · Objetos: ${gameState.activeItems.size}`); }
function addLog(message) { logElement.textContent = message; }
function setStatus(message) { statusElement.textContent = message; }
function toggleDebug() { gameState.debugHitboxes = !gameState.debugHitboxes; debugButton.textContent = `Hitboxes: ${gameState.debugHitboxes ? "ON" : "OFF"}`; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function randomBetween(min, max) { return Math.random() * (max - min) + min; }
function shuffle(values) { const result = [...values]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }

itemButtons.forEach((button) => button.addEventListener("click", () => selectItem(button.dataset.itemId)));
resetButton.addEventListener("click", fullReset);
boardButton.addEventListener("click", newBoard);
shakeButton.addEventListener("click", shakeMachine);
debugButton.addEventListener("click", toggleDebug);

createBoard(); updateHud(); updateStatus();
