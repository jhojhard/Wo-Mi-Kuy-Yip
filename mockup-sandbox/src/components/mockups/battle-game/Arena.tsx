import React from 'react';
import { Lock, Star, Zap, Plus } from 'lucide-react';

const PLAYERS = [
  { id: 'dog', name: 'Perro', emoji: '🐶', color: '#00ffff', wins: 2, powerUps: 1, active: false },
  { id: 'cat', name: 'Gato', emoji: '🐱', color: '#ff00ff', wins: 1, powerUps: 2, active: true },
  { id: 'rabbit', name: 'Conejo', emoji: '🐰', color: '#00ff00', wins: 3, powerUps: 0, active: false },
  { id: 'fox', name: 'Zorro', emoji: '🦊', color: '#ff8800', wins: 0, powerUps: 1, active: false },
];

const BOARD = [
  [{ type: 'dog' }, { type: 'empty' }, { type: 'cat' }, { type: 'empty' }, { type: 'powerup' }],
  [{ type: 'empty' }, { type: 'rabbit' }, { type: 'empty' }, { type: 'dog' }, { type: 'empty' }],
  [{ type: 'empty' }, { type: 'empty' }, { type: 'fox' }, { type: 'empty' }, { type: 'empty' }],
  [{ type: 'blocked' }, { type: 'empty' }, { type: 'empty' }, { type: 'blocked' }, { type: 'empty' }],
  [{ type: 'empty' }, { type: 'empty' }, { type: 'powerup' }, { type: 'empty' }, { type: 'empty' }],
];

const POWERUPS = [
  { name: 'Bomba', emoji: '💣', desc: 'Destruye una celda', count: 1, color: 'text-red-500' },
  { name: 'Escudo', emoji: '🛡', desc: 'Protege tu celda', count: 2, color: 'text-blue-400' },
  { name: 'Robo', emoji: '🎯', desc: 'Roba una pieza', count: 0, color: 'text-purple-500' },
  { name: 'Doble Jugada', emoji: '⚡', desc: 'Juega 2 veces', count: 1, color: 'text-yellow-400' },
];

