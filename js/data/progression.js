"use strict";

window.PACHINKRAWLER_RUNES = [
  {
    id: "metal",
    name: "Runa de metal",
    icon: "./assets/sprites/runes/metal.png",
    price: 8,
    categories: ["weapon", "shield"],
    description: "+1 de durabilidad máxima. Es requisito para ciertas evoluciones metálicas."
  },
  {
    id: "sharp",
    name: "Runa de filo",
    icon: "./assets/sprites/runes/sharp.png",
    price: 8,
    categories: ["weapon"],
    description: "+1 de daño al activar un arma."
  },
  {
    id: "heavy",
    name: "Runa de peso",
    icon: "./assets/sprites/runes/heavy.png",
    price: 7,
    categories: ["weapon", "shield"],
    description: "Aumenta la masa y reduce el rebote del objeto."
  },
  {
    id: "bouncy",
    name: "Runa de rebote",
    icon: "./assets/sprites/runes/bouncy.png",
    price: 7,
    categories: ["weapon", "shield", "potion", "spellbook"],
    description: "Aumenta el rebote para abrir rutas nuevas."
  },
  {
    id: "tempered",
    name: "Runa de temple",
    icon: "./assets/sprites/runes/tempered.png",
    price: 9,
    categories: ["weapon", "shield"],
    description: "Reduce en 1 el primer daño de durabilidad recibido cada turno."
  },
  {
    id: "fireproof",
    name: "Runa ignífuga",
    icon: "./assets/sprites/runes/fireproof.png",
    price: 8,
    categories: ["weapon", "shield", "potion", "spellbook"],
    description: "Reduce en 1 el daño de durabilidad causado por fuego."
  },
  {
    id: "vampiric",
    name: "Runa vampírica",
    icon: "./assets/sprites/runes/vampiric.png",
    price: 11,
    categories: ["weapon"],
    description: "Cura 1 de vida cuando el arma se activa con éxito."
  },
  {
    id: "arcane",
    name: "Runa arcana",
    icon: "./assets/sprites/runes/arcane.png",
    price: 10,
    categories: ["spellbook"],
    description: "Reduce en 1 MP el coste de los libros de hechizo, mínimo 1."
  }
];

window.PACHINKRAWLER_EVOLUTIONS = [
  {
    id: "wood_sword_to_iron_sword",
    sourceItemId: "wood_sword",
    targetItemId: "iron_sword",
    cost: 18,
    requirements: {
      durabilityLevel: 2,
      runeIds: ["metal"]
    },
    consumesRunes: ["metal"],
    description: "La runa de metal refuerza el núcleo de madera y lo transforma en una espada de hierro."
  },
  {
    id: "wood_shield_to_iron_shield",
    sourceItemId: "wood_shield",
    targetItemId: "iron_shield",
    cost: 20,
    requirements: {
      durabilityLevel: 2,
      runeIds: ["metal"]
    },
    consumesRunes: ["metal"],
    description: "La estructura reforzada se reviste de metal y evoluciona a un escudo de hierro."
  }
];
