import { expect, test } from '@playwright/test';
import { plateDigits, solutionFor } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start')).toBeEnabled();
});

test('inicio: matrícula 0000, modos y modo local', async ({ page }) => {
  await expect(page.getByTestId('plate-score')).toHaveText('0000');
  await expect(page.getByRole('radio')).toHaveCount(3);
  await expect(page.getByText('Modo local · sin ranking')).toBeVisible();
});

test('contrarreloj: fallo, acierto, combo y pase sin recargar la página', async ({ page }) => {
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));
  await page.getByTestId('start').click();
  await expect(page.getByTestId('timer')).toBeVisible();
  await expect(page.getByTestId('combo')).toContainText('× 0');
  await expect(page.getByTestId('answer')).toBeFocused();

  await page.getByTestId('answer').fill('zzzz');
  await page.getByTestId('validate').click();
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'wrong');

  await page.getByTestId('answer').fill(await solutionFor(page));
  await page.getByTestId('answer').press('Enter');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'correct');
  await expect(page.getByTestId('combo')).toContainText('× 1');
  const digits = await plateDigits(page);
  expect(digits).toMatch(/^\d{4}$/);
  expect(Number(digits)).toBeGreaterThan(0);
  await expect(page.getByTestId('score')).toHaveText(digits);

  await page.getByTestId('pass').click();
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'passed');
  await expect(page.getByTestId('combo')).toContainText('× 0');
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
});

test('cómo jugar no reinicia la partida', async ({ page }) => {
  await page.getByTestId('start').click();
  await page.getByTestId('answer').fill(await solutionFor(page));
  await page.getByTestId('validate').click();
  const before = { digits: await plateDigits(page), letters: await page.getByTestId('plate-letters').textContent() };
  await page.getByTestId('open-howto').click();
  const dialog = page.getByRole('dialog', { name: 'Cómo jugar' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('BARRACA')).toBeVisible();
  await expect(dialog.getByText('Repite la R')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await plateDigits(page)).toBe(before.digits);
  expect(await page.getByTestId('plate-letters').textContent()).toBe(before.letters);
});

test('clásico completo sin pasar: resultado, Sin GPS y volver a jugar', async ({ page }) => {
  await page.getByTestId('mode-clasico').click();
  await page.getByTestId('start').click();
  const seen: string[] = [];
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByTestId('progress')).toHaveText(`${i}/10`);
    seen.push(((await page.getByTestId('plate-letters').textContent()) ?? '').trim());
    await page.getByTestId('answer').fill(await solutionFor(page));
    await page.getByTestId('validate').click();
  }
  await expect(page.getByTestId('result')).toBeVisible();
  await expect(page.getByTestId('result-Resueltas')).toHaveText('10');
  await expect(page.getByTestId('result-Pasadas')).toHaveText('0');
  await expect(page.getByTestId('result-badges')).toContainText('Sin GPS');
  await expect(page.getByTestId('result-badges')).toContainText('Primera marcha');
  expect(new Set(seen).size).toBe(10);
  await page.getByTestId('replay').click();
  await expect(page.getByTestId('progress')).toHaveText('1/10');
});

test('combo de vocales: reto visible y partida de 10 pases', async ({ page }) => {
  await page.getByTestId('mode-combo_vocales').click();
  await page.getByTestId('start').click();
  await expect(page.getByTestId('challenge')).toContainText('Reto +3');
  for (let i = 0; i < 10; i++) await page.getByTestId('pass').click();
  await expect(page.getByTestId('result-Pasadas')).toHaveText('10');
  await expect(page.getByTestId('result-Resueltas')).toHaveText('0');
});

test('contrarreloj termina a los 120 s y muestra el resumen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('start').click();
  await page.getByTestId('answer').fill(await solutionFor(page));
  await page.getByTestId('validate').click();
  await page.clock.fastForward('02:01');
  await expect(page.getByTestId('result')).toBeVisible();
  await expect(page.getByTestId('result-Resueltas')).toHaveText('1');
});

test('ranking (modo local) e insignias en modales', async ({ page }) => {
  await page.getByTestId('open-ranking').click();
  await expect(page.getByTestId('ranking-offline')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.getByTestId('open-badges').click();
  await expect(page.getByTestId('badges-list').locator('li')).toHaveCount(11);
});
