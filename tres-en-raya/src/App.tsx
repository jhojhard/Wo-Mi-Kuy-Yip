import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Theme = 'kawaii' | 'arena';
type PowerupType = 'Bomba' | 'Escudo' | 'Robo' | 'Turno Extra';
type AiDifficulty = 'facil' | 'intermedio' | 'dificil' | 'imposible';
type PlayerKind = 'human' | 'bot';
type CellData = { type: 'empty' | 'blocked' | 'powerup' | 'player'; playerIndex?: number; shielded?: boolean };
type PlayerState = {
  id: number; emoji: string; name: string; colorVar: string; score: number;
  powerups: PowerupType[]; extraTurns: number; kind: PlayerKind;
};
type DropEvent = { id: number; gifts: { playerIndex: number; powerup: PowerupType }[]; cellDrops: number[] };
type State = {
  status: 'setup' | 'playing' | 'won' | 'draw'; theme: Theme; numPlayers: number; size: number;
  board: CellData[]; players: PlayerState[]; currentPlayer: number; winner: number | null;
  winningLine: number[] | null; activePowerup: { playerIndex: number; powerupIndex: number; type: PowerupType } | null;
  turnCount: number; dropEvent: DropEvent | null; aiDifficulty: AiDifficulty;
};
type Action =
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'START_GAME'; numPlayers: number; size: number; playerKinds: PlayerKind[]; aiDifficulty: AiDifficulty }
  | { type: 'CLICK_CELL'; index: number }
  | { type: 'SELECT_POWERUP'; powerupIndex: number }
  | { type: 'CANCEL_POWERUP' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'BACK_TO_SETUP' }
  | { type: 'CLEAR_DROP' };

const MAX_POWERUPS = 4;
const POWERUP_TYPES: PowerupType[] = ['Bomba', 'Escudo', 'Robo', 'Turno Extra'];
const BOARD_SIZES = [4, 5, 6, 8, 10, 15];
const PLAYERS_DEF = [
  { id: 0, emoji: '🐶', name: 'Perro', colorVar: '--p1-color' },
  { id: 1, emoji: '🐱', name: 'Gato', colorVar: '--p2-color' },
  { id: 2, emoji: '🐰', name: 'Conejo', colorVar: '--p3-color' },
  { id: 3, emoji: '🦊', name: 'Zorro', colorVar: '--p4-color' },
];
const DIFFICULTY_INFO: Record<AiDifficulty, { label: string; desc: string }> = {
  facil: { label: '🟢 Fácil', desc: 'Casual, comete errores' },
  intermedio: { label: '🟡 Intermedio', desc: 'Ataca y bloquea amenazas' },
  dificil: { label: '🔴 Difícil', desc: 'Planea jugadas y usa comodines' },
  imposible: { label: '💀 Experto', desc: 'Búsqueda profunda sin hacer trampa' },
};
const BOT_DELAY: Record<AiDifficulty, number> = { facil: 420, intermedio: 560, dificil: 700, imposible: 850 };

