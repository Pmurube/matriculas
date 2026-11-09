import { describe, expect, it } from 'vitest';
import { rtfToLines } from './rtf.ts';

describe('rtfToLines', () => {
  it('decodifica cp1252, \\uN con \\uc0 y separa por "\\" + salto de línea', () => {
    const rtf = "{\\rtf1\\ansi{\\fonttbl\\f0\\fswiss Helvetica;}{\\colortbl;\\red0;}\n\\f0\\fs32 \\cf2 \\kerning0\nababol\\\nabacer\\'eda\\\n\\f1 \\uc0\\u8210 \n\\f0 \\uc0\\u769 ptera\\\nzuz\\'f3n\\\n}";
    expect(rtfToLines(rtf)).toEqual(['ababol', 'abacería', '\u2012\u0301ptera', 'zuzón']);
  });
  it('respeta \\par y llaves escapadas', () => {
    expect(rtfToLines('{\\rtf1 uno\\par dos \\{x\\}\\par}')).toEqual(['uno', 'dos {x}']);
  });
});
