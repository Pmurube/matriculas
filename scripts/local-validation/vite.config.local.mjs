// Config de Vite usada SOLO para validar el build en un entorno sin red.
// Diferencias con vite.config.ts: Tailwind vía shim y @supabase/supabase-js sustituido por un stub
// (el SDK real se carga de forma diferida y solo cuando hay variables VITE_SUPABASE_*).
import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localTailwind } from './tailwind-shim.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  root,
  plugins: [localTailwind(root)],
  resolve: { alias: { '@supabase/supabase-js': resolve(root, 'scripts/local-validation/supabase-stub.ts') } },
  build: { target: 'es2022', outDir: resolve(root, 'dist') },
  preview: { port: 4173 },
});
