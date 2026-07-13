import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, X, Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { Theme, PlayerKind, AiDifficulty, PowerupType, State } from './types';
import {
  PLAYERS_DEF, DIFFICULTY_INFO, BOT_DELAY, POWERUP_ICONS, POWERUP_TOOLTIPS,
  BOARD_SIZES,
} from './types';
import { reducer, initialState, computeAiMove, chooseBotPowerup, chooseBotTarget,
  powerupTargets, getBoardStyles, getWinLen, getDropInterval, initBoard,
  getBossPrePlacedPositions } from './logic';
import { SFX, setSoundEnabled, getSoundEnabled } from './sounds';
import { CAMPAIGN_LEVELS, getLevelStars, type CampaignLevel } from './campaign';

// ── Confetti ───────────────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const colors = ['#ff6b9d','#ffd93d','#6bceff','#c9f97f','#ff9f43','#a29bfe'];
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.2 + Math.random() * 1.2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    spin: Math.random() > 0.5 ? 360 : -360,
  })), []);
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{ left: `${p.x}%`, top: '-10px', width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.spin }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ── Hue Picker ─────────────────────────────────────────────────────────────────
function HuePicker({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <input
      type="range" min={0} max={359} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="h-3 w-full cursor-pointer rounded-full border-none outline-none"
      style={{
        background: 'linear-gradient(to right, hsl(0,90%,60%),hsl(30,90%,60%),hsl(60,90%,60%),hsl(90,90%,60%),hsl(120,90%,60%),hsl(150,90%,60%),hsl(180,90%,60%),hsl(210,90%,60%),hsl(240,90%,60%),hsl(270,90%,60%),hsl(300,90%,60%),hsl(330,90%,60%),hsl(360,90%,60%))',
        WebkitAppearance: 'none',
      }}
    />
  );
}

// ── Screen types ───────────────────────────────────────────────────────────────
type Screen = 'menu' | 'quickSetup' | 'campaign' | 'tournamentSetup' | 'playing';

// ── localStorage helpers ────────────────────────────────────────────────────────
function getUnlockedLevel(): number {
  try { return parseInt(localStorage.getItem('ter_unlocked') ?? '1', 10) || 1; } catch { return 1; }
}
function setUnlockedLevel(n: number) {
  try { localStorage.setItem('ter_unlocked', String(n)); } catch {}
}

