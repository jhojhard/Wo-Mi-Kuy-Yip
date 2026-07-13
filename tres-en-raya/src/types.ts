export type Theme = 'kawaii' | 'arena';
export type PowerupType = 'Bomba' | 'Escudo' | 'Robo' | 'Turno Extra' | 'Intercambio' | 'Doble' | 'Terremoto';
export type AiDifficulty = 'facil' | 'intermedio' | 'dificil' | 'imposible';
export type PlayerKind = 'human' | 'bot';
export type CellType = 'empty' | 'blocked' | 'powerup' | 'player' | 'bonus' | 'teleport';
export type CellData = { type: CellType; playerIndex?: number; shielded?: boolean; teleportPair?: number };

export type PlayerState = {
  id: number; emoji: string; name: string; colorVar: string;
  score: number; powerups: PowerupType[]; extraTurns: number; kind: PlayerKind; hue: number;
};
export type DropEvent = { id: number; gifts: { playerIndex: number; powerup: PowerupType }[]; cellDrops: number[] };
export type TournamentMode = { totalRounds: number; currentRound: number; roundResults: (number | 'draw')[] };
export type CampaignMode = { levelId: number; bossLivesLeft: number; bossLivesTotal: number; startRewards: PowerupType[] };

export type State = {
  status: 'playing' | 'won' | 'draw';
  theme: Theme; numPlayers: number; size: number;
  board: CellData[]; players: PlayerState[];
  currentPlayer: number; winner: number | null; winningLine: number[] | null;
  activePowerup: { playerIndex: number; powerupIndex: number; type: PowerupType } | null;
  turnCount: number; dropEvent: DropEvent | null; aiDifficulty: AiDifficulty;
  bombed: number | null; earthShook: boolean;
  tournament: TournamentMode | null; campaign: CampaignMode | null;
};

export type Action =
  | { type: 'INIT_GAME'; numPlayers: number; size: number; playerKinds: PlayerKind[]; aiDifficulty: AiDifficulty; playerNames: string[]; playerHues: number[]; prevScores?: number[]; tournament: TournamentMode | null; campaign: CampaignMode | null; boardOverride?: CellData[]; startPowerups?: PowerupType[][] }
  | { type: 'CLICK_CELL'; index: number }
  | { type: 'SELECT_POWERUP'; powerupIndex: number }
  | { type: 'CANCEL_POWERUP' }
  | { type: 'NEXT_ROUND'; playerKinds: PlayerKind[]; playerNames: string[]; playerHues: number[]; aiDifficulty: AiDifficulty; size: number; numPlayers: number; prevScores: number[]; tournament: TournamentMode; startPowerups?: PowerupType[][] }
  | { type: 'CLEAR_DROP' }
  | { type: 'CLEAR_BOMBED' }
  | { type: 'CLEAR_EARTH' };

export const MAX_POWERUPS = 4;
export const ALL_POWERUPS: PowerupType[] = ['Bomba', 'Escudo', 'Robo', 'Turno Extra', 'Intercambio', 'Doble', 'Terremoto'];
export const BOARD_SIZES = [4, 5, 6, 8, 10, 15];
export const PLAYERS_DEF = [
  { id: 0, emoji: '🐶', name: 'Perro', colorVar: '--p1-color', hue: 210 },
  { id: 1, emoji: '🐱', name: 'Gato', colorVar: '--p2-color', hue: 340 },
  { id: 2, emoji: '🐰', name: 'Conejo', colorVar: '--p3-color', hue: 140 },
  { id: 3, emoji: '🦊', name: 'Zorro', colorVar: '--p4-color', hue: 24 },
];
export const DIFFICULTY_INFO: Record<AiDifficulty, { label: string; desc: string }> = {
  facil: { label: '🟢 Fácil', desc: 'Casual, comete errores' },
  intermedio: { label: '🟡 Intermedio', desc: 'Ataca y bloquea amenazas' },
  dificil: { label: '🔴 Difícil', desc: 'Planea jugadas y usa comodines' },
  imposible: { label: '💀 Experto', desc: 'Búsqueda profunda sin hacer trampa' },
};
export const BOT_DELAY: Record<AiDifficulty, number> = { facil: 420, intermedio: 560, dificil: 700, imposible: 850 };
export const POWERUP_ICONS: Record<PowerupType, string> = { 'Bomba': '💣', 'Escudo': '🛡️', 'Robo': '🎯', 'Turno Extra': '⚡', 'Intercambio': '🔄', 'Doble': '✌️', 'Terremoto': '🌍' };
export const POWERUP_TOOLTIPS: Record<PowerupType, string> = {
  'Bomba': 'Elimina una ficha rival (rompe el escudo primero)',
  'Escudo': 'Protege una ficha propia de ataques',
  'Robo': 'Convierte una ficha rival adyacente en tuya',
  'Turno Extra': 'Conserva el turno en tu próxima jugada',
  'Intercambio': 'Intercambia una ficha rival con tu peor ficha',
  'Doble': 'Coloca fichas en dos casillas contiguas a la vez',
  'Terremoto': 'Baraja todas las casillas vacías y obstáculos',
};
