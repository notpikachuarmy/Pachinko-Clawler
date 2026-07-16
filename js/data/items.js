"use strict";

window.PACHINKRAWLER_ITEMS = [
  {
    "id": "wood_sword",
    "name": "Espada de madera",
    "category": "weapon",
    "rarity": "common",
    "sprite": "./assets/sprites/items/wood_sword.png",
    "spriteScale": 0.3784,
    "spriteOrigin": {
      "x": 128.19,
      "y": 131.49
    },
    "density": 0.0019,
    "restitution": 0.42,
    "friction": 0.18,
    "durability": 4,
    "effect": {
      "type": "damage",
      "value": 4,
      "target": "front"
    },
    "description": "Arma equilibrada. Golpea al enemigo frontal.",
    "vertices": [
      {
        "x": -0.45,
        "y": -43.32
      },
      {
        "x": -3.48,
        "y": -36.89
      },
      {
        "x": -3.48,
        "y": 16.84
      },
      {
        "x": -9.91,
        "y": 16.46
      },
      {
        "x": -10.67,
        "y": 20.63
      },
      {
        "x": -2.72,
        "y": 22.14
      },
      {
        "x": -3.48,
        "y": 38.03
      },
      {
        "x": 2.2,
        "y": 40.3
      },
      {
        "x": 2.58,
        "y": 22.14
      },
      {
        "x": 9.77,
        "y": 21.38
      },
      {
        "x": 10.52,
        "y": 17.6
      },
      {
        "x": 3.71,
        "y": 16.84
      },
      {
        "x": 3.71,
        "y": -37.27
      }
    ],
    "material": "wood"
  },
  {
    "id": "wood_shield",
    "name": "Escudo de madera",
    "category": "shield",
    "rarity": "common",
    "sprite": "./assets/sprites/items/wood_shield.png",
    "spriteScale": 0.3871,
    "spriteOrigin": {
      "x": 128.92,
      "y": 123.11
    },
    "density": 0.0027,
    "restitution": 0.28,
    "friction": 0.24,
    "durability": 6,
    "effect": {
      "type": "armor",
      "value": 3
    },
    "description": "Concede armadura al activarse.",
    "vertices": [
      {
        "x": -9.65,
        "y": -41.85
      },
      {
        "x": -32.49,
        "y": -26.37
      },
      {
        "x": -41.39,
        "y": 6.92
      },
      {
        "x": -24.74,
        "y": 34.02
      },
      {
        "x": -9.65,
        "y": 41.76
      },
      {
        "x": 9.71,
        "y": 41.76
      },
      {
        "x": 32.55,
        "y": 26.28
      },
      {
        "x": 41.45,
        "y": -5.46
      },
      {
        "x": 25.19,
        "y": -33.72
      },
      {
        "x": 9.71,
        "y": -41.85
      }
    ],
    "material": "wood"
  },
  {
    "id": "hp_potion",
    "name": "Poción de vida menor",
    "category": "potion",
    "rarity": "common",
    "sprite": "./assets/sprites/items/hp_potion.png",
    "spriteScale": 0.3024,
    "spriteOrigin": {
      "x": 128.13,
      "y": 138.47
    },
    "density": 0.002,
    "restitution": 0.46,
    "friction": 0.12,
    "durability": 2,
    "effect": {
      "type": "heal",
      "value": 4
    },
    "description": "Recupera vida sin superar el máximo.",
    "vertices": [
      {
        "x": -7.0,
        "y": -33.41
      },
      {
        "x": -12.44,
        "y": -23.43
      },
      {
        "x": -8.81,
        "y": -9.82
      },
      {
        "x": -20.0,
        "y": 2.28
      },
      {
        "x": -20.3,
        "y": 13.47
      },
      {
        "x": -10.02,
        "y": 25.87
      },
      {
        "x": 6.31,
        "y": 27.68
      },
      {
        "x": 19.92,
        "y": 14.37
      },
      {
        "x": 19.92,
        "y": 2.28
      },
      {
        "x": 8.73,
        "y": -13.75
      },
      {
        "x": 12.06,
        "y": -19.8
      },
      {
        "x": 8.73,
        "y": -31.29
      }
    ],
    "material": "glass"
  },
  {
    "id": "mana_potion",
    "name": "Poción de maná",
    "category": "potion",
    "rarity": "common",
    "sprite": "./assets/sprites/items/mana_potion.png",
    "spriteScale": 0.3333,
    "spriteOrigin": {
      "x": 128.05,
      "y": 142.85
    },
    "density": 0.002,
    "restitution": 0.46,
    "friction": 0.12,
    "durability": 3,
    "effect": {
      "type": "mana",
      "value": 5
    },
    "description": "Recupera maná sin superar el máximo.",
    "vertices": [
      {
        "x": -12.68,
        "y": -34.95
      },
      {
        "x": -12.68,
        "y": -27.62
      },
      {
        "x": -16.35,
        "y": -26.95
      },
      {
        "x": -12.68,
        "y": -11.62
      },
      {
        "x": -27.35,
        "y": 0.05
      },
      {
        "x": -27.35,
        "y": 15.05
      },
      {
        "x": -10.02,
        "y": 28.72
      },
      {
        "x": 10.32,
        "y": 28.72
      },
      {
        "x": 27.32,
        "y": 15.05
      },
      {
        "x": 27.32,
        "y": 0.05
      },
      {
        "x": 10.65,
        "y": -16.95
      },
      {
        "x": 14.65,
        "y": -18.95
      },
      {
        "x": 10.65,
        "y": -34.95
      }
    ],
    "material": "glass"
  },
  {
    "id": "iron_sword",
    "name": "Espada de hierro",
    "category": "weapon",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/items/iron_sword.png",
    "spriteScale": 0.4694,
    "spriteOrigin": {
      "x": 122.28,
      "y": 128.6
    },
    "density": 0.0026,
    "restitution": 0.34,
    "friction": 0.2,
    "durability": 7,
    "effect": {
      "type": "damage",
      "value": 6,
      "target": "front"
    },
    "description": "Más pesada y dañina. Golpea al enemigo frontal.",
    "vertices": [
      {
        "x": -2.95,
        "y": -47.22
      },
      {
        "x": -8.11,
        "y": -41.59
      },
      {
        "x": -5.77,
        "y": -23.75
      },
      {
        "x": -16.09,
        "y": -20.0
      },
      {
        "x": -19.38,
        "y": -12.49
      },
      {
        "x": -10.93,
        "y": -8.73
      },
      {
        "x": -10.93,
        "y": 33.51
      },
      {
        "x": -2.95,
        "y": 44.31
      },
      {
        "x": 2.21,
        "y": 44.31
      },
      {
        "x": 11.13,
        "y": 33.51
      },
      {
        "x": 11.13,
        "y": -8.73
      },
      {
        "x": 16.77,
        "y": -9.67
      },
      {
        "x": 19.58,
        "y": -17.18
      },
      {
        "x": 5.03,
        "y": -23.75
      },
      {
        "x": 7.85,
        "y": -41.59
      }
    ],
    "material": "metal"
  },
  {
    "id": "iron_shield",
    "name": "Escudo de hierro",
    "category": "shield",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/items/iron_shield.png",
    "spriteScale": 0.439,
    "spriteOrigin": {
      "x": 129.48,
      "y": 118.5
    },
    "density": 0.0034,
    "restitution": 0.2,
    "friction": 0.27,
    "durability": 9,
    "effect": {
      "type": "armor",
      "value": 5
    },
    "description": "Escudo pesado que concede mucha armadura.",
    "vertices": [
      {
        "x": -4.6,
        "y": -41.93
      },
      {
        "x": -41.48,
        "y": -25.68
      },
      {
        "x": -41.48,
        "y": 2.85
      },
      {
        "x": -14.7,
        "y": 41.93
      },
      {
        "x": 5.5,
        "y": 47.63
      },
      {
        "x": 27.89,
        "y": 29.63
      },
      {
        "x": 37.98,
        "y": 12.07
      },
      {
        "x": 41.5,
        "y": -25.68
      }
    ],
    "material": "metal"
  },
  {
    "id": "wood_dage",
    "name": "Daga de madera",
    "category": "weapon",
    "rarity": "common",
    "sprite": "./assets/sprites/items/wood_dage.png",
    "spriteScale": 0.5051,
    "spriteOrigin": {
      "x": 126.2,
      "y": 129.72
    },
    "density": 0.0013,
    "restitution": 0.55,
    "friction": 0.11,
    "durability": 3,
    "effect": {
      "type": "damage",
      "value": 3,
      "target": "back"
    },
    "description": "Pequeña y ágil. Ataca al último enemigo.",
    "vertices": [
      {
        "x": -0.1,
        "y": -25.62
      },
      {
        "x": -3.64,
        "y": -18.04
      },
      {
        "x": -5.15,
        "y": 5.7
      },
      {
        "x": -2.63,
        "y": 7.72
      },
      {
        "x": -3.64,
        "y": 21.86
      },
      {
        "x": 1.92,
        "y": 23.88
      },
      {
        "x": 3.94,
        "y": 21.86
      },
      {
        "x": 3.43,
        "y": 7.72
      },
      {
        "x": 5.45,
        "y": 3.17
      },
      {
        "x": 3.94,
        "y": 2.16
      },
      {
        "x": 3.94,
        "y": -18.04
      }
    ],
    "material": "wood"
  },
  {
    "id": "wood_mandoble",
    "name": "Mandoble de madera",
    "category": "weapon",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/items/wood_mandoble.png",
    "spriteScale": 0.498,
    "spriteOrigin": {
      "x": 126.06,
      "y": 127.05
    },
    "density": 0.0034,
    "restitution": 0.24,
    "friction": 0.27,
    "durability": 5,
    "effect": {
      "type": "cleave",
      "value": 7,
      "splash": 3,
      "target": "front"
    },
    "description": "Muy grande y pesado. Golpea al frente y salpica al siguiente.",
    "vertices": [
      {
        "x": -0.03,
        "y": -59.28
      },
      {
        "x": -7.5,
        "y": -49.82
      },
      {
        "x": -7.5,
        "y": 32.34
      },
      {
        "x": -12.48,
        "y": 31.84
      },
      {
        "x": -13.97,
        "y": 37.82
      },
      {
        "x": -3.02,
        "y": 40.31
      },
      {
        "x": -4.51,
        "y": 60.23
      },
      {
        "x": 2.96,
        "y": 62.22
      },
      {
        "x": 3.46,
        "y": 40.31
      },
      {
        "x": 12.92,
        "y": 39.31
      },
      {
        "x": 14.91,
        "y": 33.83
      },
      {
        "x": 7.44,
        "y": 32.34
      },
      {
        "x": 7.44,
        "y": -50.32
      }
    ],
    "material": "wood"
  },
  {
    "id": "wood_estoque",
    "name": "Estoque de madera",
    "category": "weapon",
    "rarity": "common",
    "sprite": "./assets/sprites/items/wood_estoque.png",
    "spriteScale": 0.4068,
    "spriteOrigin": {
      "x": 128.23,
      "y": 185.97
    },
    "density": 0.0016,
    "restitution": 0.47,
    "friction": 0.13,
    "durability": 4,
    "effect": {
      "type": "damage",
      "value": 4,
      "target": "front",
      "armorPierce": 3
    },
    "description": "Ignora hasta 3 puntos de armadura enemiga.",
    "vertices": [
      {
        "x": -0.09,
        "y": -70.77
      },
      {
        "x": -1.31,
        "y": -1.21
      },
      {
        "x": -7.01,
        "y": 3.27
      },
      {
        "x": -7.82,
        "y": 13.44
      },
      {
        "x": 1.13,
        "y": 24.83
      },
      {
        "x": 8.86,
        "y": 9.37
      },
      {
        "x": 1.94,
        "y": -1.21
      }
    ],
    "material": "wood"
  },
  {
    "id": "wood_katana",
    "name": "Katana de madera",
    "category": "weapon",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/items/wood_katana.png",
    "spriteScale": 0.4085,
    "spriteOrigin": {
      "x": 129.39,
      "y": 146.65
    },
    "density": 0.0018,
    "restitution": 0.43,
    "friction": 0.15,
    "durability": 4,
    "effect": {
      "type": "damage",
      "value": 4,
      "target": "front",
      "status": {
        "id": "bleed",
        "power": 2,
        "turns": 2
      }
    },
    "description": "Aplica sangrado al enemigo frontal.",
    "vertices": [
      {
        "x": 4.74,
        "y": -53.78
      },
      {
        "x": -0.98,
        "y": -46.02
      },
      {
        "x": -3.84,
        "y": 14.85
      },
      {
        "x": -6.7,
        "y": 16.48
      },
      {
        "x": -0.98,
        "y": 41.81
      },
      {
        "x": 4.33,
        "y": 40.59
      },
      {
        "x": 1.47,
        "y": -8.03
      }
    ],
    "material": "wood"
  },
  {
    "id": "wood_machete",
    "name": "Machete de madera",
    "category": "weapon",
    "rarity": "common",
    "sprite": "./assets/sprites/items/wood_machete.png",
    "spriteScale": 0.3932,
    "spriteOrigin": {
      "x": 128.67,
      "y": 126.89
    },
    "density": 0.0021,
    "restitution": 0.35,
    "friction": 0.2,
    "durability": 5,
    "effect": {
      "type": "execute",
      "value": 4,
      "bonus": 3,
      "threshold": 0.5,
      "target": "front"
    },
    "description": "Hace daño adicional a enemigos con poca vida.",
    "vertices": [
      {
        "x": 6.42,
        "y": -43.2
      },
      {
        "x": -2.23,
        "y": -38.88
      },
      {
        "x": -6.95,
        "y": -28.66
      },
      {
        "x": -1.44,
        "y": 31.89
      },
      {
        "x": -3.41,
        "y": 45.65
      },
      {
        "x": -0.66,
        "y": 48.4
      },
      {
        "x": 3.27,
        "y": 47.62
      },
      {
        "x": 5.24,
        "y": 41.33
      },
      {
        "x": 2.49,
        "y": -13.72
      }
    ],
    "material": "wood"
  },
  {
    "id": "wood_boken",
    "name": "Bokken de madera",
    "category": "weapon",
    "rarity": "common",
    "sprite": "./assets/sprites/items/wood_boken.png",
    "spriteScale": 0.3879,
    "spriteOrigin": {
      "x": 130.55,
      "y": 139.34
    },
    "density": 0.0019,
    "restitution": 0.45,
    "friction": 0.17,
    "durability": 6,
    "effect": {
      "type": "damage",
      "value": 3,
      "target": "front",
      "status": {
        "id": "stun",
        "power": 0,
        "turns": 1
      }
    },
    "description": "Resistente. Puede aturdir un turno.",
    "vertices": [
      {
        "x": -1.77,
        "y": -48.24
      },
      {
        "x": -3.32,
        "y": 19.65
      },
      {
        "x": -6.42,
        "y": 22.76
      },
      {
        "x": -3.32,
        "y": 25.47
      },
      {
        "x": -3.32,
        "y": 39.82
      },
      {
        "x": 0.95,
        "y": 41.38
      },
      {
        "x": 5.6,
        "y": 21.2
      },
      {
        "x": 2.5,
        "y": 19.65
      },
      {
        "x": 2.89,
        "y": -45.13
      }
    ],
    "material": "wood"
  },
  {
    "id": "fireball_book",
    "name": "Libro de Bola de Fuego",
    "category": "spellbook",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/spellbooks/fireball_book.png",
    "spriteScale": 0.3502,
    "spriteOrigin": {
      "x": 123.23,
      "y": 126.37
    },
    "density": 0.0022,
    "restitution": 0.34,
    "friction": 0.22,
    "durability": 4,
    "effect": {
      "type": "spellDamage",
      "manaCost": 3,
      "value": 5,
      "target": "front",
      "status": {
        "id": "burn",
        "power": 2,
        "turns": 2
      }
    },
    "description": "Cuesta 3 MP. Daña y aplica quemadura.",
    "vertices": [
      {
        "x": -22.85,
        "y": -34.8
      },
      {
        "x": -26.7,
        "y": -29.55
      },
      {
        "x": -25.65,
        "y": 30.69
      },
      {
        "x": -16.89,
        "y": 32.79
      },
      {
        "x": -14.44,
        "y": 40.85
      },
      {
        "x": -3.58,
        "y": 40.5
      },
      {
        "x": -2.53,
        "y": 32.79
      },
      {
        "x": 24.79,
        "y": 31.74
      },
      {
        "x": 29.69,
        "y": -5.38
      },
      {
        "x": 21.63,
        "y": -34.8
      }
    ],
    "material": "paper"
  },
  {
    "id": "ice_book",
    "name": "Libro de Hielo",
    "category": "spellbook",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/spellbooks/ice_book.png",
    "spriteScale": 0.3276,
    "spriteOrigin": {
      "x": 132.03,
      "y": 126.5
    },
    "density": 0.0022,
    "restitution": 0.34,
    "friction": 0.22,
    "durability": 4,
    "effect": {
      "type": "spellDamage",
      "manaCost": 3,
      "value": 4,
      "target": "front",
      "status": {
        "id": "freeze",
        "power": 2,
        "turns": 1
      }
    },
    "description": "Cuesta 3 MP. Reduce el siguiente ataque enemigo.",
    "vertices": [
      {
        "x": -24.9,
        "y": -34.89
      },
      {
        "x": -26.54,
        "y": 29.97
      },
      {
        "x": -16.39,
        "y": 32.59
      },
      {
        "x": -14.42,
        "y": 40.46
      },
      {
        "x": -9.84,
        "y": 37.18
      },
      {
        "x": -3.61,
        "y": 40.13
      },
      {
        "x": -2.3,
        "y": 32.59
      },
      {
        "x": 23.91,
        "y": 31.61
      },
      {
        "x": 29.15,
        "y": -7.04
      },
      {
        "x": 22.92,
        "y": -33.25
      }
    ],
    "material": "paper"
  },
  {
    "id": "heal_book",
    "name": "Libro de Curación",
    "category": "spellbook",
    "rarity": "uncommon",
    "sprite": "./assets/sprites/spellbooks/heal_book.png",
    "spriteScale": 0.3439,
    "spriteOrigin": {
      "x": 128.86,
      "y": 129.29
    },
    "density": 0.0022,
    "restitution": 0.34,
    "friction": 0.22,
    "durability": 4,
    "effect": {
      "type": "spellHeal",
      "manaCost": 3,
      "value": 6
    },
    "description": "Cuesta 3 MP. Recupera 6 de vida.",
    "vertices": [
      {
        "x": -25.06,
        "y": -34.83
      },
      {
        "x": -26.09,
        "y": 29.82
      },
      {
        "x": -17.15,
        "y": 32.23
      },
      {
        "x": -14.74,
        "y": 40.14
      },
      {
        "x": -4.08,
        "y": 39.79
      },
      {
        "x": -2.7,
        "y": 32.23
      },
      {
        "x": 23.78,
        "y": 31.19
      },
      {
        "x": 29.28,
        "y": -3.54
      },
      {
        "x": 22.74,
        "y": -33.46
      }
    ],
    "material": "paper"
  }
];
