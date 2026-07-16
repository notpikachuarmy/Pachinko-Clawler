"use strict";

window.PACHINKRAWLER_HAZARDS = [
  {
    id: "fire",
    name: "Fuego",
    sprite: "./assets/sprites/hazards/fire.png",
    shape: "circle",
    radius: 25,
    renderWidth: 70,
    renderHeight: 78,
    damage: 1,
    isSensor: true
  },
  {
    id: "saw",
    name: "Sierra",
    sprite: "./assets/sprites/hazards/saw.png",
    shape: "circle",
    radius: 27,
    renderWidth: 72,
    renderHeight: 72,
    damage: 1,
    isSensor: false,
    restitution: 0.82
  },
  {
    id: "spikes",
    name: "Pinchos",
    sprite: "./assets/sprites/hazards/spikes.png",
    shape: "rectangle",
    width: 74,
    height: 24,
    renderWidth: 86,
    renderHeight: 56,
    damage: 1,
    isSensor: false,
    restitution: 0.34
  }
];

window.PACHINKRAWLER_STATUSES = {
  burn: {
    name: "Quemadura",
    sprite: "./assets/sprites/status/burn.png",
    description: "Recibe daño al inicio del turno enemigo."
  },
  bleed: {
    name: "Sangrado",
    sprite: "./assets/sprites/status/bleed.png",
    description: "Recibe daño al inicio del turno enemigo."
  },
  poison: {
    name: "Veneno",
    sprite: "./assets/sprites/status/poison.png",
    description: "Recibe daño periódico."
  },
  freeze: {
    name: "Congelación",
    sprite: "./assets/sprites/status/freeze.png",
    description: "Reduce el siguiente ataque."
  },
  stun: {
    name: "Aturdimiento",
    sprite: "./assets/sprites/status/stun.png",
    description: "Impide el siguiente ataque."
  },
  armor_break: {
    name: "Armadura rota",
    sprite: "./assets/sprites/status/armor_break.png",
    description: "Reduce la armadura."
  },
  regen: {
    name: "Regeneración",
    sprite: "./assets/sprites/status/regen.png",
    description: "Recupera vida periódicamente."
  }
};
