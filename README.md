# 🐻 Tres en Raya – Mundo Kawaii

Juego de tres en raya con campaña de 10 niveles, poderes especiales, torneos y modo multijugador local. PWA instalable en Android e iOS.

## ✨ Características

- 🗺️ **Campaña** con 10 niveles y enemigos únicos
- ⚡ **Poderes especiales** (bomba, escudo, rayo...)
- 🏆 **Torneo** eliminatorio para varios jugadores
- 📱 **PWA** instalable en celular como app nativa
- 🔊 Efectos de sonido generados en tiempo real
- 🎨 Temas visuales por mundo

## 🚀 Cómo correrlo en tu PC

### Requisitos

- [Node.js](https://nodejs.org/) **v18 o superior**
- [pnpm](https://pnpm.io/) (gestor de paquetes)

Para instalar pnpm si no lo tienes:
```bash
npm install -g pnpm
```

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/jhojhard/Wo-Mi-Kuy-Yip.git

# 2. Entrar a la carpeta del juego
cd Wo-Mi-Kuy-Yip/tres-en-raya

# 3. Instalar dependencias
pnpm install

# 4. Iniciar el servidor de desarrollo
pnpm dev
```

Luego abre tu navegador en **http://localhost:3000**

### Otros comandos

```bash
# Compilar para producción
pnpm build

# Ver la versión compilada
pnpm preview
```

## 📱 Instalar como app en Android

1. Abre la URL del juego en **Chrome**
2. Toca el menú (⋮) → **"Agregar a pantalla de inicio"**
3. ¡Listo! El 🐻 aparece como ícono en tu pantalla

En **iPhone** (Safari): toca el botón compartir → "Agregar a pantalla de inicio"

## 🛠️ Tecnologías

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vitejs.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- Service Worker para soporte offline (PWA)
