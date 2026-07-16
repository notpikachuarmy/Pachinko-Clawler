"use strict";

const { Engine, Render, Runner, Bodies, Body, Composite, Events, Common, Sleeping } = Matter;

if (window.decomp) {
  Common.setDecomp(window.decomp);
}

const CONFIG = Object.freeze({
  boardWidth: 720,
  boardHeight: 900,
  launchAreaHeight: 110,
  wallThickness: 40,
  pegRadius: 11,
  maxActiveItems: 12,
  shakeCooldownMs: 1200,
  colors: {
    background: "#171724",
    launchArea: "#24243a",
    launchLine: "#e4b84d",
    wall: "#4d4d65",
    floor: "#35354a",
    peg: "#d8d8e4"
  }
});

const itemDefinitions = new Map(
  (window.PACHINKRAWLER_ITEMS || []).map((item) => [item.id, item])
);

const gameContainer = document.querySelector("#game-container");
const resetButton = document.querySelector("#reset-button");
const shakeButton = document.querySelector("#shake-button");
const debugButton = document.querySelector("#debug-button");
const statusElement = document.querySelector("#status");
const itemButtons = [...document.querySelectorAll(".item-button")];

if (!gameContainer || !resetButton || !shakeButton || !debugButton || !statusElement) {
  throw new Error("No se encontraron los elementos necesarios del juego.");
}

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
    pixelRatio: 1,
    showAngleIndicator: false,
    showSleeping: false
  }
});

const runner = Runner.create();
const gameState = {
  activeItems: new Set(),
  selectedItemId: "sword_test",
  nextItemId: 1,
  debugHitboxes: false,
  shakeReady: true
};

Render.run(render);
Runner.run(runner, engine);

function createBoard() {
  Composite.add(engine.world, [...createWalls(), ...createPegs()]);
}

function createWalls() {
  const halfWall = CONFIG.wallThickness / 2;
  const wallOptions = {
    isStatic: true,
    restitution: 0.45,
    friction: 0.05,
    label: "board-wall",
    render: { fillStyle: CONFIG.colors.wall }
  };

  return [
    Bodies.rectangle(-halfWall, CONFIG.boardHeight / 2, CONFIG.wallThickness, CONFIG.boardHeight, wallOptions),
    Bodies.rectangle(CONFIG.boardWidth + halfWall, CONFIG.boardHeight / 2, CONFIG.wallThickness, CONFIG.boardHeight, wallOptions),
    Bodies.rectangle(CONFIG.boardWidth / 2, CONFIG.boardHeight + halfWall, CONFIG.boardWidth, CONFIG.wallThickness, {
      ...wallOptions,
      label: "temporary-floor",
      render: { fillStyle: CONFIG.colors.floor }
    })
  ];
}

function createPegs() {
  const pegs = [];
  const columns = 8;
  const rows = 8;
  const horizontalSpacing = 82;
  const verticalSpacing = 78;
  const startX = 72;
  const startY = 190;

  for (let row = 0; row < rows; row += 1) {
    const rowOffset = row % 2 === 0 ? 0 : horizontalSpacing / 2;

    for (let column = 0; column < columns; column += 1) {
      const x = startX + column * horizontalSpacing + rowOffset;
      const y = startY + row * verticalSpacing;
      if (x > CONFIG.boardWidth - 45) continue;

      pegs.push(Bodies.circle(x, y, CONFIG.pegRadius, {
        isStatic: true,
        restitution: 0.82,
        friction: 0.025,
        label: "peg",
        render: {
          fillStyle: CONFIG.colors.peg,
          strokeStyle: "#77778d",
          lineWidth: 2
        }
      }));
    }
  }
  return pegs;
}

function createItemBody(definition, x) {
  const vertexSet = definition.vertices.map((vertex) => ({ x: vertex.x, y: vertex.y }));
  const body = Bodies.fromVertices(x, 58, [vertexSet], {
    label: "player-item",
    restitution: definition.restitution,
    friction: definition.friction,
    frictionAir: 0.003,
    density: definition.density,
    sleepThreshold: 90,
    plugin: {
      pachinkrawler: {
        instanceId: gameState.nextItemId,
        itemId: definition.id,
        durability: definition.durability
      }
    },
    render: {
      fillStyle: "transparent",
      strokeStyle: "transparent",
      lineWidth: 0,
      sprite: {
        texture: definition.sprite,
        xScale: definition.scale,
        yScale: definition.scale
      }
    }
  }, true);

  return body;
}

