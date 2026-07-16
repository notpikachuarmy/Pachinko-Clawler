"use strict";

const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events
} = Matter;

const CONFIG = Object.freeze({
  boardWidth: 720,
  boardHeight: 900,
  launchAreaHeight: 110,
  wallThickness: 40,
  pegRadius: 11,
  itemWidth: 34,
  itemHeight: 82,
  maxActiveItems: 12,
  colors: {
    background: "#171724",
    launchArea: "#24243a",
    launchLine: "#e4b84d",
    wall: "#4d4d65",
    floor: "#35354a",
    peg: "#d8d8e4",
    item: "#d47445",
    itemStroke: "#ffe1b4"
  }
});

const gameContainer = document.querySelector("#game-container");
const resetButton = document.querySelector("#reset-button");
const statusElement = document.querySelector("#status");

if (!gameContainer || !resetButton || !statusElement) {
  throw new Error("No se encontraron los elementos necesarios del juego.");
}

const engine = Engine.create({
  gravity: {
    x: 0,
    y: 1,
    scale: 0.001
  }
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
    showVelocity: false,
    showCollisions: false
  }
});

const runner = Runner.create();
const gameState = {
  activeItems: new Set(),
  nextItemId: 1
};

Render.run(render);
Runner.run(runner, engine);

function createBoard() {
  Composite.add(engine.world, [
    ...createWalls(),
    ...createPegs()
  ]);
}

function createWalls() {
  const halfWall = CONFIG.wallThickness / 2;

  const wallOptions = {
    isStatic: true,
    restitution: 0.45,
    friction: 0.05,
    label: "board-wall",
    render: {
      fillStyle: CONFIG.colors.wall
    }
  };

  const leftWall = Bodies.rectangle(
    -halfWall,
    CONFIG.boardHeight / 2,
    CONFIG.wallThickness,
    CONFIG.boardHeight,
    wallOptions
  );

  const rightWall = Bodies.rectangle(
    CONFIG.boardWidth + halfWall,
    CONFIG.boardHeight / 2,
    CONFIG.wallThickness,
    CONFIG.boardHeight,
    wallOptions
  );

  const floor = Bodies.rectangle(
    CONFIG.boardWidth / 2,
    CONFIG.boardHeight + halfWall,
    CONFIG.boardWidth,
    CONFIG.wallThickness,
    {
      ...wallOptions,
      label: "temporary-floor",
      render: {
        fillStyle: CONFIG.colors.floor
      }
    }
  );

  return [leftWall, rightWall, floor];
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

      if (x > CONFIG.boardWidth - 45) {
        continue;
      }

      pegs.push(Bodies.circle(x, y, CONFIG.pegRadius, {
        isStatic: true,
        restitution: 0.85,
        friction: 0.02,
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

function dropItem(x) {
  if (gameState.activeItems.size >= CONFIG.maxActiveItems) {
    setStatus(`Límite alcanzado: ${CONFIG.maxActiveItems} objetos simultáneos.`);
    return;
  }

  const safeX = clamp(x, CONFIG.itemWidth, CONFIG.boardWidth - CONFIG.itemWidth);
  const itemId = gameState.nextItemId;
  gameState.nextItemId += 1;

  const item = Bodies.rectangle(
    safeX,
    55,
    CONFIG.itemWidth,
    CONFIG.itemHeight,
    {
      label: "player-item",
      restitution: 0.55,
      friction: 0.12,
      frictionAir: 0.002,
      density: 0.0025,
      chamfer: { radius: 4 },
      plugin: {
        pachinkrawler: {
          itemId,
          durability: 3
        }
      },
      render: {
        fillStyle: CONFIG.colors.item,
        strokeStyle: CONFIG.colors.itemStroke,
        lineWidth: 3
      }
    }
  );

  Body.setAngle(item, randomBetween(-0.15, 0.15));
  Body.setVelocity(item, {
    x: randomBetween(-0.35, 0.35),
    y: 0
  });

  gameState.activeItems.add(item);
  Composite.add(engine.world, item);
  updateItemCounter();
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

Events.on(engine, "afterUpdate", () => {
  const removalMargin = 180;

  for (const item of [...gameState.activeItems]) {
    const outsideBottom = item.position.y > CONFIG.boardHeight + removalMargin;
    const outsideLeft = item.position.x < -removalMargin;
    const outsideRight = item.position.x > CONFIG.boardWidth + removalMargin;

    if (outsideBottom || outsideLeft || outsideRight) {
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
  context.fillText(
    "HAZ CLIC AQUÍ PARA SOLTAR UN OBJETO",
    CONFIG.boardWidth / 2,
    CONFIG.launchAreaHeight / 2
  );
  context.restore();
});

function removeItem(item) {
  Composite.remove(engine.world, item);
  gameState.activeItems.delete(item);
  updateItemCounter();
}

function resetItems() {
  for (const item of [...gameState.activeItems]) {
    Composite.remove(engine.world, item);
  }

  gameState.activeItems.clear();
  gameState.nextItemId = 1;
  updateItemCounter();
  setStatus("Tablero reiniciado. Elige una posición de lanzamiento.");
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function randomBetween(minimum, maximum) {
  return Math.random() * (maximum - minimum) + minimum;
}

function updateItemCounter() {
  setStatus(`Objetos en el tablero: ${gameState.activeItems.size}`);
}

function setStatus(message) {
  statusElement.textContent = message;
}

resetButton.addEventListener("click", resetItems);

createBoard();
updateItemCounter();