function randomItem<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]; }
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
function addPowerup(items: PowerupType[], item: PowerupType) { return [...items, item].slice(-MAX_POWERUPS); }
function getWinLen(size: number) { return size <= 4 ? 3 : size <= 6 ? 4 : 5; }
function getDropInterval(size: number, difficulty: AiDifficulty) {
  const sizeBase = size <= 4 ? 6 : size <= 6 ? 5 : size <= 10 ? 4 : 3;
  const modifier: Record<AiDifficulty, number> = { facil: -1, intermedio: 0, dificil: 1, imposible: 2 };
  return Math.max(3, Math.min(8, sizeBase + modifier[difficulty]));
}
function generateLines(size: number, len: number): number[][] {
  const lines: number[][] = [];
  const add = (r: number, c: number, dr: number, dc: number) => lines.push(Array.from({ length: len }, (_, k) => (r + k * dr) * size + c + k * dc));
  for (let r = 0; r < size; r++) for (let c = 0; c <= size - len; c++) add(r, c, 0, 1);
  for (let c = 0; c < size; c++) for (let r = 0; r <= size - len; r++) add(r, c, 1, 0);
  for (let r = 0; r <= size - len; r++) for (let c = 0; c <= size - len; c++) add(r, c, 1, 1);
  for (let r = 0; r <= size - len; r++) for (let c = len - 1; c < size; c++) add(r, c, 1, -1);
  return lines;
}
function checkWin(board: CellData[], size: number) {
  for (const line of generateLines(size, getWinLen(size))) {
    const first = board[line[0]];
    if (first.type === 'player' && first.playerIndex !== undefined && line.every(i => board[i].type === 'player' && board[i].playerIndex === first.playerIndex))
      return { winner: first.playerIndex, line };
  }
  return null;
}
function hasAdjacentOwn(board: CellData[], index: number, size: number, playerIndex: number) {
  const row = Math.floor(index / size), col = index % size;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) {
      const cell = board[r * size + c];
      if (cell.type === 'player' && cell.playerIndex === playerIndex) return true;
    }
  }
  return false;
}
function initBoard(size: number): CellData[] {
  const total = size * size;
  const board: CellData[] = Array.from({ length: total }, () => ({ type: 'empty' }));
  const center = (Math.floor(size / 2) * size) + Math.floor(size / 2);
  const forbidden = new Set([center]);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const r = Math.floor(center / size) + dr, c = center % size + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) forbidden.add(r * size + c);
  }
  const available = shuffle(Array.from({ length: total }, (_, i) => i).filter(i => !forbidden.has(i)));
  const blocked = Math.min(Math.floor(total * 0.055), Math.max(1, size - 3));
  const bonuses = Math.min(Math.floor(total * 0.045), Math.max(2, Math.floor(size / 2)));
  available.splice(0, blocked).forEach(i => { board[i] = { type: 'blocked' }; });
  available.splice(0, bonuses).forEach(i => { board[i] = { type: 'powerup' }; });
  return board;
}
function playableCells(board: CellData[]) { return board.reduce<number[]>((a, c, i) => (c.type === 'empty' || c.type === 'powerup') ? [...a, i] : a, []); }
function immediateMove(board: CellData[], size: number, playerIndex: number) {
  for (const index of playableCells(board)) { const next = [...board]; next[index] = { type: 'player', playerIndex }; if (checkWin(next, size)) return index; }
  return null;
}
function linePotential(board: CellData[], size: number, ai: number, opponents: number[]) {
  let total = 0;
  const len = getWinLen(size);
  for (const line of generateLines(size, len)) {
    let mine = 0, enemy = 0, open = 0;
    for (const i of line) {
      const c = board[i];
      if (c.type === 'player' && c.playerIndex === ai) mine++;
      else if (c.type === 'player' && c.playerIndex !== undefined && opponents.includes(c.playerIndex)) enemy++;
      else if (c.type === 'empty' || c.type === 'powerup') open++;
    }
    if (!enemy) total += Math.pow(7, mine) + open;
    if (!mine) total -= Math.pow(8, enemy);
  }
  return total;
}
function heuristicMoveScore(board: CellData[], index: number, size: number, ai: number, opponents: number[]) {
  const next = [...board];
  const wasPowerup = next[index].type === 'powerup';
  next[index] = { type: 'player', playerIndex: ai };
  const row = Math.floor(index / size), col = index % size, center = (size - 1) / 2;
  const centerScore = size - Math.abs(row - center) - Math.abs(col - center);
  let score = linePotential(next, size, ai, opponents) + centerScore * 3 + (wasPowerup ? 22 : 0);
  if (hasAdjacentOwn(board, index, size, ai)) score += 8;
  return score;
}
function candidateMoves(board: CellData[], size: number, ai: number, opponents: number[], limit: number) {
  return playableCells(board).map(i => ({ i, s: heuristicMoveScore(board, i, size, ai, opponents) })).sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.i);
}
function minimax(board: CellData[], size: number, depth: number, maximizing: boolean, ai: number, opponent: number, alpha: number, beta: number): number {
  const win = checkWin(board, size);
  if (win) return win.winner === ai ? 1_000_000 + depth : -1_000_000 - depth;
  if (!depth || !playableCells(board).length) return linePotential(board, size, ai, [opponent]);
  const candidates = candidateMoves(board, size, maximizing ? ai : opponent, maximizing ? [opponent] : [ai], size <= 5 ? 12 : 8);
  if (maximizing) {
    let best = -Infinity;
    for (const index of candidates) { const next = [...board]; next[index] = { type: 'player', playerIndex: ai }; best = Math.max(best, minimax(next, size, depth - 1, false, ai, opponent, alpha, beta)); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
    return best;
  }
  let best = Infinity;
  for (const index of candidates) { const next = [...board]; next[index] = { type: 'player', playerIndex: opponent }; best = Math.min(best, minimax(next, size, depth - 1, true, ai, opponent, alpha, beta)); beta = Math.min(beta, best); if (beta <= alpha) break; }
  return best;
}
function getSearchDepth(size: number, difficulty: AiDifficulty) {
  if (difficulty === 'dificil') return size <= 4 ? 4 : size <= 6 ? 3 : 2;
  if (difficulty === 'imposible') return size <= 4 ? 7 : size <= 5 ? 5 : size <= 8 ? 3 : 2;
  return 0;
}
function computeAiMove(board: CellData[], size: number, ai: number, numPlayers: number, difficulty: AiDifficulty) {
  const playable = playableCells(board); if (!playable.length) return -1;
  const opponents = Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== ai);
  if (difficulty === 'facil') {
    if (Math.random() < 0.28) { const win = immediateMove(board, size, ai); if (win !== null) return win; }
    return Math.random() < 0.45 ? randomItem(playable) : candidateMoves(board, size, ai, opponents, 3)[Math.floor(Math.random() * Math.min(3, playable.length))];
  }
  const win = immediateMove(board, size, ai); if (win !== null) return win;
  const threats = opponents.map(p => ({ p, i: immediateMove(board, size, p) })).filter(x => x.i !== null) as { p: number; i: number }[];
  if (threats.length) return threats[0].i;
  const ranked = candidateMoves(board, size, ai, opponents, difficulty === 'intermedio' ? 6 : 10);
  if (difficulty === 'intermedio') return Math.random() < 0.18 ? randomItem(ranked.slice(0, Math.min(3, ranked.length))) : ranked[0];
  const strongestOpponent = opponents.map(p => ({ p, s: linePotential(board, size, p, [ai]) })).sort((a, b) => b.s - a.s)[0]?.p ?? opponents[0];
  const depth = getSearchDepth(size, difficulty);
  let best = -Infinity, bestMoves: number[] = [];
  for (const index of ranked) {
    const next = [...board]; next[index] = { type: 'player', playerIndex: ai };
    const value = minimax(next, size, depth - 1, false, ai, strongestOpponent, -Infinity, Infinity) + heuristicMoveScore(board, index, size, ai, opponents) * 0.05;
    if (value > best + 0.001) { best = value; bestMoves = [index]; } else if (Math.abs(value - best) <= 0.001) bestMoves.push(index);
  }
  return randomItem(bestMoves.length ? bestMoves : ranked);
}
function powerupTargets(board: CellData[], size: number, ai: number, type: PowerupType) {
  return board.reduce<number[]>((a, c, i) => {
    const valid = type === 'Bomba' ? c.type === 'player' && c.playerIndex !== ai && !c.shielded
      : type === 'Robo' ? c.type === 'player' && c.playerIndex !== ai && !c.shielded && hasAdjacentOwn(board, i, size, ai)
      : type === 'Escudo' ? c.type === 'player' && c.playerIndex === ai && !c.shielded : false;
    return valid ? [...a, i] : a;
  }, []);
}
function targetValue(board: CellData[], size: number, ai: number, type: PowerupType, index: number, numPlayers: number) {
  const before = linePotential(board, size, ai, Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== ai));
  const next = [...board]; const cell = next[index];
  if (type === 'Bomba') next[index] = { type: 'empty' };
  if (type === 'Robo') next[index] = { type: 'player', playerIndex: ai };
  if (type === 'Escudo') next[index] = { ...cell, shielded: true };
  return linePotential(next, size, ai, Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== ai)) - before;
}
function chooseBotPowerup(board: CellData[], size: number, ai: number, player: PlayerState, difficulty: AiDifficulty, numPlayers: number) {
  if (difficulty === 'facil' && Math.random() < 0.82) return -1;
  let best = { index: -1, value: difficulty === 'intermedio' ? 24 : 10 };
  player.powerups.forEach((type, index) => {
    let value = 0;
    if (type === 'Turno Extra') value = immediateMove(board, size, ai) !== null ? 160 : 35;
    else {
      const targets = powerupTargets(board, size, ai, type);
      value = targets.length ? Math.max(...targets.map(t => targetValue(board, size, ai, type, t, numPlayers))) : -1;
      if (type === 'Robo') value += 18;
      if (type === 'Escudo') value *= 0.65;
    }
    if (value > best.value) best = { index, value };
  });
  return best.index;
}
function chooseBotTarget(board: CellData[], size: number, ai: number, type: PowerupType, numPlayers: number) {
  const targets = powerupTargets(board, size, ai, type);
  return targets.sort((a, b) => targetValue(board, size, ai, type, b, numPlayers) - targetValue(board, size, ai, type, a, numPlayers))[0] ?? -1;
}
function computeDrop(turnCount: number, state: Pick<State, 'players' | 'board' | 'numPlayers' | 'size' | 'aiDifficulty'>) {
  const interval = getDropInterval(state.size, state.aiDifficulty);
  if (!turnCount || turnCount % interval !== 0) return null;
  const players = state.players.map(p => ({ ...p, powerups: [...p.powerups] }));
  const board = state.board.map(c => ({ ...c }));
  const gifts: DropEvent['gifts'] = [], cellDrops: number[] = [];
  const lowestInventory = Math.min(...players.map(p => p.powerups.length));
  const eligible = shuffle(players.map((p, i) => ({ p, i })).filter(x => x.p.powerups.length === lowestInventory)).slice(0, Math.max(1, Math.ceil(state.numPlayers / 2)));
  eligible.forEach(({ i }) => { const powerup = randomItem(POWERUP_TYPES); players[i].powerups = addPowerup(players[i].powerups, powerup); gifts.push({ playerIndex: i, powerup }); });
  const free = playableCells(board).filter(i => board[i].type === 'empty');
  if (free.length) { const index = randomItem(free); board[index] = { type: 'powerup' }; cellDrops.push(index); }
  return { players, board, event: { id: Date.now(), gifts, cellDrops } };
}

