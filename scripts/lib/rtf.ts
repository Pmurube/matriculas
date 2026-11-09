/**
 * Parser RTF mínimo para el archivo real `Palabras.rtf` (Cocoa RTF, ANSI cp1252):
 * - una palabra por párrafo, separadas por "\" + salto de línea (\line implícito) o \par
 * - acentos como \'xx (cp1252)
 * - algunos caracteres como \uN con \uc0 (p. ej. U+2012 y U+0301 en "‒́ptera")
 * Devuelve las líneas de texto en orden, sin descartar ninguna (también las vacías).
 */

const CP1252_EXTRA: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰',
  0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•',
  0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

function cp1252(byte: number): string {
  return CP1252_EXTRA[byte] ?? String.fromCharCode(byte);
}

/** Destinos que no contienen texto visible. */
const SKIP_DESTINATIONS = new Set(['fonttbl', 'colortbl', 'expandedcolortbl', 'stylesheet', 'info', 'pict', '*']);

export function rtfToLines(rtf: string): string[] {
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  let uc = 1; // caracteres de respaldo a saltar tras \uN
  const stack: { skip: boolean; uc: number }[] = [];
  let skip = false;
  let pendingSkip = 0;

  const emit = (s: string) => {
    if (skip) return;
    if (pendingSkip > 0) {
      pendingSkip -= 1;
      return;
    }
    cur += s;
  };
  const newline = () => {
    if (skip) return;
    lines.push(cur);
    cur = '';
  };

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === '{') {
      stack.push({ skip, uc });
      i += 1;
      // ¿destino a saltar? {\fonttbl ...} o {\*\...}
      const m = /^\\(\*|[a-zA-Z]+)/.exec(rtf.slice(i, i + 40));
      if (m && SKIP_DESTINATIONS.has(m[1])) skip = true;
      continue;
    }
    if (ch === '}') {
      const top = stack.pop();
      if (top) {
        skip = top.skip;
        uc = top.uc;
      }
      i += 1;
      continue;
    }
    if (ch === '\\') {
      const next = rtf[i + 1];
      if (next === '\n' || next === '\r') {
        newline();
        i += 2;
        if (next === '\r' && rtf[i] === '\n') i += 1;
        continue;
      }
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        emit(cp1252(parseInt(hex, 16)));
        i += 4;
        continue;
      }
      if (next === '\\' || next === '{' || next === '}') {
        emit(next);
        i += 2;
        continue;
      }
      if (next === '~') {
        emit('\u00a0');
        i += 2;
        continue;
      }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 64));
      if (m) {
        const [whole, word, num] = m;
        i += whole.length;
        if (word === 'par' || word === 'line') newline();
        else if (word === 'tab') emit('\t');
        else if (word === 'uc') uc = Number(num ?? 1);
        else if (word === 'u') {
          let code = Number(num);
          if (code < 0) code += 65536;
          emit(String.fromCharCode(code));
          pendingSkip = uc;
        }
        continue;
      }
      i += 2; // símbolo de control desconocido
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      i += 1; // los saltos de línea literales no son texto en RTF
      continue;
    }
    emit(ch);
    i += 1;
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}
