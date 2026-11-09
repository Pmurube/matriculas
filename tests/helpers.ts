import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dictionaryFromFile, type DictionaryFile } from '../src/game/dictionary.ts';

/** Diccionario real generado desde el archivo adjunto (public/data/dictionary.json). */
export function realDictionary() {
  const file = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/dictionary.json'), 'utf8')) as DictionaryFile;
  return dictionaryFromFile(file);
}
