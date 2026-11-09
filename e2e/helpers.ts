import type { Page } from '@playwright/test';

/** Busca una solución real para la matrícula visible usando el diccionario público. */
export async function solutionFor(page: Page): Promise<string> {
  const letters = ((await page.getByTestId('plate-letters').textContent()) ?? '').trim().toLowerCase();
  return page.evaluate(async (l) => {
    const d = await (await fetch('/data/dictionary.json')).json();
    return d.patterns[l][0] as string;
  }, letters);
}

export async function plateDigits(page: Page): Promise<string> {
  return ((await page.getByTestId('plate-score').textContent()) ?? '').trim();
}
