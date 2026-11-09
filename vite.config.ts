import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// SPA de una sola pantalla. Vite 8 transforma TSX con el runtime automático de React (tsconfig "jsx": "react-jsx").
export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { target: 'es2022', sourcemap: false },
});