const initialState: State = { status: 'setup', theme: 'kawaii', numPlayers: 2, size: 4, board: [], players: [], currentPlayer: 0, winner: null, winningLine: null, activePowerup: null, turnCount: 0, dropEvent: null, aiDifficulty: 'intermedio' };
function finishTurn(state: State, board: CellData[], players: PlayerState[]) {
  const win = checkWin(board, state.size);
  if (win) { const scored = players.map(p => ({ ...p })); scored[win.winner].score++; return { ...state, board, players: scored, status: 'won' as const, winner: win.winner, winningLine: win.line, activePowerup: null }; }
  if (!playableCells(board).length) return { ...state, board, players, status: 'draw' as const, activePowerup: null };
  let nextPlayer = state.currentPlayer;
  const updated = players.map(p => ({ ...p }));
  if (updated[state.currentPlayer].extraTurns > 0) updated[state.currentPlayer].extraTurns--;
  else nextPlayer = (state.currentPlayer + 1) % state.numPlayers;
  const turnCount = state.turnCount + 1;
  const drop = computeDrop(turnCount, { players: updated, board, numPlayers: state.numPlayers, size: state.size, aiDifficulty: state.aiDifficulty });
  return { ...state, board: drop?.board ?? board, players: drop?.players ?? updated, currentPlayer: nextPlayer, turnCount, activePowerup: null, dropEvent: drop?.event ?? null };
}
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_THEME': return { ...state, theme: action.theme };
    case 'START_GAME': {
      const players = PLAYERS_DEF.slice(0, action.numPlayers).map((p, i) => ({ ...p, name: action.playerKinds[i] === 'bot' ? `Bot ${i}` : p.name, score: state.players[i]?.score ?? 0, powerups: [] as PowerupType[], extraTurns: 0, kind: action.playerKinds[i] ?? 'human' }));
      return { ...state, status: 'playing', numPlayers: action.numPlayers, size: action.size, board: initBoard(action.size), players, currentPlayer: 0, winner: null, winningLine: null, activePowerup: null, turnCount: 0, dropEvent: null, aiDifficulty: action.aiDifficulty };
    }
    case 'SELECT_POWERUP': {
      if (state.status !== 'playing') return state;
      const player = state.players[state.currentPlayer], type = player?.powerups[action.powerupIndex];
      if (!type) return state;
      if (type === 'Turno Extra') {
        const players = state.players.map(p => ({ ...p, powerups: [...p.powerups] }));
        players[state.currentPlayer].powerups.splice(action.powerupIndex, 1);
        players[state.currentPlayer].extraTurns = Math.min(1, players[state.currentPlayer].extraTurns + 1);
        return { ...state, players, activePowerup: null };
      }
      return { ...state, activePowerup: { playerIndex: state.currentPlayer, powerupIndex: action.powerupIndex, type } };
    }
    case 'CANCEL_POWERUP': return { ...state, activePowerup: null };
    case 'CLICK_CELL': {
      if (state.status !== 'playing' || action.index < 0 || action.index >= state.board.length) return state;
      const board = state.board.map(c => ({ ...c })), players = state.players.map(p => ({ ...p, powerups: [...p.powerups] }));
      const cell = board[action.index];
      if (state.activePowerup) {
        const { type, powerupIndex, playerIndex } = state.activePowerup;
        if (playerIndex !== state.currentPlayer) return state;
        const valid = type === 'Bomba' ? cell.type === 'player' && cell.playerIndex !== playerIndex
          : type === 'Robo' ? cell.type === 'player' && cell.playerIndex !== playerIndex && hasAdjacentOwn(state.board, action.index, state.size, playerIndex)
          : type === 'Escudo' ? cell.type === 'player' && cell.playerIndex === playerIndex && !cell.shielded : false;
        if (!valid) return state;
        if (cell.shielded && (type === 'Bomba' || type === 'Robo')) board[action.index] = { ...cell, shielded: false };
        else if (type === 'Bomba') board[action.index] = { type: 'empty' };
        else if (type === 'Robo') board[action.index] = { type: 'player', playerIndex };
        else board[action.index] = { ...cell, shielded: true };
        players[playerIndex].powerups.splice(powerupIndex, 1);
        return finishTurn(state, board, players);
      }
      if (cell.type !== 'empty' && cell.type !== 'powerup') return state;
      if (cell.type === 'powerup') players[state.currentPlayer].powerups = addPowerup(players[state.currentPlayer].powerups, randomItem(POWERUP_TYPES));
      board[action.index] = { type: 'player', playerIndex: state.currentPlayer };
      return finishTurn(state, board, players);
    }
    case 'PLAY_AGAIN': return { ...state, status: 'playing', board: initBoard(state.size), players: state.players.map(p => ({ ...p, powerups: [], extraTurns: 0 })), currentPlayer: 0, winner: null, winningLine: null, activePowerup: null, turnCount: 0, dropEvent: null };
    case 'BACK_TO_SETUP': return { ...state, status: 'setup', board: [], activePowerup: null, dropEvent: null };
    case 'CLEAR_DROP': return { ...state, dropEvent: null };
    default: return state;
  }
}