function dropItem(x) {
  if (gameState.activeItems.size >= CONFIG.maxActiveItems) {
    setStatus(`Límite alcanzado: ${CONFIG.maxActiveItems} objetos simultáneos.`);
    return;
  }

  const definition = itemDefinitions.get(gameState.selectedItemId);
  if (!definition) {
    setStatus("No se encontró la definición del objeto seleccionado.");
    return;
  }

  const margin = 40;
  const item = createItemBody(definition, clamp(x, margin, CONFIG.boardWidth - margin));
  gameState.nextItemId += 1;

  Body.setAngle(item, randomBetween(-0.12, 0.12));
  Body.setVelocity(item, { x: randomBetween(-0.25, 0.25), y: 0 });

  gameState.activeItems.add(item);
  Composite.add(engine.world, item);
  updateStatus();
}

function selectItem(itemId) {
  if (!itemDefinitions.has(itemId)) return;
  gameState.selectedItemId = itemId;
  itemButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.itemId === itemId);
  });
  updateStatus();
}

function shakeMachine() {
  if (!gameState.shakeReady || gameState.activeItems.size === 0) return;

  gameState.shakeReady = false;
  shakeButton.disabled = true;

  for (const item of gameState.activeItems) {
    Sleeping.set(item, false);
    Body.applyForce(item, item.position, {
      x: randomBetween(-0.012, 0.012) * item.mass,
      y: randomBetween(-0.006, -0.002) * item.mass
    });
    Body.setAngularVelocity(item, item.angularVelocity + randomBetween(-0.08, 0.08));
  }

  setStatus("Máquina sacudida: se aplicó un impulso suave a los objetos.");

  window.setTimeout(() => {
    gameState.shakeReady = true;
    shakeButton.disabled = false;
    updateStatus();
  }, CONFIG.shakeCooldownMs);
}

function getBoardPointerPosition(pointerEvent) {
  const bounds = render.canvas.getBoundingClientRect();
  return {
    x: (pointerEvent.clientX - bounds.left) * (CONFIG.boardWidth / bounds.width),
    y: (pointerEvent.clientY - bounds.top) * (CONFIG.boardHeight / bounds.height)
  };
}

render.canvas.addEventListener("pointerdown", (event) => {
  const pointer = getBoardPointerPosition(event);
  if (pointer.y > CONFIG.launchAreaHeight) {
    setStatus("Lanza el objeto haciendo clic en la franja superior.");
    return;
  }
  dropItem(pointer.x);
});

itemButtons.forEach((button) => {
  button.addEventListener("click", () => selectItem(button.dataset.itemId));
});

Events.on(engine, "afterUpdate", () => {
  const removalMargin = 180;
  for (const item of [...gameState.activeItems]) {
    if (
      item.position.y > CONFIG.boardHeight + removalMargin ||
      item.position.x < -removalMargin ||
      item.position.x > CONFIG.boardWidth + removalMargin
    ) {
      removeItem(item);
    }
  }
});

Events.on(render, "afterRender", () => {
  const context = render.context;
  context.save();
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
  context.font = "600 18px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("HAZ CLIC AQUÍ PARA SOLTAR UN OBJETO", CONFIG.boardWidth / 2, CONFIG.launchAreaHeight / 2);

  if (gameState.debugHitboxes) drawHitboxes(context);
  context.restore();
});

function drawHitboxes(context) {
  context.save();
  context.strokeStyle = "#ff4d6d";
  context.fillStyle = "rgba(255, 77, 109, 0.13)";
  context.lineWidth = 2;

  for (const item of gameState.activeItems) {
    const parts = item.parts.length > 1 ? item.parts.slice(1) : item.parts;
    for (const part of parts) {
      context.beginPath();
      part.vertices.forEach((vertex, index) => {
        if (index === 0) context.moveTo(vertex.x, vertex.y);
        else context.lineTo(vertex.x, vertex.y);
      });
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
  context.restore();
}

function removeItem(item) {
  Composite.remove(engine.world, item);
  gameState.activeItems.delete(item);
  updateStatus();
}

function resetItems() {
  for (const item of [...gameState.activeItems]) Composite.remove(engine.world, item);
  gameState.activeItems.clear();
  gameState.nextItemId = 1;
  updateStatus();
}

function toggleDebug() {
  gameState.debugHitboxes = !gameState.debugHitboxes;
  debugButton.textContent = `Hitboxes: ${gameState.debugHitboxes ? "ON" : "OFF"}`;
}

function updateStatus() {
  const selected = itemDefinitions.get(gameState.selectedItemId);
  setStatus(`Seleccionado: ${selected?.name || "—"} · Objetos: ${gameState.activeItems.size}`);
}

function clamp(value, minimum, maximum) { return Math.min(Math.max(value, minimum), maximum); }
function randomBetween(minimum, maximum) { return Math.random() * (maximum - minimum) + minimum; }
function setStatus(message) { statusElement.textContent = message; }

resetButton.addEventListener("click", resetItems);
shakeButton.addEventListener("click", shakeMachine);
debugButton.addEventListener("click", toggleDebug);

createBoard();
updateStatus();
