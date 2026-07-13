import type { Action, CellData, AiDifficulty, PlayerState, State, PowerupType, PlayerKind } from './types';
import { MAX_POWERUPS, ALL_POWERUPS, PLAYERS_DEF } from './types';

// --- Utilities ---
export function randomItem<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]; }
export function shuffle<T>(items: T[]): T[] {
  const r = [...items];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
function addPowerup(items: PowerupType[], item: PowerupType) { return [...items, item].slice(-MAX_POWERUPS); }
export function getWinLen(size: number) { return size <= 4 ? 3 : size <= 6 ? 4 : 5; }
export function getDropInterval(size: number, difficulty: AiDifficulty) {
  const base = size <= 4 ? 6 : size <= 6 ? 5 : size <= 10 ? 4 : 3;
  const mod: Record<AiDifficulty, number> = { facil: -1, intermedio: 0, dificil: 1, imposible: 2 };
  return Math.max(3, Math.min(8, base + mod[difficulty]));
}
export function getBoardStyles(size: number) {
  return {
    emojiSize: size <= 5 ? 'text-4xl sm:text-5xl' : size <= 8 ? 'text-2xl sm:text-3xl' : size <= 10 ? 'text-lg sm:text-2xl' : 'text-sm sm:text-base',
    gap: size <= 6 ? 'gap-1.5 sm:gap-2' : size <= 10 ? 'gap-1' : 'gap-0.5',
    maxW: size <= 5 ? 'min(90vw,450px)' : size <= 8 ? 'min(92vw,540px)' : size <= 10 ? 'min(94vw,600px)' : 'min(96vw,720px)',
  };
}

// --- Board generation ---
export type BoardOptions = { withBonus?: boolean; withTeleport?: boolean; extraBlocked?: number; prePlaced?: { index: number; playerIndex: number }[] };
export function initBoard(size: number, opts: BoardOptions = {}): CellData[] {
  const total = size * size;
  const board: CellData[] = Array.from({ length: total }, () => ({ type: 'empty' as const }));
  const cr = Math.floor(size / 2), cc = Math.floor(size / 2);
  const forbidden = new Set<number>();
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const r = cr + dr, c = cc + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) forbidden.add(r * size + c);
  }
  let available = shuffle(Array.from({ length: total }, (_, i) => i).filter(i => !forbidden.has(i)));
  const extraBlocked = opts.extraBlocked ?? 0;
  const blockedCount = Math.min(Math.floor(total * 0.055) + extraBlocked, Math.max(1, size - 3));
  available.splice(0, blockedCount).forEach(i => { board[i] = { type: 'blocked' }; });
  if (opts.withTeleport && available.length >= 2) {
    const [a, b] = available.splice(0, 2);
    board[a] = { type: 'teleport', teleportPair: b };
    board[b] = { type: 'teleport', teleportPair: a };
  }
  if (opts.withBonus && available.length) {
    const cnt = Math.min(Math.max(2, Math.floor(size / 2)), available.length);
    available.splice(0, cnt).forEach(i => { board[i] = { type: 'bonus' }; });
  }
  const pwCnt = Math.min(Math.floor(total * 0.045) + 2, Math.max(2, available.length));
  available.splice(0, pwCnt).forEach(i => { board[i] = { type: 'powerup' }; });
  if (opts.prePlaced) {
    for (const pp of opts.prePlaced) {
      if (pp.index >= 0 && pp.index < total && board[pp.index].type !== 'player') board[pp.index] = { type: 'player', playerIndex: pp.playerIndex };
    }
  }
  return board;
}
export function getBossPrePlacedPositions(size: number, numPieces: number): { index: number; playerIndex: number }[] {
  const candidates: number[] = [];
  const cr = Math.floor(size / 2), cc = Math.floor(size / 2);
  for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
    if (!dr && !dc) continue;
    const r = cr + dr, c = cc + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) candidates.push(r * size + c);
  }
  return shuffle(candidates).slice(0, numPieces).map(index => ({ index, playerIndex: 1 }));
}