const getPowerupIcon = (p: PowerupType) => ({ Bomba: '💣', Escudo: '🛡️', Robo: '🎯', 'Turno Extra': '⚡' }[p]);
const getPowerupTooltip = (p: PowerupType) => ({ Bomba: 'Elimina una ficha rival; rompe el escudo primero.', Escudo: 'Protege una ficha propia contra un ataque.', Robo: 'Convierte una ficha rival adyacente en tuya.', 'Turno Extra': 'Conserva el turno después de tu próxima acción.' }[p]);
function getBoardStyles(size: number) {
  return {
    emojiSize: size <= 5 ? 'text-4xl sm:text-5xl' : size <= 8 ? 'text-2xl sm:text-3xl' : size <= 10 ? 'text-lg sm:text-2xl' : 'text-sm sm:text-base',
    gap: size <= 6 ? 'gap-1.5 sm:gap-2' : size <= 10 ? 'gap-1' : 'gap-0.5',
    maxW: size <= 5 ? 'min(90vw, 450px)' : size <= 8 ? 'min(92vw, 540px)' : size <= 10 ? 'min(94vw, 600px)' : 'min(96vw, 720px)',
  };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [setupPlayers, setSetupPlayers] = useState(2);
  const [setupSize, setSetupSize] = useState(4);
  const [setupDifficulty, setSetupDifficulty] = useState<AiDifficulty>('intermedio');
  const [playerKinds, setPlayerKinds] = useState<PlayerKind[]>(['human', 'bot', 'human', 'human']);
  const [aiThinking, setAiThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = state.players[state.currentPlayer];
  const botTurn = state.status === 'playing' && current?.kind === 'bot';

  useEffect(() => { document.body.setAttribute('data-theme', state.theme); }, [state.theme]);
  useEffect(() => { if (!state.dropEvent) return; const t = setTimeout(() => dispatch({ type: 'CLEAR_DROP' }), 2400); return () => clearTimeout(t); }, [state.dropEvent]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch({ type: 'CANCEL_POWERUP' }); };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    if (!botTurn || state.status !== 'playing') return;
    setAiThinking(true);
    timer.current = setTimeout(() => {
      if (state.activePowerup) {
        const target = chooseBotTarget(state.board, state.size, state.currentPlayer, state.activePowerup.type, state.numPlayers);
        dispatch(target >= 0 ? { type: 'CLICK_CELL', index: target } : { type: 'CANCEL_POWERUP' });
      } else {
        const pu = chooseBotPowerup(state.board, state.size, state.currentPlayer, current, state.aiDifficulty, state.numPlayers);
        if (pu >= 0) dispatch({ type: 'SELECT_POWERUP', powerupIndex: pu });
        else dispatch({ type: 'CLICK_CELL', index: computeAiMove(state.board, state.size, state.currentPlayer, state.numPlayers, state.aiDifficulty) });
      }
      setAiThinking(false);
    }, state.activePowerup ? 360 : BOT_DELAY[state.aiDifficulty]);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [botTurn, state.status, state.currentPlayer, state.activePowerup, state.board, state.size, state.numPlayers, state.aiDifficulty, current]);

  const btn = useCallback((active: boolean) => `rounded-xl border-2 px-3 py-2 font-bold transition active:scale-95 ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/75'}`, []);
  const dropInterval = getDropInterval(state.size || setupSize, state.aiDifficulty || setupDifficulty);
  const nextDrop = state.status === 'playing' ? dropInterval - (state.turnCount % dropInterval) : 0;
  const boardStyle = getBoardStyles(state.size);
  const isHuman = current?.kind === 'human';
  const targetable = useMemo(() => state.activePowerup ? new Set(powerupTargets(state.board, state.size, state.currentPlayer, state.activePowerup.type)) : new Set<number>(), [state.activePowerup, state.board, state.size, state.currentPlayer]);

  if (state.status === 'setup') return (
    <TooltipProvider>
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <button onClick={() => dispatch({ type: 'SET_THEME', theme: state.theme === 'kawaii' ? 'arena' : 'kawaii' })} className="fixed right-4 top-4 rounded-full border-2 border-border bg-card px-4 py-2 font-bold shadow">{state.theme === 'arena' ? '⚡ Arena' : '🌸 Kawaii'}</button>
        <motion.main initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl space-y-5 rounded-3xl border-4 border-border bg-card p-6 text-center shadow-xl sm:p-8">
          <div><h1 className="text-4xl font-black sm:text-5xl">{state.theme === 'arena' ? 'Batalla Neón' : 'Mundo Kawaii'}</h1><p className="mt-2 text-sm text-muted-foreground">Forma una línea, usa comodines y supera a tus rivales.</p></div>
          <section><h2 className="mb-2 font-semibold">Jugadores</h2><div className="flex justify-center gap-2">{[2, 3, 4].map(n => <button key={n} className={btn(setupPlayers === n)} onClick={() => setSetupPlayers(n)}>{n}</button>)}</div></section>
          <section className="space-y-2"><h2 className="font-semibold">Tipo de jugador</h2>{PLAYERS_DEF.slice(0, setupPlayers).map((p, i) => <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2"><span className="font-semibold">{p.emoji} {p.name}</span><div className="flex gap-1"><button className={btn(playerKinds[i] === 'human')} onClick={() => setPlayerKinds(k => k.map((v, x) => x === i ? 'human' : v))}>👤 Persona</button><button className={btn(playerKinds[i] === 'bot')} onClick={() => setPlayerKinds(k => k.map((v, x) => x === i ? 'bot' : v))}>🤖 Bot</button></div></div>)}</section>
          <section><h2 className="mb-2 font-semibold">Dificultad de los bots</h2><div className="grid grid-cols-2 gap-2">{(Object.keys(DIFFICULTY_INFO) as AiDifficulty[]).map(d => <button key={d} onClick={() => setSetupDifficulty(d)} className={`${btn(setupDifficulty === d)} text-left`}><div>{DIFFICULTY_INFO[d].label}</div><div className="text-xs font-normal opacity-75">{DIFFICULTY_INFO[d].desc}</div></button>)}</div></section>
          <section><h2 className="mb-2 font-semibold">Tamaño del tablero</h2><div className="flex flex-wrap justify-center gap-2">{BOARD_SIZES.map(s => <button key={s} className={btn(setupSize === s)} onClick={() => setSetupSize(s)}>{s}×{s}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">Victoria: {getWinLen(setupSize)} en línea · Comodines: cada {getDropInterval(setupSize, setupDifficulty)} turnos</p></section>
          <button onClick={() => dispatch({ type: 'START_GAME', numPlayers: setupPlayers, size: setupSize, playerKinds: playerKinds.slice(0, setupPlayers), aiDifficulty: setupDifficulty })} className="w-full rounded-2xl bg-primary py-4 text-2xl font-black text-primary-foreground shadow-lg transition active:scale-95">¡Jugar!</button>
        </motion.main>
      </div>
    </TooltipProvider>
  );

  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] px-3 pb-8 pt-16 sm:px-4">
        <div className="fixed left-3 top-3 z-50 flex gap-2"><button onClick={() => dispatch({ type: 'BACK_TO_SETUP' })} className="rounded-full border border-border bg-card px-3 py-2 text-sm font-bold shadow">← Menú</button><button onClick={() => dispatch({ type: 'PLAY_AGAIN' })} className="rounded-full border border-border bg-card p-2 shadow" aria-label="Reiniciar"><RotateCcw size={18}/></button></div>
        <button onClick={() => dispatch({ type: 'SET_THEME', theme: state.theme === 'kawaii' ? 'arena' : 'kawaii' })} className="fixed right-3 top-3 z-50 rounded-full border border-border bg-card px-3 py-2 font-bold shadow">{state.theme === 'arena' ? '⚡' : '🌸'}</button>
        <div className="mx-auto mb-4 flex max-w-3xl flex-wrap justify-center gap-2">{state.players.map((p, i) => <div key={p.id} className={`relative min-w-[95px] rounded-xl border-2 p-2 text-center transition ${i === state.currentPlayer ? 'scale-105 border-primary bg-primary/10 shadow-lg' : 'border-border bg-card opacity-75'}`}><div className="text-2xl">{p.emoji}</div><div className="text-sm font-bold">{p.name}{p.kind === 'bot' ? ' 🤖' : ''}</div><div className="text-xs">Pts: {p.score}</div><div className="mt-1 flex min-h-7 flex-wrap justify-center gap-1">{p.powerups.map((pu, pi) => <Tooltip key={`${pu}-${pi}`}><TooltipTrigger asChild><button disabled={i !== state.currentPlayer || !isHuman || state.status !== 'playing' || !!state.activePowerup} onClick={() => dispatch({ type: 'SELECT_POWERUP', powerupIndex: pi })} className="h-7 w-7 rounded bg-muted disabled:opacity-40">{getPowerupIcon(pu)}</button></TooltipTrigger><TooltipContent>{getPowerupTooltip(pu)}</TooltipContent></Tooltip>)}</div>{i === state.currentPlayer && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-xs font-bold text-background">{aiThinking ? 'Pensando…' : 'Turno'}</span>}</div>)}</div>
        <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between rounded-xl border border-border bg-card/80 px-3 py-2 text-sm"><span>🎯 {getWinLen(state.size)} en línea</span><span>🎁 Comodín en {nextDrop} {nextDrop === 1 ? 'turno' : 'turnos'}</span></div>
        {state.activePowerup && <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between rounded-xl bg-destructive/10 px-3 py-2 text-sm font-bold"><span>{getPowerupIcon(state.activePowerup.type)} Selecciona una casilla resaltada</span><button onClick={() => dispatch({ type: 'CANCEL_POWERUP' })} aria-label="Cancelar"><X size={18}/></button></div>}
        <div className={`mx-auto grid aspect-square ${boardStyle.gap}`} style={{ width: boardStyle.maxW, gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}>{state.board.map((cell, index) => {
          const winning = state.winningLine?.includes(index), canTarget = targetable.has(index), canPlace = !state.activePowerup && (cell.type === 'empty' || cell.type === 'powerup');
          return <button key={index} disabled={!isHuman || aiThinking || state.status !== 'playing' || (!canPlace && !canTarget)} onClick={() => dispatch({ type: 'CLICK_CELL', index })} aria-label={`Casilla ${index + 1}`} className={`relative flex aspect-square items-center justify-center rounded-lg border-2 transition active:scale-95 ${winning ? 'border-accent bg-accent/20 shadow-[0_0_18px_var(--accent)]' : canTarget ? 'border-destructive bg-destructive/15 animate-pulse' : cell.type === 'blocked' ? 'border-border bg-muted/70' : 'border-border bg-card hover:bg-muted/60'} disabled:cursor-default`}>
            {cell.type === 'blocked' && <span className={boardStyle.emojiSize}>🪨</span>}{cell.type === 'powerup' && <span className={boardStyle.emojiSize}>🎁</span>}{cell.type === 'player' && cell.playerIndex !== undefined && <><span className={boardStyle.emojiSize}>{PLAYERS_DEF[cell.playerIndex].emoji}</span>{cell.shielded && <span className="absolute right-0 top-0 text-xs sm:text-base">🛡️</span>}</>}
          </button>;
        })}</div>
        <AnimatePresence>{state.dropEvent && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-foreground px-5 py-3 text-center font-bold text-background shadow-xl">🎁 ¡Llegaron nuevos comodines!</motion.div>}</AnimatePresence>
        {(state.status === 'won' || state.status === 'draw') && <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"><motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-3xl border-4 border-primary bg-card p-7 text-center shadow-2xl"><div className="text-6xl">{state.status === 'won' && state.winner !== null ? state.players[state.winner].emoji : '🤝'}</div><h2 className="mt-3 text-3xl font-black">{state.status === 'won' && state.winner !== null ? `¡Ganó ${state.players[state.winner].name}!` : '¡Empate!'}</h2><div className="mt-5 flex justify-center gap-2"><button onClick={() => dispatch({ type: 'PLAY_AGAIN' })} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Otra partida</button><button onClick={() => dispatch({ type: 'BACK_TO_SETUP' })} className="rounded-xl border border-border bg-muted px-5 py-3 font-bold">Menú</button></div></motion.div></div>}
      </div>
    </TooltipProvider>
  );
}
