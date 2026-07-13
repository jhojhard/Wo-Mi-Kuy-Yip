import type { AiDifficulty, PowerupType } from './types';

export type ExtraEnemy = { emoji: string; name: string; hue: number };

export type CampaignLevel = {
  id: number;
  name: string;
  description: string;
  worldName: string;
  enemyEmoji: string;
  enemyName: string;
  enemyHue: number;
  /** Additional bot enemies beyond the first (makes it 1 vs 2+) */
  extraEnemies?: ExtraEnemy[];
  size: number;
  difficulty: AiDifficulty;
  isBoss: boolean;
  bossLives?: number;
  withBonus?: boolean;
  withTeleport?: boolean;
  extraBlocked?: number;
  startReward: PowerupType[];
  enemyStartPowerups?: PowerupType[];
  story: string;
};

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    id: 1, name: 'El Primer Paso', worldName: '🌿 El Prado',
    description: 'Un rival tranquilo para comenzar la aventura.',
    story: 'El Gatito Novato bloquea el camino. ¡Enséñale quién manda!',
    enemyEmoji: '🐱', enemyName: 'Gatito Novato', enemyHue: 340,
    size: 4, difficulty: 'facil', isBoss: false,
    withBonus: false, startReward: ['Turno Extra'],
  },
  {
    id: 2, name: 'El Jardín Secreto', worldName: '🌸 El Jardín',
    description: 'Casillas con premios ocultos entre las flores.',
    story: 'El Conejo Curioso guarda el jardín de los tesoros.',
    enemyEmoji: '🐰', enemyName: 'Conejo Curioso', enemyHue: 290,
    size: 4, difficulty: 'facil', isBoss: false,
    withBonus: true, startReward: ['Escudo'],
  },
  {
    id: 3, name: 'El Bosque Perdido', worldName: '🌲 El Bosque',
    description: 'Árboles caídos bloquean muchos caminos.',
    story: 'El Zorro Travieso vive en el bosque oscuro.',
    enemyEmoji: '🦊', enemyName: 'Zorro Travieso', enemyHue: 24,
    size: 5, difficulty: 'facil', isBoss: false,
    extraBlocked: 4, startReward: ['Robo'],
  },
  {
    id: 4, name: 'La Arena', worldName: '⚔️ La Arena',
    description: '¡Dos lobos te esperan en el campo de batalla!',
    story: 'El Lobo Gris y el Lobo Rojo se turnan para atacarte. ¡Neutraliza a uno antes que al otro!',
    enemyEmoji: '🐺', enemyName: 'Lobo Gris', enemyHue: 220,
    extraEnemies: [{ emoji: '🐺', name: 'Lobo Rojo', hue: 5 }],
    size: 5, difficulty: 'facil', isBoss: false,
    withBonus: true, withTeleport: true, startReward: ['Bomba', 'Escudo'],
  },
  {
    id: 5, name: '¡Mini-Jefe! El Guardián', worldName: '🏰 La Fortaleza',
    description: 'Tienes que vencerlo 2 veces para pasar.',
    story: '¡El León Guardián protege la fortaleza! Con cada derrota, regresa más furioso.',
    enemyEmoji: '🦁', enemyName: 'León Guardián', enemyHue: 40,
    size: 5, difficulty: 'dificil', isBoss: true, bossLives: 2,
    withBonus: true, startReward: ['Intercambio'],
    enemyStartPowerups: ['Escudo', 'Bomba'],
  },
  {
    id: 6, name: 'El Pantano', worldName: '🌊 El Pantano',
    description: 'Dos cocodrilos acechan entre los portales.',
    story: 'El Coco Feroz y la Coco Verde dominan el pantano. ¡Vigila sus flancos!',
    enemyEmoji: '🐊', enemyName: 'Coco Feroz', enemyHue: 160,
    extraEnemies: [{ emoji: '🐊', name: 'Coco Verde', hue: 110 }],
    size: 6, difficulty: 'intermedio', isBoss: false,
    withTeleport: true, extraBlocked: 3, startReward: ['Doble', 'Robo'],
  },
  {
    id: 7, name: 'La Cima', worldName: '🏔️ La Cima',
    description: 'Dos águilas dominan las alturas juntas.',
    story: 'El Águila Real y el Águila Negra cazan en pareja desde hace siglos.',
    enemyEmoji: '🦅', enemyName: 'Águila Real', enemyHue: 200,
    extraEnemies: [{ emoji: '🦅', name: 'Águila Negra', hue: 30 }],
    size: 6, difficulty: 'intermedio', isBoss: false,
    withBonus: true, extraBlocked: 2, startReward: ['Terremoto', 'Turno Extra'],
  },
  {
    id: 8, name: 'Las Catacumbas', worldName: '🕳️ Catacumbas',
    description: 'Tres arañas tejen trampas en la oscuridad.',
    story: 'Araña Negra, Araña Roja y Araña Azul cubren cada rincón de las catacumbas.',
    enemyEmoji: '🕷️', enemyName: 'Araña Negra', enemyHue: 270,
    extraEnemies: [
      { emoji: '🕷️', name: 'Araña Roja', hue: 0 },
      { emoji: '🕷️', name: 'Araña Azul', hue: 220 },
    ],
    size: 6, difficulty: 'intermedio', isBoss: false,
    withBonus: true, withTeleport: true, extraBlocked: 3,
    startReward: ['Bomba', 'Escudo', 'Intercambio'],
  },
  {
    id: 9, name: 'El Volcán', worldName: '🌋 El Volcán',
    description: 'Dos dragones menores guardan la entrada a la cueva.',
    story: 'El Dragón Menor y su hermano Dragón Verde calientan sus llamas antes del combate final.',
    enemyEmoji: '🐲', enemyName: 'Dragón Menor', enemyHue: 20,
    extraEnemies: [{ emoji: '🐲', name: 'Dragón Verde', hue: 130 }],
    size: 8, difficulty: 'dificil', isBoss: false,
    withBonus: true, extraBlocked: 4,
    startReward: ['Intercambio', 'Doble', 'Bomba'],
  },
  {
    id: 10, name: '¡Jefe Final! El Gran Dragón', worldName: '🔥 Cueva del Dragón',
    description: 'El desafío definitivo. Derrótalo 3 veces para salvar el mundo.',
    story: '¡El Gran Dragón aguarda en su cueva! Con cada golpe que le das, coloca más fichas en el tablero.',
    enemyEmoji: '🐉', enemyName: 'Gran Dragón', enemyHue: 0,
    size: 8, difficulty: 'imposible', isBoss: true, bossLives: 3,
    withBonus: true, withTeleport: true, extraBlocked: 2,
    startReward: ['Escudo', 'Bomba'],
    enemyStartPowerups: ['Bomba', 'Escudo', 'Robo'],
  },
];

export function getLevelStars(levelId: number, unlockedLevel: number): number {
  if (unlockedLevel > levelId) return 3;
  if (unlockedLevel === levelId) return 1;
  return 0;
}