// --- Game primitives ---
export function playableCells(board: CellData[]) {
  return board.reduce<number[]>((a, c, i) => (c.type === 'empty' || c.type === 'powerup' || c.type === 'bonus' || c.type === 'teleport') ? [...a, i] : a, []);
}
export function getAdjacentPlaceable(board: CellData[], size: number, index: number) {
  const row = Math.floor(index / size), col = index % size, result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) { const ni = r * size + c, t = board[ni].type; if (t === 'empty' || t === 'powerup' || t === 'bonus') result.push(ni); }
  }
  return result;
}
function hasAdjacentOwn(board: CellData[], index: number, size: number, pi: number) {
  const row = Math.floor(index / size), col = index % size;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) { const cell = board[r * size + c]; if (cell.type === 'player' && cell.playerIndex === pi) return true; }
  }
  return false;
}
function generateLines(size: number, len: number): number[][] {
  const lines: number[][] = [];
  const add = (r: number, c: number, dr: number, dc: number) => lines.push(Array.from({ length: len }, (_, k) => (r + k * dr) * size + c + k * dc));
  for (let r = 0; r < size; r++) for (let c = 0; c <= size - len; c++) add(r, c, 0, 1);
  for (let c = 0; c < size; c++) for (let r = 0; r <= size - len; r++) add(r, c, 1, 0);
  for (let r = 0; r <= size - len; r++) { for (let c = 0; c <= size - len; c++) add(r, c, 1, 1); for (let c = len - 1; c < size; c++) add(r, c, 1, -1); }
  return lines;
}
export function checkWin(board: CellData[], size: number) {
  for (const line of generateLines(size, getWinLen(size))) {
    const first = board[line[0]];
    if (first.type === 'player' && first.playerIndex !== undefined && line.every(i => board[i].type === 'player' && board[i].playerIndex === first.playerIndex)) return { winner: first.playerIndex, line };
  }
  return null;
}
function linePotential(board: CellData[], size: number, ai: number, opponents: number[]) {
  let total = 0;
  for (const line of generateLines(size, getWinLen(size))) {
    let mine = 0, enemy = 0, open = 0;
    for (const i of line) { const c = board[i]; if (c.type === 'player' && c.playerIndex === ai) mine++; else if (c.type === 'player' && c.playerIndex !== undefined && opponents.includes(c.playerIndex)) enemy++; else if (c.type !== 'blocked') open++; }
    if (!enemy) total += Math.pow(7, mine) + open;
    if (!mine) total -= Math.pow(8, enemy);
  }
  return total;
}
function heuristicMoveScore(board: CellData[], index: number, size: number, ai: number, opponents: number[]) {
  const next = [...board]; const wasPowerup = next[index].type === 'powerup' || next[index].type === 'bonus';
  next[index] = { type: 'player', playerIndex: ai };
  const row = Math.floor(index / size), col = index % size, center = (size - 1) / 2;
  let score = linePotential(next, size, ai, opponents) + (size - Math.abs(row - center) - Math.abs(col - center)) * 3 + (wasPowerup ? 22 : 0);
  if (hasAdjacentOwn(board, index, size, ai)) score += 8;
  return score;
}
function candidateMoves(board: CellData[], size: number, ai: number, opponents: number[], limit: number) {
  return playableCells(board).map(i => ({ i, s: heuristicMoveScore(board, i, size, ai, opponents) })).sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.i);
}
function immediateMove(board: CellData[], size: number, pi: number) {
  for (const index of playableCells(board)) { const next = [...board]; next[index] = { type: 'player', playerIndex: pi }; if (checkWin(next, size)) return index; }
  return null;
}
function minimax(board: CellData[], size: number, depth: number, max: boolean, ai: number, op: number, alpha: number, beta: number): number {
  const win = checkWin(board, size);
  if (win) return win.winner === ai ? 1_000_000 + depth : -1_000_000 - depth;
  if (!depth || !playableCells(board).length) return linePotential(board, size, ai, [op]);
  const cands = candidateMoves(board, size, max ? ai : op, max ? [op] : [ai], size <= 5 ? 12 : 8);
  if (max) {
    let best = -Infinity;
    for (const i of cands) { const next = [...board]; next[i] = { type: 'player', playerIndex: ai }; best = Math.max(best, minimax(next, size, depth - 1, false, ai, op, alpha, beta)); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
    return best;
  }
  let best = Infinity;
  for (const i of cands) { const next = [...board]; next[i] = { type: 'player', playerIndex: op }; best = Math.min(best, minimax(next, size, depth - 1, true, ai, op, alpha, beta)); beta = Math.min(beta, best); if (beta <= alpha) break; }
  return best;
}
export function computeAiMove(board: CellData[], size: number, ai: number, numPlayers: number, difficulty: AiDifficulty) {
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
  const strongestOp = opponents.map(p => ({ p, s: linePotential(board, size, p, [ai]) })).sort((a, b) => b.s - a.s)[0]?.p ?? opponents[0];
  const depth = difficulty === 'dificil' ? (size <= 4 ? 4 : size <= 6 ? 3 : 2) : (size <= 4 ? 7 : size <= 5 ? 5 : size <= 8 ? 3 : 2);
  let best = -Infinity, bestMoves: number[] = [];
  for (const index of ranked) {
    const next = [...board]; next[index] = { type: 'player', playerIndex: ai };
    const value = minimax(next, size, depth - 1, false, ai, strongestOp, -Infinity, Infinity) + heuristicMoveScore(board, index, size, ai, opponents) * 0.05;
    if (value > best + 0.001) { best = value; bestMoves = [index]; } else if (Math.abs(value - best) <= 0.001) bestMoves.push(index);
  }
  return randomItem(bestMoves.length ? bestMoves : ranked);
}

// --- Power-up logic ---
export function powerupTargets(board: CellData[], size: number, ai: number, type: PowerupType): number[] {
  const hasOwnPiece = board.some(c => c.type === 'player' && c.playerIndex === ai);
  return board.reduce<number[]>((a, c, i) => {
    let valid = false;
    if (type === 'Bomba') valid = c.type === 'player' && c.playerIndex !== ai && !c.shielded;
    else if (type === 'Escudo') valid = c.type === 'player' && c.playerIndex === ai && !c.shielded;
    else if (type === 'Robo') valid = c.type === 'player' && c.playerIndex !== ai && !c.shielded && hasAdjacentOwn(board, i, size, ai);
    else if (type === 'Intercambio') valid = c.type === 'player' && c.playerIndex !== ai && !c.shielded && hasOwnPiece;
    else if (type === 'Doble') valid = c.type === 'empty' || c.type === 'powerup' || c.type === 'bonus' || c.type === 'teleport';
    return valid ? [...a, i] : a;
  }, []);
}
function targetValue(board: CellData[], size: number, ai: number, type: PowerupType, index: number, numPlayers: number) {
  const opponents = Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== ai);
  const before = linePotential(board, size, ai, opponents);
  const next = [...board]; const cell = next[index];
  if (type === 'Bomba') next[index] = { type: 'empty' };
  else if (type === 'Robo') next[index] = { type: 'player', playerIndex: ai };
  else if (type === 'Escudo') next[index] = { ...cell, shielded: true };
  else if (type === 'Intercambio') {
    const opIdx = cell.playerIndex!;
    const myPieces = board.map((c, i) => (c.type === 'player' && c.playerIndex === ai) ? i : -1).filter(i => i >= 0);
    if (!myPieces.length) return -999;
    const myWorst = myPieces.length === 1 ? myPieces[0] : myPieces.map(pi => { const b = [...board]; b[pi] = { type: 'empty' }; return { pi, v: linePotential(b, size, ai, opponents) }; }).sort((a, b) => a.v - b.v)[0].pi;
    next[index] = { type: 'player', playerIndex: ai };
    next[myWorst] = { type: 'player', playerIndex: opIdx };
  }
  return linePotential(next, size, ai, opponents) - before;
}
export function chooseBotPowerup(board: CellData[], size: number, ai: number, player: PlayerState, difficulty: AiDifficulty, numPlayers: number) {
  if (difficulty === 'facil' && Math.random() < 0.82) return -1;
  const opponents = Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== ai);
  let best = { index: -1, value: difficulty === 'intermedio' ? 24 : 10 };
  player.powerups.forEach((type, index) => {
    let value = 0;
    if (type === 'Turno Extra') value = immediateMove(board, size, ai) !== null ? 160 : 35;
    else if (type === 'Terremoto') { const myP = linePotential(board, size, ai, opponents), opP = Math.max(...opponents.map(op => linePotential(board, size, op, [ai]))); value = opP > myP * 1.5 ? 55 : 8; }
    else if (type === 'Doble') value = immediateMove(board, size, ai) !== null ? 180 : 45;
    else { const targets = powerupTargets(board, size, ai, type); value = targets.length ? Math.max(...targets.map(t => targetValue(board, size, ai, type, t, numPlayers))) : -1; if (type === 'Robo') value += 18; else if (type === 'Intercambio') value += 15; else if (type === 'Escudo') value *= 0.65; }
    if (value > best.value) best = { index, value };
  });
  return best.index;
}
export function chooseBotTarget(board: CellData[], size: number, ai: number, type: PowerupType, numPlayers: number) {
  const targets = powerupTargets(board, size, ai, type);
  if (!targets.length) return -1;
  if (type === 'Doble') {
    const opponents = Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== ai);
    return targets.sort((a, b) => heuristicMoveScore(board, b, size, ai, opponents) - heuristicMoveScore(board, a, size, ai, opponents))[0];
  }
  return targets.sort((a, b) => targetValue(board, size, ai, type, b, numPlayers) - targetValue(board, size, ai, type, a, numPlayers))[0];
}

