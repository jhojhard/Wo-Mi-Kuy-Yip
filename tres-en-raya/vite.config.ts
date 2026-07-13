import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Detect if running inside Replit
const isReplit = process.env.REPL_ID !== undefined;

// Port: use PORT env var (Replit sets it), otherwise default to 3000
const port = Number(process.env.PORT ?? '3000');

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Replit-only plugins — skipped on local machines
    ...(isReplit
      ? [
          await import('@replit/vite-plugin-runtime-error-modal').then((m) =>
            m.default()
          ),
          ...(process.env.NODE_ENV !== 'production'
            ? [
                await import('@replit/vite-plugin-cartographer').then((m) =>
                  m.cartographer({
                    root: path.resolve(import.meta.dirname, '..'),
                  })
                ),
                await import('@replit/vite-plugin-dev-banner').then((m) =>
                  m.devBanner()
                ),
              ]
            : []),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    // strictPort off so Vite tries next port if 3000 is busy
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
