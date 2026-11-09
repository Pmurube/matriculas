import { dictionaryFromFile, type Dictionary, type DictionaryFile } from '../game/dictionary.ts';

let cache: Promise<Dictionary> | null = null;

/** Diccionario procesado (generado por `npm run words:clean`). Se usa para feedback inmediato. */
export function loadDictionary(): Promise<Dictionary> {
  cache ??= fetch('/data/dictionary.json')
    .then((r) => {
      if (!r.ok) throw new Error(`dictionary.json: ${r.status}`);
      return r.json() as Promise<DictionaryFile>;
    })
    .then(dictionaryFromFile)
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}
