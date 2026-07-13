import React from 'react';
import { Sparkles, Star, Shield, Bomb, Gift, Lock } from 'lucide-react';

export function Kawaii() {
  const players = [
    { id: 'dog', name: 'Perrito', icon: '🐶', bg: 'bg-[#93c5fd]', text: 'text-blue-900', border: 'border-blue-400', shadow: 'shadow-blue-200', hearts: '♥♥♥', stars: 2, active: false },
    { id: 'cat', name: 'Gatito', icon: '🐱', bg: 'bg-[#f9a8d4]', text: 'text-pink-900', border: 'border-pink-400', shadow: 'shadow-pink-300', hearts: '♥♥♥', stars: 1, active: true },
    { id: 'rabbit', name: 'Conejito', icon: '🐰', bg: 'bg-[#86efac]', text: 'text-green-900', border: 'border-green-400', shadow: 'shadow-green-200', hearts: '♥♥', stars: 0, active: false },
    { id: 'fox', name: 'Zorrito', icon: '🦊', bg: 'bg-[#fdba74]', text: 'text-orange-900', border: 'border-orange-400', shadow: 'shadow-orange-200', hearts: '♥♥♥', stars: 3, active: false },
  ];

  const renderCell = (row: number, col: number) => {
    // Cell (0,0): Dog
    if (row === 0 && col === 0) return <PlayerCell icon="🐶" bg="bg-[#93c5fd]" border="border-blue-400" />;
    // Cell (0,2): Cat
    if (row === 0 && col === 2) return <PlayerCell icon="🐱" bg="bg-[#f9a8d4]" border="border-pink-400" />;
    // Cell (1,1): Rabbit
    if (row === 1 && col === 1) return <PlayerCell icon="🐰" bg="bg-[#86efac]" border="border-green-400" />;
    // Cell (2,2): Fox
    if (row === 2 && col === 2) return <PlayerCell icon="🦊" bg="bg-[#fdba74]" border="border-orange-400" />;
    // Cell (1,3): BLOCKED
    if (row === 1 && col === 3) return (
      <div className="w-full aspect-square rounded-3xl bg-gray-200 border-4 border-gray-300 shadow-inner flex items-center justify-center flex-col gap-1">
        <span className="text-3xl">🔒</span>
      </div>
    );
    // Cell (3,1): POWER-UP
    if (row === 3 && col === 1) return (
      <div className="w-full aspect-square rounded-3xl bg-yellow-100 border-4 border-yellow-400 shadow-md flex items-center justify-center flex-col shadow-yellow-200 animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-yellow-300 opacity-20"></div>
        <span className="text-3xl z-10">⭐</span>
        <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest z-10 mt-1">Comodín</span>
      </div>
    );

    // Empty cell
    return <div className="w-full aspect-square rounded-3xl bg-white border-4 border-[#ffedd5] shadow-sm flex items-center justify-center"></div>;
  };

  return (
    <div className="min-h-screen bg-[#fef9f0] pb-12 font-sans selection:bg-pink-200 text-gray-700 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-10 left-10 text-4xl text-pink-200 rotate-12">✦</div>
        <div className="absolute top-20 right-20 text-3xl text-yellow-200 -rotate-12">★</div>
        <div className="absolute top-1/2 left-4 text-5xl text-blue-200 rotate-45">✦</div>
        <div className="absolute bottom-20 right-10 text-4xl text-green-200 -rotate-45">★</div>
      </div>

      <div className="max-w-md mx-auto w-full pt-8 px-4 flex flex-col items-center gap-8 relative z-10">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black text-[#ff8fab] tracking-tight flex items-center justify-center gap-3 drop-shadow-sm">
            <span className="text-yellow-400">✦</span>
            Mundo Kawaii
            <span className="text-yellow-400">✦</span>
          </h1>
          <p className="text-[#fb6f92] font-bold mt-2 text-lg tracking-wide rounded-full bg-pink-100/50 inline-block px-4 py-1">
            ✨ Batalla de Mascotas ✨
          </p>
        </div>

        {/* Player Roster */}
        <div className="grid grid-cols-2 gap-4 w-full">
          {players.map(p => (
            <div 
              key={p.id} 
              className={`relative rounded-3xl p-3 border-4 ${p.border} ${p.bg} shadow-lg ${p.shadow} flex flex-col items-center gap-1 transition-transform ${p.active ? 'ring-4 ring-pink-300 ring-offset-4 ring-offset-[#fef9f0] scale-105 z-10' : 'opacity-90'}`}
            >
              {p.active && (
                <div className="absolute -top-3 -right-3 bg-white text-pink-500 rounded-full p-1 shadow-md animate-bounce">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </div>
              )}
              <div className="text-4xl drop-shadow-md bg-white/40 rounded-full p-2 w-16 h-16 flex items-center justify-center border-2 border-white/50">{p.icon}</div>
              <div className={`font-black text-lg ${p.text} drop-shadow-sm`}>{p.name}</div>
              
              <div className="flex w-full justify-between items-center bg-white/50 rounded-2xl px-2 py-1 mt-1">
                <span className="text-red-500 text-sm tracking-tighter drop-shadow-sm">{p.hearts}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black">{p.stars}</span>
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Turn Indicator */}
        <div className="w-full">
          <div className="bg-white border-4 border-pink-300 rounded-[2rem] rounded-bl-xl p-4 shadow-xl shadow-pink-100/50 relative text-center">
            <div className="absolute -bottom-4 left-8 w-6 h-6 bg-white border-b-4 border-l-4 border-pink-300 transform -rotate-45 translate-y-1/2"></div>
            <p className="text-xl font-black text-pink-600 flex items-center justify-center gap-2">
              ¡Es el turno de Gatito! <span className="text-2xl animate-pulse">🐱</span>
            </p>
          </div>
        </div>

        {/* 4x4 Game Board */}
        <div className="w-full bg-white/60 backdrop-blur-sm p-4 rounded-[2.5rem] shadow-xl border-4 border-white">
          <div className="grid grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, row) => (
              Array.from({ length: 4 }).map((_, col) => (
                <div key={`${row}-${col}`} className="relative">
                  {renderCell(row, col)}
                </div>
              ))
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex flex-col gap-2 bg-white/80 p-4 rounded-3xl shadow-sm border-2 border-pink-100">
          <div className="flex justify-between items-center text-sm font-black text-pink-500 uppercase tracking-wider">
            <span>Progreso</span>
            <span className="text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full text-xs">¡Faltan 4!</span>
          </div>
          <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden border-2 border-gray-200 flex">
            <div className="h-full bg-gradient-to-r from-pink-300 to-pink-500 w-3/5 rounded-full relative overflow-hidden flex items-center justify-end pr-2">
              <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.4) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.4) 75%, transparent 75%, transparent)' }}></div>
              <span className="text-xs text-white drop-shadow-md relative z-10">60%</span>
            </div>
          </div>
        </div>

        {/* Power-up Area */}
        <div className="w-full flex flex-col gap-3">
          <h3 className="font-black text-gray-400 uppercase tracking-widest text-center text-sm flex items-center justify-center gap-2">
            <span className="h-px bg-gray-300 flex-1 rounded"></span>
            Tus Poderes
            <span className="h-px bg-gray-300 flex-1 rounded"></span>
          </h3>
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            <PowerUpCard icon="🎈" name="Bomba" count={1} color="bg-red-100" border="border-red-300" />
            <PowerUpCard icon="🌟" name="Escudo" count={2} color="bg-yellow-100" border="border-yellow-300" />
            <PowerUpCard icon="🎀" name="Robo" count={0} color="bg-pink-100" border="border-pink-300" />
            <PowerUpCard icon="🍬" name="Turno+" count={1} color="bg-purple-100" border="border-purple-300" />
          </div>
        </div>
        
      </div>
    </div>
  );
}