// ── Button helper ──────────────────────────────────────────────────────────────
function useBtn() {
  return useCallback((active: boolean, extra = '') =>
    `rounded-xl border-2 px-3 py-2 font-bold transition active:scale-95 ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted hover:bg-muted/75'} ${extra}`, []);
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [screen, setScreen] = useState<Screen>('menu');
  const [theme, setTheme] = useState<Theme>('kawaii');

  // Quick setup state
  const [setupPlayers, setSetupPlayers] = useState(2);
  const [setupSize, setSetupSize] = useState(4);
  const [setupDifficulty, setSetupDifficulty] = useState<AiDifficulty>('intermedio');
  const [playerKinds, setPlayerKinds] = useState<PlayerKind[]>(['human', 'bot', 'human', 'human']);
  const [playerNames, setPlayerNames] = useState<string[]>(PLAYERS_DEF.map(p => p.name));
  const [playerHues, setPlayerHues] = useState<number[]>(PLAYERS_DEF.map(p => p.hue));

  // Tournament state
  const [tournamentRounds, setTournamentRounds] = useState<3 | 5>(3);

  // Campaign state
  const [campaignLevel, setCampaignLevel] = useState<CampaignLevel | null>(null);
  const [unlockedLevel, setUnlockedLevelState] = useState(getUnlockedLevel);

  // Sound
  const [soundOn, setSoundOn] = useState(true);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  const [aiThinking, setAiThinking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btn = useBtn();

  const current = state.players[state.currentPlayer];
  const botTurn = state.status === 'playing' && current?.kind === 'bot';
  const isHuman = current?.kind === 'human';

  // Apply theme
  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  // Sound toggle
  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  // Clear drop
  useEffect(() => {
    if (!state.dropEvent) return;
    SFX.drop();
    const t = setTimeout(() => dispatch({ type: 'CLEAR_DROP' }), 2400);
    return () => clearTimeout(t);
  }, [state.dropEvent]);

  // Clear bomb shake
  useEffect(() => {
    if (!state.bombed) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_BOMBED' }), 600);
    return () => clearTimeout(t);
  }, [state.bombed]);

  // Clear earth shake
  useEffect(() => {
    if (!state.earthShook) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_EARTH' }), 800);
    return () => clearTimeout(t);
  }, [state.earthShook]);

  // Win/draw sounds and confetti
  useEffect(() => {
    if (state.status === 'won') {
      const isBoss = state.campaign?.bossLivesLeft !== undefined && state.campaign.bossLivesLeft > 0;
      isBoss ? SFX.bossHit() : SFX.victory();
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(t);
    }
    if (state.status === 'draw') {
      SFX.draw();
    }
  }, [state.status]);

  // Escape cancels powerup
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch({ type: 'CANCEL_POWERUP' }); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // AI turns
  useEffect(() => {
    if (!botTurn || state.status !== 'playing') return;
    setAiThinking(true);
    const delay = state.activePowerup ? 360 : BOT_DELAY[state.aiDifficulty];
    timer.current = setTimeout(() => {
      if (state.activePowerup) {
        const target = chooseBotTarget(state.board, state.size, state.currentPlayer, state.activePowerup.type, state.numPlayers);
        dispatch(target >= 0 ? { type: 'CLICK_CELL', index: target } : { type: 'CANCEL_POWERUP' });
      } else {
        const pu = chooseBotPowerup(state.board, state.size, state.currentPlayer, current, state.aiDifficulty, state.numPlayers);
        if (pu >= 0) dispatch({ type: 'SELECT_POWERUP', powerupIndex: pu });
        else {
          const move = computeAiMove(state.board, state.size, state.currentPlayer, state.numPlayers, state.aiDifficulty);
          if (move >= 0) dispatch({ type: 'CLICK_CELL', index: move });
        }
      }
      setAiThinking(false);
    }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [botTurn, state.status, state.currentPlayer, state.activePowerup, state.board, state.size, state.numPlayers, state.aiDifficulty, current]);

  // ── Campaign win handler ────────────────────────────────────────────────────
  const handleCampaignWin = useCallback(() => {
    if (!state.campaign || !campaignLevel) return;
    const { bossLivesLeft } = state.campaign;
    if (campaignLevel.isBoss && bossLivesLeft > 1) {
      // Boss still has lives — restart with boss pre-placed
      SFX.bossHit();
      const newLives = bossLivesLeft - 1;
      const prePlaced = getBossPrePlacedPositions(campaignLevel.size, newLives * 2);
      const board = initBoard(campaignLevel.size, {
        withBonus: campaignLevel.withBonus,
        withTeleport: campaignLevel.withTeleport,
        extraBlocked: campaignLevel.extraBlocked,
        prePlaced,
      });
      dispatch({
        type: 'INIT_GAME',
        numPlayers: 2, size: campaignLevel.size,
        playerKinds: ['human', 'bot'],
        aiDifficulty: campaignLevel.difficulty,
        playerNames: [playerNames[0], campaignLevel.enemyName],
        playerHues: [playerHues[0], 0],
        tournament: null,
        campaign: { levelId: campaignLevel.id, bossLivesLeft: newLives, bossLivesTotal: campaignLevel.bossLives ?? 1 },
        boardOverride: board,
        startPowerups: [state.campaign.startRewards, campaignLevel.enemyStartPowerups ?? []],
      });
    } else {
      // Level complete — unlock next
      SFX.levelUp();
      const nextLevel = campaignLevel.id + 1;
      if (nextLevel > unlockedLevel) {
        setUnlockedLevelState(nextLevel);
        setUnlockedLevel(nextLevel);
      }
      setScreen('campaign');
      setCampaignLevel(null);
    }
  }, [state.campaign, campaignLevel, playerNames, playerHues, unlockedLevel]);

  // ── Tournament next-round handler ───────────────────────────────────────────
  const handleTournamentNextRound = useCallback(() => {
    if (!state.tournament) return;
    const { currentRound, totalRounds, roundResults } = state.tournament;
    if (currentRound >= totalRounds) return;
    dispatch({
      type: 'NEXT_ROUND',
      numPlayers: state.numPlayers, size: setupSize,
      playerKinds: playerKinds.slice(0, state.numPlayers),
      playerNames: playerNames.slice(0, state.numPlayers),
      playerHues: playerHues.slice(0, state.numPlayers),
      aiDifficulty: state.aiDifficulty,
      prevScores: state.players.map(p => p.score),
      tournament: { totalRounds, currentRound: currentRound + 1, roundResults },
    });
  }, [state.tournament, state.numPlayers, state.players, state.aiDifficulty, setupSize, playerKinds, playerNames, playerHues]);

  // ── Start campaign level ────────────────────────────────────────────────────
  const startCampaignLevel = useCallback((level: CampaignLevel) => {
    SFX.click();
    setCampaignLevel(level);
    const bossLives = level.bossLives ?? 1;
    const prePlaced = level.isBoss ? getBossPrePlacedPositions(level.size, 0) : undefined;
    const board = initBoard(level.size, {
      withBonus: level.withBonus,
      withTeleport: level.withTeleport,
      extraBlocked: level.extraBlocked,
      prePlaced,
    });
    dispatch({
      type: 'INIT_GAME',
      numPlayers: 2, size: level.size,
      playerKinds: ['human', 'bot'],
      aiDifficulty: level.difficulty,
      playerNames: [playerNames[0], level.enemyName],
      playerHues: [playerHues[0], level.id * 37 % 360],
      tournament: null,
      campaign: { levelId: level.id, bossLivesLeft: bossLives, bossLivesTotal: bossLives },
      boardOverride: board,
      startPowerups: [level.startReward, level.enemyStartPowerups ?? []],
    });
    setScreen('playing');
  }, [playerNames, playerHues]);

  // ── Start quick play ────────────────────────────────────────────────────────
  const startQuickPlay = useCallback(() => {
    SFX.click();
    dispatch({
      type: 'INIT_GAME',
      numPlayers: setupPlayers, size: setupSize,
      playerKinds: playerKinds.slice(0, setupPlayers),
      playerNames: playerNames.slice(0, setupPlayers),
      playerHues: playerHues.slice(0, setupPlayers),
      aiDifficulty: setupDifficulty,
      tournament: null, campaign: null,
    });
    setScreen('playing');
  }, [setupPlayers, setupSize, playerKinds, playerNames, playerHues, setupDifficulty]);

  // ── Start tournament ────────────────────────────────────────────────────────
  const startTournament = useCallback(() => {
    SFX.click();
    dispatch({
      type: 'INIT_GAME',
      numPlayers: setupPlayers, size: setupSize,
      playerKinds: playerKinds.slice(0, setupPlayers),
      playerNames: playerNames.slice(0, setupPlayers),
      playerHues: playerHues.slice(0, setupPlayers),
      aiDifficulty: setupDifficulty,
      tournament: { totalRounds: tournamentRounds, currentRound: 1, roundResults: [] },
      campaign: null,
    });
    setScreen('playing');
  }, [setupPlayers, setupSize, playerKinds, playerNames, playerHues, setupDifficulty, tournamentRounds]);

  // ── Targetable cells ────────────────────────────────────────────────────────
  const targetable = useMemo(() =>
    state.activePowerup
      ? new Set(powerupTargets(state.board, state.size, state.currentPlayer, state.activePowerup.type))
      : new Set<number>(),
    [state.activePowerup, state.board, state.size, state.currentPlayer]
  );

  // ── Shared layout elements ──────────────────────────────────────────────────
  const ThemeToggle = () => (
    <button onClick={() => { SFX.click(); setTheme(t => t === 'kawaii' ? 'arena' : 'kawaii'); }}
      className="rounded-full border border-border bg-card px-3 py-2 font-bold shadow text-sm">
      {theme === 'arena' ? '⚡ Arena' : '🌸 Kawaii'}
    </button>
  );
  const SoundToggle = () => (
    <button onClick={toggleSound} className="rounded-full border border-border bg-card p-2 shadow" aria-label="Sonido">
      {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ── MENU ──────────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (screen === 'menu') return (
    <TooltipProvider>
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="fixed right-4 top-4 flex gap-2"><SoundToggle /><ThemeToggle /></div>
        <motion.main initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-4 rounded-3xl border-4 border-border bg-card p-7 text-center shadow-xl">
          <div className="text-6xl">{theme === 'arena' ? '⚔️' : '🌸'}</div>
          <h1 className="text-4xl font-black">{theme === 'arena' ? 'Batalla Neón' : 'Mundo Kawaii'}</h1>
          <p className="text-sm text-muted-foreground">Forma una línea, usa comodines y supera a tus rivales</p>
          <div className="space-y-3 pt-2">
            <button onClick={() => { SFX.click(); setScreen('quickSetup'); }}
              className="w-full rounded-2xl bg-primary py-4 text-xl font-black text-primary-foreground shadow-lg transition active:scale-95">
              🎮 Partida Rápida
            </button>
            <button onClick={() => { SFX.click(); setScreen('campaign'); }}
              className="w-full rounded-2xl border-2 border-primary py-3 text-lg font-bold transition active:scale-95 hover:bg-primary/10">
              🗺️ Campaña
            </button>
            <button onClick={() => { SFX.click(); setScreen('tournamentSetup'); }}
              className="w-full rounded-2xl border-2 border-border py-3 text-lg font-bold transition active:scale-95 hover:bg-muted/60">
              🏆 Torneo
            </button>
          </div>
        </motion.main>
      </div>
    </TooltipProvider>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ── QUICK SETUP ───────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (screen === 'quickSetup') return (
    <TooltipProvider>
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="fixed right-4 top-4 flex gap-2"><SoundToggle /><ThemeToggle /></div>
        <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl space-y-5 rounded-3xl border-4 border-border bg-card p-6 shadow-xl sm:p-8">
          <button onClick={() => setScreen('menu')} className="text-sm font-bold opacity-60 hover:opacity-100">← Menú</button>
          <h2 className="text-2xl font-black text-center">Partida Rápida</h2>

          {/* Jugadores */}
          <section>
            <h3 className="mb-2 font-semibold">Jugadores</h3>
            <div className="flex gap-2 justify-center">{[2, 3, 4].map(n =>
              <button key={n} className={btn(setupPlayers === n)} onClick={() => { SFX.click(); setSetupPlayers(n); }}>{n}</button>
            )}</div>
          </section>

          {/* Personalización */}
          <section className="space-y-2">
            <h3 className="font-semibold">Personalización</h3>
            {PLAYERS_DEF.slice(0, setupPlayers).map((p, i) => (
              <div key={p.id} className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <input value={playerNames[i]} maxLength={16}
                    onChange={e => setPlayerNames(n => n.map((v, x) => x === i ? e.target.value : v))}
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm font-bold" />
                  <div className="flex gap-1">
                    <button className={btn(playerKinds[i] === 'human', 'text-xs px-2')}
                      onClick={() => { SFX.click(); setPlayerKinds(k => k.map((v, x) => x === i ? 'human' : v)); }}>👤</button>
                    <button className={btn(playerKinds[i] === 'bot', 'text-xs px-2')}
                      onClick={() => { SFX.click(); setPlayerKinds(k => k.map((v, x) => x === i ? 'bot' : v)); }}>🤖</button>
                  </div>
                </div>
                <HuePicker value={playerHues[i]} onChange={h => setPlayerHues(hs => hs.map((v, x) => x === i ? h : v))} />
                <div className="h-3 rounded-full" style={{ background: `hsl(${playerHues[i]},80%,60%)` }} />
              </div>
            ))}
          </section>

          {/* Dificultad */}
          <section>
            <h3 className="mb-2 font-semibold">Dificultad de bots</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DIFFICULTY_INFO) as AiDifficulty[]).map(d => (
                <button key={d} onClick={() => { SFX.click(); setSetupDifficulty(d); }} className={`${btn(setupDifficulty === d)} text-left`}>
                  <div>{DIFFICULTY_INFO[d].label}</div>
                  <div className="text-xs font-normal opacity-75">{DIFFICULTY_INFO[d].desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Tamaño */}
          <section>
            <h3 className="mb-2 font-semibold">Tamaño del tablero</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {BOARD_SIZES.map(s => <button key={s} className={btn(setupSize === s)} onClick={() => { SFX.click(); setSetupSize(s); }}>{s}×{s}</button>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Victoria: {getWinLen(setupSize)} en línea · Comodín: cada {getDropInterval(setupSize, setupDifficulty)} turnos
            </p>
          </section>

          <button onClick={startQuickPlay} className="w-full rounded-2xl bg-primary py-4 text-xl font-black text-primary-foreground shadow-lg transition active:scale-95">¡Jugar!</button>
        </motion.main>
      </div>
    </TooltipProvider>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ── TOURNAMENT SETUP ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (screen === 'tournamentSetup') return (
    <TooltipProvider>
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="fixed right-4 top-4 flex gap-2"><SoundToggle /><ThemeToggle /></div>
        <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl space-y-5 rounded-3xl border-4 border-border bg-card p-6 shadow-xl sm:p-8">
          <button onClick={() => setScreen('menu')} className="text-sm font-bold opacity-60 hover:opacity-100">← Menú</button>
          <h2 className="text-2xl font-black text-center">🏆 Torneo</h2>

          <section>
            <h3 className="mb-2 font-semibold">Formato</h3>
            <div className="flex gap-3 justify-center">
              {([3, 5] as const).map(r => (
                <button key={r} className={btn(tournamentRounds === r)} onClick={() => setTournamentRounds(r)}>Mejor de {r}</button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Jugadores</h3>
            <div className="flex gap-2 justify-center">{[2, 3, 4].map(n =>
              <button key={n} className={btn(setupPlayers === n)} onClick={() => { SFX.click(); setSetupPlayers(n); }}>{n}</button>
            )}</div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Jugadores</h3>
            {PLAYERS_DEF.slice(0, setupPlayers).map((p, i) => (
              <div key={p.id} className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <input value={playerNames[i]} maxLength={16}
                    onChange={e => setPlayerNames(n => n.map((v, x) => x === i ? e.target.value : v))}
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm font-bold" />
                  <div className="flex gap-1">
                    <button className={btn(playerKinds[i] === 'human', 'text-xs px-2')}
                      onClick={() => { SFX.click(); setPlayerKinds(k => k.map((v, x) => x === i ? 'human' : v)); }}>👤</button>
                    <button className={btn(playerKinds[i] === 'bot', 'text-xs px-2')}
                      onClick={() => { SFX.click(); setPlayerKinds(k => k.map((v, x) => x === i ? 'bot' : v)); }}>🤖</button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Dificultad de bots</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DIFFICULTY_INFO) as AiDifficulty[]).map(d => (
                <button key={d} onClick={() => { SFX.click(); setSetupDifficulty(d); }} className={`${btn(setupDifficulty === d)} text-left`}>
                  <div>{DIFFICULTY_INFO[d].label}</div>
                  <div className="text-xs font-normal opacity-75">{DIFFICULTY_INFO[d].desc}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Tamaño</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {BOARD_SIZES.slice(0, 4).map(s => <button key={s} className={btn(setupSize === s)} onClick={() => setSetupSize(s)}>{s}×{s}</button>)}
            </div>
          </section>

          <button onClick={startTournament} className="w-full rounded-2xl bg-primary py-4 text-xl font-black text-primary-foreground shadow-lg transition active:scale-95">¡Iniciar Torneo!</button>
        </motion.main>
      </div>
    </TooltipProvider>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ── CAMPAIGN MAP ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // ── World themes for campaign map & board ─────────────────────────────────────
  const WORLD_THEMES: Record<number, {
    cardBg: string; cardBorder: string; boardBg: string; icon: string; textColor?: string;
  }> = {
    1:  { icon: '🌿', cardBg: 'linear-gradient(135deg,#bbf7d040,#86efac30)', cardBorder: '#16a34a', boardBg: 'linear-gradient(160deg,#dcfce7,#f0fdf4)', textColor: '#14532d' },
    2:  { icon: '🌸', cardBg: 'linear-gradient(135deg,#fce7f340,#fbcfe830)', cardBorder: '#db2777', boardBg: 'linear-gradient(160deg,#fdf2f8,#fce7f3)', textColor: '#831843' },
    3:  { icon: '🌲', cardBg: 'linear-gradient(135deg,#14532d40,#16653430)', cardBorder: '#15803d', boardBg: 'linear-gradient(160deg,#052e16,#064e3b)', textColor: '#86efac' },
    4:  { icon: '⚔️', cardBg: 'linear-gradient(135deg,#fde68a40,#fbbf2430)', cardBorder: '#d97706', boardBg: 'linear-gradient(160deg,#451a03,#78350f)', textColor: '#fde68a' },
    5:  { icon: '🏰', cardBg: 'linear-gradient(135deg,#e5e7eb40,#d1d5db30)', cardBorder: '#6b7280', boardBg: 'linear-gradient(160deg,#1f2937,#374151)', textColor: '#f3f4f6' },
    6:  { icon: '🌊', cardBg: 'linear-gradient(135deg,#16653440,#05101030)', cardBorder: '#059669', boardBg: 'linear-gradient(160deg,#022c22,#064e3b)', textColor: '#6ee7b7' },
    7:  { icon: '🏔️', cardBg: 'linear-gradient(135deg,#bfdbfe40,#e0f2fe30)', cardBorder: '#3b82f6', boardBg: 'linear-gradient(160deg,#eff6ff,#dbeafe)', textColor: '#1e3a8a' },
    8:  { icon: '💀', cardBg: 'linear-gradient(135deg,#3b076440,#1e1b4b30)', cardBorder: '#7c3aed', boardBg: 'linear-gradient(160deg,#0c0014,#1e1b4b)', textColor: '#c4b5fd' },
    9:  { icon: '🌋', cardBg: 'linear-gradient(135deg,#fca5a540,#f9731630)', cardBorder: '#dc2626', boardBg: 'linear-gradient(160deg,#450a0a,#7f1d1d)', textColor: '#fca5a5' },
    10: { icon: '🔥', cardBg: 'linear-gradient(135deg,#7f1d1d50,#78350f40)', cardBorder: '#b91c1c', boardBg: 'linear-gradient(160deg,#1c0606,#450a0a)', textColor: '#fbbf24' },
  };

  if (screen === 'campaign') return (
    <TooltipProvider>
      <div className="min-h-[100dvh] p-4">
        <div className="fixed right-4 top-4 flex gap-2"><SoundToggle /><ThemeToggle /></div>
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setScreen('menu')} className="mt-4 text-sm font-bold opacity-60 hover:opacity-100">← Menú</button>
          <h2 className="my-4 text-3xl font-black text-center">🗺️ Campaña</h2>
          {/* Hero: player is a bear */}
          <div className="mb-4 text-center text-sm text-muted-foreground">
            🐻 <span className="font-bold">Tú eres el Osito</span> — ¡conquista todos los mundos!
          </div>
          <div className="space-y-3">
            {CAMPAIGN_LEVELS.map(level => {
              const stars = getLevelStars(level.id, unlockedLevel);
              const locked = level.id > unlockedLevel;
              const theme = WORLD_THEMES[level.id];
              return (
                <motion.button key={level.id} disabled={locked}
                  onClick={() => startCampaignLevel(level)}
                  whileHover={locked ? {} : { scale: 1.02 }}
                  whileTap={locked ? {} : { scale: 0.98 }}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition shadow ${locked ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed' : 'hover:opacity-95'}`}
                  style={locked ? {} : {
                    background: theme.cardBg,
                    borderColor: level.isBoss ? '#dc2626' : theme.cardBorder,
                    boxShadow: level.isBoss ? `0 4px 24px ${theme.cardBorder}55` : `0 2px 12px ${theme.cardBorder}33`,
                  }}>
                  <div className="flex items-center gap-3">
                    {/* World avatar: enemy on left, bear vs enemy */}
                    <div className="relative flex shrink-0 flex-col items-center">
                      <span className="text-3xl leading-none">{locked ? '🔒' : level.enemyEmoji}</span>
                      {!locked && <span className="text-base leading-none">🐻⚔️</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{level.id}. {level.name}</span>
                        {level.isBoss && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">JEFE</span>}
                      </div>
                      <div className="text-xs opacity-70 truncate font-medium">{level.worldName} · {level.description}</div>
                    </div>
                    <div className="text-lg shrink-0">{Array.from({ length: 3 }, (_, i) => i < stars ? '⭐' : '☆').join('')}</div>
                  </div>
                  {!locked && (
                    <div className="mt-2 text-xs opacity-60 italic">"{level.story}"</div>
                  )}
                  {!locked && (
                    <div className="mt-1 flex gap-2 text-xs font-medium opacity-70">
                      <span>{level.size}×{level.size}</span>
                      <span>{DIFFICULTY_INFO[level.difficulty].label}</span>
                      {level.withBonus && <span>⭐ Bonus</span>}
                      {level.withTeleport && <span>🌀 Portal</span>}
                      {level.startReward.length > 0 && <span>🎁 {level.startReward.map(p => POWERUP_ICONS[p]).join('')}</span>}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            🐻 En campaña siempre juegas como el Osito Héroe
          </div>
        </div>
      </div>
    </TooltipProvider>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // ── GAME SCREEN ───────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const boardStyle = getBoardStyles(state.size);
  const dropInterval = getDropInterval(state.size, state.aiDifficulty);
  const nextDrop = state.status === 'playing' ? dropInterval - (state.turnCount % dropInterval) : 0;

  // Tournament winner check
  const tmt = state.tournament;
  const tmtDone = tmt !== null && (state.status === 'won' || state.status === 'draw')
    && tmt.currentRound >= tmt.totalRounds;
  const tmtChampion = tmtDone
    ? state.players.reduce((best, p, i) => p.score > (state.players[best]?.score ?? -1) ? i : best, 0)
    : null;

  // Campaign boss info
  const camp = state.campaign;
  const bossRound = camp?.bossLivesTotal ?? 1;
  const bossLeft = camp?.bossLivesLeft ?? 0;

  const handleCellClick = (index: number) => {
    if (state.status !== 'playing' || !isHuman || aiThinking) return;
    SFX.place();
    dispatch({ type: 'CLICK_CELL', index });
  };

  const handlePowerupClick = (pi: number) => {
    SFX.powerupPick();
    dispatch({ type: 'SELECT_POWERUP', powerupIndex: pi });
  };

  return (
    <TooltipProvider>
      <Confetti active={showConfetti} />
      {/* shake classes */}
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes earthShake { 0%,100%{transform:translate(0,0) rotate(0deg)} 10%{transform:translate(-4px,2px) rotate(-1deg)} 30%{transform:translate(4px,-3px) rotate(1deg)} 50%{transform:translate(-6px,3px) rotate(-2deg)} 70%{transform:translate(5px,-2px) rotate(1.5deg)} 90%{transform:translate(-3px,4px) rotate(-1deg)} }
        .shake { animation: shake 0.5s ease; }
        .earth-shake { animation: earthShake 0.8s ease; }
      `}</style>

      {/* Campaign themed background overlay */}
      {campaignLevel && WORLD_THEMES[campaignLevel.id] && (
        <div className="pointer-events-none fixed inset-0 z-0"
          style={{ background: WORLD_THEMES[campaignLevel.id].boardBg, opacity: 0.18 }} />
      )}

      <div className="relative z-10 min-h-[100dvh] px-3 pb-8 pt-14 sm:px-4">
        {/* Top bar */}
        <div className="fixed left-3 top-3 z-50 flex gap-2">
          <button onClick={() => { SFX.click(); setScreen('menu'); dispatch({ type: 'CANCEL_POWERUP' }); }}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm font-bold shadow">← Menú</button>
          <button onClick={() => {
            SFX.click();
            if (state.campaign && campaignLevel) {
              startCampaignLevel(campaignLevel);
            } else if (state.tournament) {
              dispatch({ type: 'NEXT_ROUND', numPlayers: state.numPlayers, size: setupSize, playerKinds: playerKinds.slice(0, state.numPlayers), playerNames: playerNames.slice(0, state.numPlayers), playerHues: playerHues.slice(0, state.numPlayers), aiDifficulty: state.aiDifficulty, prevScores: Array(state.numPlayers).fill(0), tournament: state.tournament });
            } else {
              dispatch({ type: 'INIT_GAME', numPlayers: state.numPlayers, size: state.size, playerKinds: playerKinds.slice(0, state.numPlayers), playerNames: playerNames.slice(0, state.numPlayers), playerHues: playerHues.slice(0, state.numPlayers), aiDifficulty: state.aiDifficulty, tournament: null, campaign: null });
            }
          }} className="rounded-full border border-border bg-card p-2 shadow" aria-label="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="fixed right-3 top-3 z-50 flex gap-2"><SoundToggle /><ThemeToggle /></div>

        {/* Mode badge */}
        {tmt && (
          <div className="mx-auto mb-2 max-w-3xl text-center text-sm font-bold">
            🏆 Torneo · Ronda {tmt.currentRound}/{tmt.totalRounds}
            {tmt.roundResults.length > 0 && (
              <span className="ml-2 opacity-70">
                {tmt.roundResults.map((r, i) => (
                  <span key={i}>{r === 'draw' ? '🤝' : state.players[r as number]?.emoji ?? '?'} </span>
                ))}
              </span>
            )}
          </div>
        )}
        {camp && (
          <div className="mx-auto mb-2 max-w-3xl text-center text-sm font-bold">
            {campaignLevel?.worldName} · Nivel {camp.levelId}
            {campaignLevel?.isBoss && (
              <span className="ml-2">{Array.from({ length: bossRound }, (_, i) => i < bossLeft ? '❤️' : '🖤').join('')}</span>
            )}
          </div>
        )}

        {/* Players */}
        <div className="mx-auto mb-4 flex max-w-3xl flex-wrap justify-center gap-2">
          {state.players.map((p, i) => {
            const displayEmoji = campaignLevel
              ? (i === 0 ? '🐻' : campaignLevel.enemyEmoji)
              : p.emoji;
            return (
            <div key={p.id}
              className={`relative min-w-[95px] rounded-xl border-2 p-2 text-center transition ${i === state.currentPlayer ? 'scale-105 border-primary shadow-lg' : 'border-border bg-card opacity-75'}`}
              style={i === state.currentPlayer ? { backgroundColor: `hsl(${p.hue},70%,96%)`, borderColor: `hsl(${p.hue},70%,60%)` } : {}}>
              <div className="text-2xl">{displayEmoji}</div>
              <div className="text-sm font-bold truncate max-w-[90px]">{p.name}{p.kind === 'bot' ? ' 🤖' : ''}</div>
              <div className="text-xs">Pts: {p.score}</div>
              {p.extraTurns > 0 && <div className="text-xs text-primary font-bold">⚡+1</div>}
              <div className="mt-1 flex min-h-7 flex-wrap justify-center gap-1">
                {p.powerups.map((pu, pi) => (
                  <Tooltip key={`${pu}-${pi}`}>
                    <TooltipTrigger asChild>
                      <button
                        disabled={i !== state.currentPlayer || !isHuman || state.status !== 'playing' || !!state.activePowerup}
                        onClick={() => handlePowerupClick(pi)}
                        className="h-7 w-7 rounded bg-muted text-base disabled:opacity-40 hover:bg-primary/20 transition">
                        {POWERUP_ICONS[pu]}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p className="font-bold">{pu}</p><p className="text-xs">{POWERUP_TOOLTIPS[pu]}</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>
              {i === state.currentPlayer && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: `hsl(${p.hue},70%,55%)`, color: 'white' }}>
                  {aiThinking ? 'Pensando…' : 'Turno'}
                </span>
              )}
            </div>
            );
          })}
        </div>

        {/* Status bar */}
        <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between rounded-xl border border-border bg-card/80 px-3 py-2 text-sm">
          <span>🎯 {getWinLen(state.size)} en línea</span>
          {state.status === 'playing' && <span>🎁 Comodín en {nextDrop} {nextDrop === 1 ? 'turno' : 'turnos'}</span>}
        </div>

        {/* Active powerup banner */}
        {state.activePowerup && (
          <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between rounded-xl bg-destructive/10 px-3 py-2 text-sm font-bold">
            <span>{POWERUP_ICONS[state.activePowerup.type]} {state.activePowerup.type}: selecciona una casilla resaltada</span>
            <button onClick={() => dispatch({ type: 'CANCEL_POWERUP' })} aria-label="Cancelar"><X size={18} /></button>
          </div>
        )}

        {/* Board */}
        <div
          className={`mx-auto grid aspect-square ${boardStyle.gap} ${state.earthShook ? 'earth-shake' : ''}`}
          style={{ width: boardStyle.maxW, gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}>
          {state.board.map((cell, index) => {
            const winning = state.winningLine?.includes(index);
            const canTarget = targetable.has(index);
            const canPlace = !state.activePowerup && (cell.type === 'empty' || cell.type === 'powerup' || cell.type === 'bonus' || cell.type === 'teleport');
            const bombed = state.bombed === index;

            const playerColor = cell.type === 'player' && cell.playerIndex !== undefined
              ? `hsl(${state.players[cell.playerIndex]?.hue ?? 210},70%,60%)`
              : undefined;

            return (
              <button key={index}
                disabled={!isHuman || aiThinking || state.status !== 'playing' || (!canPlace && !canTarget)}
                onClick={() => handleCellClick(index)}
                aria-label={`Casilla ${index + 1}`}
                className={`relative flex aspect-square items-center justify-center rounded-lg border-2 transition active:scale-95 disabled:cursor-default
                  ${bombed ? 'shake' : ''}
                  ${winning ? 'border-accent bg-accent/20 shadow-[0_0_18px_var(--accent)]' : ''}
                  ${canTarget ? 'border-destructive bg-destructive/15 animate-pulse' : ''}
                  ${cell.type === 'blocked' ? 'border-border bg-muted/70' : ''}
                  ${cell.type === 'bonus' ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''}
                  ${cell.type === 'teleport' ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : ''}
                  ${!winning && !canTarget && cell.type !== 'blocked' && cell.type !== 'bonus' && cell.type !== 'teleport' ? 'border-border bg-card hover:bg-muted/60' : ''}`}
                style={cell.type === 'player' && playerColor ? { borderColor: playerColor, backgroundColor: `${playerColor}22` } : {}}>
                {cell.type === 'blocked' && <span className={boardStyle.emojiSize}>🪨</span>}
                {cell.type === 'powerup' && <span className={boardStyle.emojiSize}>🎁</span>}
                {cell.type === 'bonus' && <span className={boardStyle.emojiSize}>⭐</span>}
                {cell.type === 'teleport' && <span className={boardStyle.emojiSize}>🌀</span>}
                {cell.type === 'player' && cell.playerIndex !== undefined && (
                  <>
                    <span className={boardStyle.emojiSize}>
                      {campaignLevel
                        ? (cell.playerIndex === 0 ? '🐻' : campaignLevel.enemyEmoji)
                        : (PLAYERS_DEF[cell.playerIndex]?.emoji)}
                    </span>
                    {cell.shielded && <span className="absolute right-0 top-0 text-xs sm:text-sm">🛡️</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Drop toast */}
        <AnimatePresence>
          {state.dropEvent && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-foreground px-5 py-3 text-center font-bold text-background shadow-xl">
              🎁 ¡Nuevos comodines!
              {state.dropEvent.gifts.map((g, i) => (
                <span key={i} className="ml-2">{state.players[g.playerIndex]?.emoji}{POWERUP_ICONS[g.powerup]}</span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win / Draw overlay */}
        {(state.status === 'won' || state.status === 'draw') && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-3xl border-4 border-primary bg-card p-7 text-center shadow-2xl">
              {/* Tournament done */}
              {tmtDone && tmtChampion !== null ? (
                <>
                  <div className="text-6xl">🏆</div>
                  <h2 className="mt-3 text-3xl font-black">¡Campeón!</h2>
                  <div className="mt-2 text-xl">{state.players[tmtChampion]?.emoji} {state.players[tmtChampion]?.name}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {state.players.map((p, i) => <div key={i}>{p.emoji} {p.name}: {p.score} pts</div>)}
                  </div>
                  <div className="mt-5 flex justify-center gap-2">
                    <button onClick={() => setScreen('menu')} className="rounded-xl border border-border bg-muted px-5 py-3 font-bold">Menú</button>
                  </div>
                </>
              ) : tmt && !tmtDone ? (
                <>
                  <div className="text-5xl">{state.status === 'won' && state.winner !== null ? state.players[state.winner].emoji : '🤝'}</div>
                  <h2 className="mt-3 text-2xl font-black">
                    {state.status === 'won' && state.winner !== null ? `¡Ganó ${state.players[state.winner].name}!` : '¡Empate!'}
                  </h2>
                  <div className="mt-2 text-sm">Ronda {tmt.currentRound}/{tmt.totalRounds}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {state.players.map((p, i) => <span key={i} className="mr-2">{p.emoji} {p.score}</span>)}
                  </div>
                  <button onClick={handleTournamentNextRound} className="mt-5 w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                    Siguiente ronda →
                  </button>
                </>
              ) : camp && state.status === 'won' && state.winner === 0 ? (
                /* Campaign win */
                <>
                  <div className="text-5xl">{campaignLevel?.isBoss && bossLeft > 1 ? '⚔️' : '🎉'}</div>
                  <h2 className="mt-3 text-2xl font-black">
                    {campaignLevel?.isBoss && bossLeft > 1
                      ? `¡Golpe al jefe! (${bossLeft - 1} ❤️ restante${bossLeft - 1 !== 1 ? 's' : ''})`
                      : '¡Nivel superado!'}
                  </h2>
                  {campaignLevel?.isBoss && bossLeft > 1
                    ? <p className="mt-2 text-sm text-muted-foreground">El jefe regresa más furioso…</p>
                    : <p className="mt-2 text-sm text-muted-foreground">¡Siguiente nivel desbloqueado!</p>}
                  <div className="mt-5 flex justify-center gap-2">
                    <button onClick={handleCampaignWin} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                      {campaignLevel?.isBoss && bossLeft > 1 ? 'Continuar batalla' : 'Siguiente nivel →'}
                    </button>
                    <button onClick={() => setScreen('campaign')} className="rounded-xl border border-border bg-muted px-5 py-3 font-bold">Mapa</button>
                  </div>
                </>
              ) : camp && state.status === 'won' && state.winner !== 0 ? (
                /* Campaign loss */
                <>
                  <div className="text-5xl">💀</div>
                  <h2 className="mt-3 text-2xl font-black">Derrotado…</h2>
                  <p className="mt-2 text-sm text-muted-foreground">¡Inténtalo de nuevo!</p>
                  <div className="mt-5 flex justify-center gap-2">
                    <button onClick={() => campaignLevel && startCampaignLevel(campaignLevel)} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Reintentar</button>
                    <button onClick={() => setScreen('campaign')} className="rounded-xl border border-border bg-muted px-5 py-3 font-bold">Mapa</button>
                  </div>
                </>
              ) : camp && state.status === 'draw' ? (
                /* Campaign draw */
                <>
                  <div className="text-5xl">🤝</div>
                  <h2 className="mt-3 text-2xl font-black">¡Empate!</h2>
                  <div className="mt-5 flex justify-center gap-2">
                    <button onClick={() => campaignLevel && startCampaignLevel(campaignLevel)} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Reintentar</button>
                    <button onClick={() => setScreen('campaign')} className="rounded-xl border border-border bg-muted px-5 py-3 font-bold">Mapa</button>
                  </div>
                </>
              ) : (
                /* Normal win/draw */
                <>
                  <div className="text-6xl">{state.status === 'won' && state.winner !== null ? state.players[state.winner].emoji : '🤝'}</div>
                  <h2 className="mt-3 text-3xl font-black">
                    {state.status === 'won' && state.winner !== null ? `¡Ganó ${state.players[state.winner].name}!` : '¡Empate!'}
                  </h2>
                  <div className="mt-5 flex justify-center gap-2">
                    <button onClick={() => {
                      SFX.click();
                      dispatch({ type: 'INIT_GAME', numPlayers: state.numPlayers, size: state.size, playerKinds: playerKinds.slice(0, state.numPlayers), playerNames: playerNames.slice(0, state.numPlayers), playerHues: playerHues.slice(0, state.numPlayers), aiDifficulty: state.aiDifficulty, prevScores: state.players.map(p => p.score), tournament: null, campaign: null });
                    }} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
                      Otra partida
                    </button>
                    <button onClick={() => { SFX.click(); setScreen('menu'); }} className="rounded-xl border border-border bg-muted px-5 py-3 font-bold">Menú</button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
