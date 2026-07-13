# Tres en Raya — Mundo Kawaii / Batalla Neón

Un juego de tres en raya expandido con modos de campaña, torneo y partida rápida.

## Stack

- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS v4
- **Animaciones**: Framer Motion
- **UI**: Radix UI components (shadcn/ui style)
- **Sonidos**: Web Audio API (sin dependencias externas)
- **Package manager**: pnpm

## Estructura

```
tres-en-raya/
  src/
    App.tsx       — UI principal (menú, campaña, torneo, partida, confeti)
    types.ts      — Tipos compartidos, constantes de power-ups y jugadores
    logic.ts      — Reducer, IA (minimax), generación de tableros
    sounds.ts     — Efectos de sonido con Web Audio API
    campaign.ts   — Niveles de campaña (10 niveles, mini-jefe y jefe final)
    index.css     — Temas Kawaii y Arena
```

## Cómo correr

El workflow **"Tres en Raya"** instala dependencias y arranca Vite automáticamente:

```bash
cd tres-en-raya && pnpm install && pnpm dev
```

La app corre en el puerto `5000`.

## Modos de juego

- **Partida Rápida**: 2–4 jugadores (humano/bot), tableros 4×4 a 15×15, dificultad configurable, personalización de nombre y color
- **Campaña**: 10 niveles con historia, tableros especiales (bonus ⭐, portales 🌀, bloqueados 🪨), mini-jefe en nivel 5, jefe final en nivel 10 (3 vidas)
- **Torneo**: Mejor de 3 o 5 rondas con marcador persistente y ceremonia de campeón

## Power-ups

💣 Bomba · 🛡️ Escudo · 🎯 Robo · ⚡ Turno Extra · 🔄 Intercambio · ✌️ Doble · 🌍 Terremoto

## User preferences

- Mantener el juego como single-page app sin backend (el api-server existe pero el juego no lo usa)
