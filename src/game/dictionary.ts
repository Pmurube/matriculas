import { consonantPattern, normalizeWord, plainKey } from './normalize.ts';

/** Formato de public/data/dictionary.json (generado por scripts/import-words.ts). */
export interface DictionaryFile {
  version: 1;
  source: string;
  generatedAt: string;
  /** patrón -> palabras activas (NFC, minúsculas) */
  patterns: Record<string, string[]>;
}

export interface Dictionary {
  /** Busca por forma exacta o por clave sin tildes. Devuelve la forma canónica. */
  lookup(input: string): string | null;
  solutions(pattern: string): string[];
  patterns(): string[];
  size: number;
}

export function buildDictionary(words: Iterable<string>): Dictionary {
  const exact = new Map<string, string>();
  const plain = new Map<string, string>();
  const byPattern = new Map<string, string[]>();
  for (const raw of words) {
    const w = normalizeWord(raw);
    if (exact.has(w)) continue;
    exact.set(w, w);
    const k = plainKey(w);
    if (!plain.has(k)) plain.set(k, w);
    const p = consonantPattern(w);
    const list = byPattern.get(p);
    if (list) list.push(w);
    else byPattern.set(p, [w]);
  }
  return {
    lookup(input: string) {
      const w = normalizeWord(input);
      return exact.get(w) ?? plain.get(plainKey(w)) ?? null;
    },
    solutions: (pattern) => byPattern.get(pattern) ?? [],
    patterns: () => Array.from(byPattern.keys()).filter((p) => p.length === 3),
    size: exact.size,
  };
}

export function dictionaryFromFile(file: DictionaryFile): Dictionary {
  return buildDictionary(Object.values(file.patterns).flat());
}