function PlayerCell({ icon, bg, border }: { icon: string, bg: string, border: string }) {
  return (
    <div className={`w-full aspect-square rounded-3xl ${bg} border-4 ${border} shadow-md flex items-center justify-center relative overflow-hidden transform transition-transform hover:scale-105 cursor-pointer`}>
      <div className="absolute inset-0 bg-white opacity-20 rounded-t-3xl h-1/2"></div>
      <span className="text-4xl md:text-5xl drop-shadow-lg z-10 transform hover:-rotate-12 transition-transform">{icon}</span>
    </div>
  );
}

function PowerUpCard({ icon, name, count, color, border }: { icon: string, name: string, count: number, color: string, border: string }) {
  const disabled = count === 0;
  return (
    <div className={`relative rounded-2xl flex flex-col items-center justify-center p-2 border-2 ${border} ${color} ${disabled ? 'opacity-50 grayscale' : 'shadow-sm hover:-translate-y-1 transition-transform cursor-pointer'}`}>
      <div className="text-3xl drop-shadow-sm mb-1">{icon}</div>
      <div className="text-[9px] md:text-[10px] font-black uppercase text-gray-700 tracking-wider text-center leading-tight h-6 flex items-center">{name}</div>
      <div className="absolute -top-2 -right-2 bg-white border-2 border-gray-300 text-gray-700 text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
        {count}
      </div>
    </div>
  );
}