export function Arena() {
  const getCellStyle = (cell: any) => {
    if (cell.type === 'empty' || cell.type === 'blocked' || cell.type === 'powerup') return {};
    const player = PLAYERS.find(p => p.id === cell.type);
    if (!player) return {};
    
    return {
      borderColor: player.color,
      boxShadow: `0 0 15px ${player.color}40, inset 0 0 15px ${player.color}20`
    };
  };

  const renderCellContent = (cell: any) => {
    if (cell.type === 'empty') return null;
    if (cell.type === 'blocked') return <Lock className="text-gray-700 w-8 h-8 md:w-12 md:h-12 opacity-50" />;
    if (cell.type === 'powerup') return (
      <div className="relative flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
        <Star className="text-yellow-400 fill-yellow-400 w-8 h-8 md:w-12 md:h-12" style={{ filter: 'drop-shadow(0 0 12px rgba(250,204,21,0.9))' }} />
        <Zap className="absolute text-white w-4 h-4 md:w-5 md:h-5 fill-white" />
      </div>
    );
    
    const player = PLAYERS.find(p => p.id === cell.type);
    if (!player) return null;
    
    return (
      <span style={{ filter: `drop-shadow(0 0 10px ${player.color})` }} className="transform hover:scale-110 transition-transform cursor-pointer">
        {player.emoji}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white font-sans flex flex-col items-center py-8 px-4 relative overflow-hidden font-mono">
      {/* Background radial gradient for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a3a_0%,_#0d0d1a_100%)] pointer-events-none" />
      
      {/* Grid background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Header */}
        <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 uppercase italic text-center drop-shadow-[0_0_20px_rgba(255,0,255,0.4)]">
          Battle Arena
        </h1>

        {/* Player Roster */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-10">
          {PLAYERS.map(p => (
            <div key={p.id} 
                 className={`relative flex flex-col items-center p-4 rounded-xl border-2 bg-[#121222] backdrop-blur-sm w-[110px] sm:w-32 md:w-40 transition-all duration-300
                   ${p.active ? 'scale-110 z-20' : 'border-gray-800 opacity-60 hover:opacity-100 hover:border-gray-600'}
                 `}
                 style={{ 
                   borderColor: p.active ? p.color : undefined, 
                   boxShadow: p.active ? `0 0 25px ${p.color}55, inset 0 0 15px ${p.color}33` : undefined 
                 }}>
              
              <div className="text-4xl md:text-5xl mb-2 transition-transform duration-300 hover:scale-125 cursor-pointer" 
                   style={{ filter: `drop-shadow(0 0 12px ${p.color})` }}>
                {p.emoji}
              </div>
              
              <div className="font-bold text-sm md:text-lg tracking-wider uppercase" 
                   style={{ color: p.color, textShadow: `0 0 8px ${p.color}` }}>
                {p.name}
              </div>
              
              <div className="flex gap-1.5 md:gap-2 mt-3 w-full justify-center">
                <div className="flex flex-col items-center bg-black/60 rounded px-1.5 py-1 w-1/2 border border-gray-800">
                  <span className="text-[10px] md:text-xs text-gray-400 font-sans uppercase">Wins</span>
                  <span className="font-mono text-sm md:text-base text-white">{p.wins}</span>
                </div>
                <div className="flex flex-col items-center bg-black/60 rounded px-1.5 py-1 w-1/2 border border-gray-800">
                  <span className="text-[10px] md:text-xs text-gray-400 font-sans uppercase">Items</span>
                  <span className="font-mono text-sm md:text-base text-white">{p.powerUps}</span>
                </div>
              </div>
              
              {p.active && (
                <div className="absolute -top-3 md:-top-4 bg-white text-black text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-[pulse_2s_ease-in-out_infinite]"
                     style={{ backgroundColor: p.color, boxShadow: `0 0 15px ${p.color}` }}>
                  Playing
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Turn Indicator */}
        <div className="flex items-center justify-center gap-3 md:gap-4 py-2 px-6 md:py-3 md:px-8 rounded-full border-2 bg-black/60 backdrop-blur-md mb-8 animate-[pulse_2s_ease-in-out_infinite]"
             style={{ borderColor: '#ff00ff', boxShadow: '0 0 25px rgba(255,0,255,0.5), inset 0 0 12px rgba(255,0,255,0.3)' }}>
          <span className="text-2xl md:text-3xl" style={{ filter: 'drop-shadow(0 0 10px #ff00ff)' }}>🐱</span>
          <h2 className="text-lg md:text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-600"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,0,255,0.6))' }}>
            TURNO DE GATO
          </h2>
        </div>

        {/* Game Board with Expansion Hints */}
        <div className="relative mb-12 mt-2">
          {/* Expansion buttons */}
          <button className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-10 flex items-center justify-center border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] group bg-black/20 backdrop-blur-sm z-0">
            <Plus size={20} className="group-hover:scale-125 transition-transform" />
          </button>
          <button className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-32 h-10 flex items-center justify-center border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] group bg-black/20 backdrop-blur-sm z-0">
            <Plus size={20} className="group-hover:scale-125 transition-transform" />
          </button>
          <button className="absolute top-1/2 -left-12 -translate-y-1/2 w-10 h-32 flex items-center justify-center border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] group bg-black/20 backdrop-blur-sm z-0">
            <Plus size={20} className="group-hover:scale-125 transition-transform" />
          </button>
          <button className="absolute top-1/2 -right-12 -translate-y-1/2 w-10 h-32 flex items-center justify-center border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] group bg-black/20 backdrop-blur-sm z-0">
            <Plus size={20} className="group-hover:scale-125 transition-transform" />
          </button>

          {/* 5x5 Grid */}
          <div className="relative z-10 grid grid-cols-5 gap-2 md:gap-3 p-3 md:p-4 bg-black/50 border border-gray-800 rounded-2xl backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            {BOARD.map((row, rIdx) => 
              row.map((cell, cIdx) => (
                <div key={`${rIdx}-${cIdx}`} 
                     className={`w-[3.5rem] h-[3.5rem] sm:w-[4.5rem] sm:h-[4.5rem] md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-xl flex items-center justify-center text-3xl md:text-5xl lg:text-6xl transition-all duration-300 relative
                       ${cell.type === 'empty' ? 'bg-[#151525] hover:bg-[#1f1f3a] border border-gray-800 hover:border-pink-500/60 cursor-pointer shadow-[inset_0_0_15px_rgba(0,0,0,0.6)] hover:shadow-[0_0_15px_rgba(255,0,255,0.2),inset_0_0_20px_rgba(255,0,255,0.1)]' : ''}
                       ${cell.type === 'blocked' ? 'bg-[#080810] border-2 border-gray-800/80 cursor-not-allowed shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]' : ''}
                       ${cell.type !== 'empty' && cell.type !== 'blocked' ? 'bg-[#1a1a30] border-2 shadow-xl' : ''}
                     `}
                     style={getCellStyle(cell)}>
                  
                  {/* Subtle coordinates for arcade feel */}
                  <div className="absolute top-1 left-1 text-[8px] md:text-[10px] text-gray-700 opacity-50 font-sans pointer-events-none">
                    {rIdx},{cIdx}
                  </div>
                  
                  {renderCellContent(cell)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Power-up Bar */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 w-full max-w-4xl px-2">
          {POWERUPS.map((pu, i) => (
            <div key={i} 
                 className={`relative flex flex-col p-3 md:p-4 rounded-xl border flex-1 min-w-[140px] max-w-[220px] transition-all duration-300 group
                   ${pu.count > 0 
                     ? 'bg-[#121222] border-gray-700 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] hover:-translate-y-1 cursor-pointer' 
                     : 'bg-[#0a0a14] border-gray-900 opacity-50 grayscale cursor-not-allowed'}
                 `}>
              {/* Background glow based on count */}
              {pu.count > 0 && (
                 <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent blur-2xl rounded-full pointer-events-none" />
              )}
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <span className={`text-3xl md:text-4xl filter drop-shadow-md transition-transform duration-300 ${pu.count > 0 ? 'group-hover:scale-110 group-hover:rotate-6' : ''}`}>
                  {pu.emoji}
                </span>
                <span className={`flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs font-black shadow-lg ${pu.count > 0 ? 'bg-cyan-400 text-black shadow-[0_0_10px_#00ffff]' : 'bg-gray-800 text-gray-500'}`}>
                  {pu.count}
                </span>
              </div>
              
              <div className="relative z-10">
                <h3 className={`font-bold text-sm md:text-base tracking-wide uppercase ${pu.count > 0 ? pu.color : 'text-gray-500'} mb-1 font-sans`}
                    style={{ textShadow: pu.count > 0 ? '0 0 8px currentColor' : 'none' }}>
                  {pu.name}
                </h3>
                <p className="text-[10px] md:text-xs text-gray-400 leading-snug font-sans">{pu.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
