// SOLO para validar en un entorno sin acceso a npm (sin @tailwindcss/vite).
// Compila Tailwind 4 con la API `compile` del paquete `tailwindcss`. En el proyecto real se usa @tailwindcss/vite.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { compile } from 'tailwindcss';

const require = createRequire(import.meta.url);
const twDir = dirname(require.resolve('tailwindcss/package.json'));

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|html)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

export function localTailwind(root) {
  return {
    name: 'local-tailwind-shim',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.css') || !code.includes('@import "tailwindcss"')) return null;
      const compiler = await compile(code, {
        base: dirname(id),
        async loadStylesheet(spec, base) {
          let path;
          if (spec === 'tailwindcss') path = join(twDir, 'index.css');
          else if (spec.startsWith('tailwindcss/')) path = join(twDir, spec.slice('tailwindcss/'.length));
          else path = resolve(base, spec);
          return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
        },
        async loadModule() {
          throw new Error('plugins no soportados en el shim');
        },
      });
      const files = [...walk(resolve(root, 'src')), resolve(root, 'index.html')];
      const candidates = new Set();
      for (const f of files) for (const t of readFileSync(f, 'utf8').split(/[\s"'`{}<>=;,()]+/)) if (t) candidates.add(t);
      return { code: compiler.build([...candidates]), map: null };
    },
  };
}