// --- Drop ---
function computeDrop(turnCount: number, s: Pick<State, 'players' | 'board' | 'numPlayers' | 'size' | 'aiDifficulty'>) {
  const interval = getDropInterval(s.size, s.aiDifficulty);
  if (!turnCount || turnCount % interval !== 0) return null;
  const players = s.players.map(p => ({ ...p, powerups: [...p.powerups] }));
  const board = s.board.map(c => ({ ...c }));
  const gifts: { playerIndex: number; powerup: PowerupType }[] = [], cellDrops: number[] = [];
  const low = Math.min(...players.map(p => p.powerups.length));
  shuffle(players.map((p, i) => ({ p, i })).filter(x => x.p.powerups.length === low)).slice(0, Math.max(1, Math.ceil(s.numPlayers / 2))).forEach(({ i }) => { const pu = randomItem(ALL_POWERUPS); players[i].powerups = addPowerup(players[i].powerups, pu); gifts.push({ playerIndex: i, powerup: pu }); });
  const free = playableCells(board).filter(i => board[i].type === 'empty');
  if (free.length) { const idx = randomItem(free); board[idx] = { type: 'powerup' }; cellDrops.push(idx); }
  return { players, board, event: { id: Date.now(), gifts, cellDrops } };
}

// --- finishTurn ---
function finishTurn(state: State, board: CellData[], players: PlayerState[]): State {
  const win = checkWin(board, state.size);
  if (win) {
    const scored = players.map(p => ({ ...p })); scored[win.winner].score++;
    const tournament = state.tournament ? { ...state.tournament, roundResults: [...state.tournament.roundResults, win.winner as number | 'draw'] } : null;
    return { ...state, board, players: scored, status: 'won', winner: win.winner, winningLine: win.line, activePowerup: null, tournament };
  }
  if (!playableCells(board).length) {
    const tournament = state.tournament ? { ...state.tournament, roundResults: [...state.tournament.roundResults, 'draw' as number | 'draw'] } : null;
    return { ...state, board, players, status: 'draw', activePowerup: null, tournament };
  }
  const updated = players.map(p => ({ ...p }));
  let next = state.currentPlayer;
  if (updated[state.currentPlayer].extraTurns > 0) updated[state.currentPlayer].extraTurns--;
  else next = (state.currentPlayer + 1) % state.numPlayers;
  const turnCount = state.turnCount + 1;
  const drop = computeDrop(turnCount, { players: updated, board, numPlayers: state.numPlayers, size: state.size, aiDifficulty: state.aiDifficulty });
  return { ...state, board: drop?.board ?? board, players: drop?.players ?? updated, currentPlayer: next, turnCount, activePowerup: null, dropEvent: drop?.event ?? null, earthShook: false };
}

