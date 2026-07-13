import type { AiDifficulty, PowerupType } from './types';

export type CampaignLevel = {
  id: number;
  name: string;
  description: string;
  worldName: string;
  enemyEmoji: string;
  enemyName: string;
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
    enemyEmoji: '🐱', enemyName: 'Gatito Novato',
    size: 4, difficulty: 'facil', isBoss: false,
    withBonus: false, startReward: ['Turno Extra'],
  },
  {
    id: 2, name: 'El Jardín Secreto', worldName: '🌸 El Jardín',
    description: 'Casillas con premios ocultos entre las flores.',
    story: 'El Conejo Curioso guarda el jardín de los tesoros.',
    enemyEmoji: '🐰', enemyName: 'Conejo Curioso',
    size: 4, difficulty: 'facil', isBoss: false,
    withBonus: true, startReward: ['Escudo'],
  },
  {
    id: 3, name: 'El Bosque Perdido', worldName: '🌲 El Bosque',
    description: 'Árboles caídos bloquean muchos caminos.',
    story: 'El Zorro Travieso vive en el bosque oscuro.',
    enemyEmoji: '🦊', enemyName: 'Zorro Travieso',
    size: 5, difficulty: 'facil', isBoss: false,
    extraBlocked: 4, startReward: ['Robo'],
  },
  {
    id: 4, name: 'La Arena', worldName: '⚔️ La Arena',
    description: 'Portales que mueven tus fichas a lugares inesperados.',
    story: 'El Lobo Calculador nunca deja nada al azar.',
    enemyEmoji: '🐺', enemyName: 'Lobo Calculador',
    size: 5, difficulty: 'intermedio', isBoss: false,
    withBonus: true, withTeleport: true, startReward: ['Bomba'],
  },
  {
    id: 5, name: '¡Mini-Jefe! El Guardián', worldName: '🏰 La Fortaleza',
    description: 'Tienes que vencerlo 2 veces para pasar.',
    story: '¡El Oso Guardián protege la fortaleza! Con cada derrota, regresa más furioso.',
    enemyEmoji: '🐻', enemyName: 'Oso Guardián',
    size: 5, difficulty: 'dificil', isBoss: true, bossLives: 2,
    withBonus: true, startReward: ['Intercambio'],
    enemyStartPowerups: ['Escudo', 'Bomba'],
  },
  {
    id: 6, name: 'El Pantano', worldName: '🌊 El Pantano',
    description: 'Portales peligrosos y rivales calculadores.',
    story: 'El Coco Feroz acecha en las profundidades del pantano.',
    enemyEmoji: '🐊', enemyName: 'Coco Feroz',
    size: 6, difficulty: 'dificil', isBoss: false,
    withTeleport: true, extraBlocked: 3, startReward: ['Doble'],
  },
  {
    id: 7, name: 'La Cima', worldName: '🏔️ La Cima',
    description: 'Tablero más grande, rival más agresivo.',
    story: 'El Águila Real domina las alturas desde hace siglos.',
    enemyEmoji: '🦅', enemyName: 'Águila Real',
    size: 6, difficulty: 'dificil', isBoss: false,
    withBonus: true, extraBlocked: 2, startReward: ['Terremoto'],
  },
  {
    id: 8, name: 'Las Catacumbas', worldName: '🕳️ Catacumbas',
    description: 'Oscuridad total. El rival juega sin errores.',
    story: 'La Araña Oscura teje trampas invisibles por doquier.',
    enemyEmoji: '🕷️', enemyName: 'Araña Oscura',
    size: 6, difficulty: 'imposible', isBoss: false,
    withBonus: true, withTeleport: true, extraBlocked: 4,
    startReward: ['Bomba', 'Escudo'],
  },
  {
    id: 9, name: 'El Volcán', worldName: '🌋 El Volcán',
    description: 'Tablero enorme. Sin margen de error.',
    story: 'El Dragón Menor calienta sus llamas para el combate final.',
    enemyEmoji: '🐲', enemyName: 'Dragón Menor',
    size: 8, difficulty: 'imposible', isBoss: false,
    withBonus: true, extraBlocked: 5,
    startReward: ['Intercambio', 'Doble'],
  },
  {
    id: 10, name: '¡Jefe Final! El Gran Dragón', worldName: '🔥 Cueva del Dragón',
    description: 'El desafío definitivo. Derrótalo 3 veces para salvar el mundo.',
    story: '¡El Gran Dragón aguarda en su cueva! Con cada golpe que le das, coloca más fichas en el tablero.',
    enemyEmoji: '🐉', enemyName: 'Gran Dragón',
    size: 8, difficulty: 'imposible', isBoss: true, bossLives: 3,
    withBonus: true, withTeleport: true, extraBlocked: 2,
    startReward: [],
    enemyStartPowerups: ['Bomba', 'Escudo', 'Robo'],
  },
];

export function getLevelStars(levelId: number, unlockedLevel: number): number {
  if (unlockedLevel > levelId) return 3;
  if (unlockedLevel === levelId) return 1;
  return 0;
}