// --- Reducer ---
export const initialState: State = {
  status: 'playing', theme: 'kawaii', numPlayers: 2, size: 4,
  board: Array(16).fill({ type: 'empty' }), players: [], currentPlayer: 0,
  winner: null, winningLine: null, activePowerup: null, turnCount: 0,
  dropEvent: null, aiDifficulty: 'intermedio', bombed: null, earthShook: false,
  tournament: null, campaign: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT_GAME': {
      const board = action.boardOverride ?? initBoard(action.size);
      const players = PLAYERS_DEF.slice(0, action.numPlayers).map((p, i) => ({ ...p, name: action.playerNames[i] ?? p.name, hue: action.playerHues[i] ?? p.hue, score: action.prevScores?.[i] ?? 0, powerups: (action.startPowerups?.[i] ?? []) as PowerupType[], extraTurns: 0, kind: (action.playerKinds[i] ?? 'human') as PlayerKind }));
      return { ...state, status: 'playing', numPlayers: action.numPlayers, size: action.size, board, players, currentPlayer: 0, winner: null, winningLine: null, activePowerup: null, turnCount: 0, dropEvent: null, aiDifficulty: action.aiDifficulty, bombed: null, earthShook: false, tournament: action.tournament, campaign: action.campaign };
    }
    case 'NEXT_ROUND': {
      const board = initBoard(action.size);
      const players = PLAYERS_DEF.slice(0, action.numPlayers).map((p, i) => ({ ...p, name: action.playerNames[i] ?? p.name, hue: action.playerHues[i] ?? p.hue, score: action.prevScores[i], powerups: (action.startPowerups?.[i] ?? []) as PowerupType[], extraTurns: 0, kind: (action.playerKinds[i] ?? 'human') as PlayerKind }));
      return { ...state, status: 'playing', board, players, currentPlayer: 0, winner: null, winningLine: null, activePowerup: null, turnCount: 0, dropEvent: null, aiDifficulty: action.aiDifficulty, bombed: null, earthShook: false, tournament: action.tournament };
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
      if (type === 'Terremoto') {
        const players = state.players.map(p => ({ ...p, powerups: [...p.powerups] }));
        players[state.currentPlayer].powerups.splice(action.powerupIndex, 1);
        const board = state.board.map(c => ({ ...c }));
        const nonPi = board.map((c, i) => c.type !== 'player' ? i : -1).filter(i => i >= 0);
        const shuffled = shuffle(nonPi.map(i => ({ ...board[i] })));
        nonPi.forEach((i, j) => { board[i] = shuffled[j]; });
        // Re-link teleport pairs after shuffle
        const tpA = board.findIndex(c => c.type === 'teleport'), tpB = board.findIndex((c, i) => c.type === 'teleport' && i !== tpA);
        if (tpA >= 0 && tpB >= 0) { board[tpA] = { type: 'teleport', teleportPair: tpB }; board[tpB] = { type: 'teleport', teleportPair: tpA }; }
        return { ...state, board, players, activePowerup: null, earthShook: true };
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
        const valid =
          type === 'Bomba' ? (cell.type === 'player' && cell.playerIndex !== playerIndex) :
          type === 'Robo' ? (cell.type === 'player' && cell.playerIndex !== playerIndex && !cell.shielded && hasAdjacentOwn(state.board, action.index, state.size, playerIndex)) :
          type === 'Escudo' ? (cell.type === 'player' && cell.playerIndex === playerIndex && !cell.shielded) :
          type === 'Intercambio' ? (cell.type === 'player' && cell.playerIndex !== playerIndex && !cell.shielded) :
          type === 'Doble' ? (cell.type === 'empty' || cell.type === 'powerup' || cell.type === 'bonus' || cell.type === 'teleport') : false;
        if (!valid) return state;
        let bombed: number | null = null;
        if (type === 'Bomba') {
          if (cell.shielded) board[action.index] = { ...cell, shielded: false };
          else { board[action.index] = { type: 'empty' }; bombed = action.index; }
        } else if (type === 'Robo') {
          board[action.index] = { type: 'player', playerIndex };
        } else if (type === 'Escudo') {
          board[action.index] = { ...cell, shielded: true };
        } else if (type === 'Intercambio') {
          const opIdx = cell.playerIndex!;
          const myPieces = board.map((c, i) => (c.type === 'player' && c.playerIndex === playerIndex) ? i : -1).filter(i => i >= 0);
          const myWorst = myPieces.length === 1 ? myPieces[0] : myPieces.map(pi => { const b = [...board]; b[pi] = { type: 'empty' }; return { pi, v: linePotential(b, state.size, playerIndex, [opIdx]) }; }).sort((a, b) => a.v - b.v)[0].pi;
          board[action.index] = { type: 'player', playerIndex };
          board[myWorst] = { type: 'player', playerIndex: opIdx };
        } else if (type === 'Doble') {
          if (cell.type === 'powerup' || cell.type === 'bonus') { players[playerIndex].powerups = addPowerup(players[playerIndex].powerups, randomItem(ALL_POWERUPS)); if (cell.type === 'bonus') players[playerIndex].score++; }
          board[action.index] = { type: 'player', playerIndex };
          const adj = getAdjacentPlaceable(board, state.size, action.index);
          if (adj.length) { const opponents = Array.from({ length: state.numPlayers }, (_, i) => i).filter(i => i !== playerIndex); const best2 = adj.map(i => ({ i, s: heuristicMoveScore(board, i, state.size, playerIndex, opponents) })).sort((a, b) => b.s - a.s)[0].i; board[best2] = { type: 'player', playerIndex }; }
        }
        players[playerIndex].powerups.splice(powerupIndex, 1);
        return { ...finishTurn(state, board, players), bombed };
      }
      // Normal placement
      if (cell.type !== 'empty' && cell.type !== 'powerup' && cell.type !== 'bonus' && cell.type !== 'teleport') return state;
      let placedIndex = action.index;
      if (cell.type === 'teleport' && cell.teleportPair !== undefined) {
        const partner = cell.teleportPair;
        if (board[partner].type !== 'player') { board[action.index] = { type: 'teleport', teleportPair: partner }; placedIndex = partner; }
      }
      if (cell.type === 'powerup') players[state.currentPlayer].powerups = addPowerup(players[state.currentPlayer].powerups, randomItem(ALL_POWERUPS));
      if (cell.type === 'bonus') { players[state.currentPlayer].powerups = addPowerup(players[state.currentPlayer].powerups, randomItem(ALL_POWERUPS)); players[state.currentPlayer].score++; }
      board[placedIndex] = { type: 'player', playerIndex: state.currentPlayer };
      return finishTurn(state, board, players);
    }
    case 'CLEAR_DROP': return { ...state, dropEvent: null };
    case 'CLEAR_BOMBED': return { ...state, bombed: null };
    case 'CLEAR_EARTH': return { ...state, earthShook: false };
    default: return state;
  }
}
