"""Ejecuta los mismos escenarios de e2e/game.spec.ts con Playwright para Python.
SOLO para validar en un entorno sin acceso a npm (sin @playwright/test). Requiere `vite preview` en :4173."""
import asyncio, os, sys
from playwright.async_api import async_playwright, expect

BASE = 'http://localhost:4173'
CHROME = os.environ.get('CHROME', '/opt/pw-browsers/chromium-1228/chrome-linux64/chrome')

async def solution(page):
    letters = (await page.get_by_test_id('plate-letters').text_content()).strip().lower()
    return await page.evaluate("async (l) => { const d = await (await fetch('/data/dictionary.json')).json(); return d.patterns[l][0]; }", letters)

async def fresh(page):
    await page.goto(BASE + '/')
    await expect(page.get_by_test_id('start')).to_be_enabled()

async def t_home(page):
    await fresh(page)
    await expect(page.get_by_test_id('plate-score')).to_have_text('0000')
    await expect(page.get_by_role('radio')).to_have_count(3)
    await expect(page.get_by_text('Modo local · sin ranking')).to_be_visible()

async def t_contrarreloj(page):
    await fresh(page)
    await page.evaluate('window.__marker = 1')
    await page.get_by_test_id('start').click()
    await expect(page.get_by_test_id('timer')).to_be_visible()
    await expect(page.get_by_test_id('combo')).to_contain_text('× 0')
    await expect(page.get_by_test_id('answer')).to_be_focused()
    await page.get_by_test_id('answer').fill('zzzz'); await page.get_by_test_id('validate').click()
    await expect(page.get_by_test_id('feedback')).to_have_attribute('data-kind', 'wrong')
    await page.get_by_test_id('answer').fill(await solution(page)); await page.get_by_test_id('answer').press('Enter')
    await expect(page.get_by_test_id('feedback')).to_have_attribute('data-kind', 'correct')
    await expect(page.get_by_test_id('combo')).to_contain_text('× 1')
    digits = (await page.get_by_test_id('plate-score').text_content()).strip()
    assert len(digits) == 4 and digits.isdigit() and int(digits) > 0, digits
    await expect(page.get_by_test_id('score')).to_have_text(digits)
    await page.get_by_test_id('pass').click()
    await expect(page.get_by_test_id('feedback')).to_have_attribute('data-kind', 'passed')
    await expect(page.get_by_test_id('combo')).to_contain_text('× 0')
    assert await page.evaluate('window.__marker') == 1, 'la página se recargó'

async def t_howto(page):
    await fresh(page)
    await page.get_by_test_id('start').click()
    await page.get_by_test_id('answer').fill(await solution(page)); await page.get_by_test_id('validate').click()
    before = (await page.get_by_test_id('plate-score').text_content(), await page.get_by_test_id('plate-letters').text_content())
    await page.get_by_test_id('open-howto').click()
    dialog = page.get_by_role('dialog', name='Cómo jugar')
    await expect(dialog).to_be_visible()
    await expect(dialog.get_by_text('BARRACA')).to_be_visible()
    await expect(dialog.get_by_text('Repite la R')).to_be_visible()
    await page.keyboard.press('Escape')
    await expect(dialog).to_be_hidden()
    after = (await page.get_by_test_id('plate-score').text_content(), await page.get_by_test_id('plate-letters').text_content())
    assert before == after, (before, after)

async def t_clasico(page):
    await fresh(page)
    await page.get_by_test_id('mode-clasico').click(); await page.get_by_test_id('start').click()
    seen = []
    for i in range(1, 11):
        await expect(page.get_by_test_id('progress')).to_have_text(f'{i}/10')
        seen.append((await page.get_by_test_id('plate-letters').text_content()).strip())
        await page.get_by_test_id('answer').fill(await solution(page)); await page.get_by_test_id('validate').click()
    await expect(page.get_by_test_id('result')).to_be_visible()
    await expect(page.get_by_test_id('result-Resueltas')).to_have_text('10')
    await expect(page.get_by_test_id('result-Pasadas')).to_have_text('0')
    await expect(page.get_by_test_id('result-badges')).to_contain_text('Sin GPS')
    await expect(page.get_by_test_id('result-badges')).to_contain_text('Primera marcha')
    assert len(set(seen)) == 10, seen
    await page.get_by_test_id('replay').click()
    await expect(page.get_by_test_id('progress')).to_have_text('1/10')

async def t_combo(page):
    await fresh(page)
    await page.get_by_test_id('mode-combo_vocales').click(); await page.get_by_test_id('start').click()
    await expect(page.get_by_test_id('challenge')).to_contain_text('Reto +3')
    for _ in range(10): await page.get_by_test_id('pass').click()
    await expect(page.get_by_test_id('result-Pasadas')).to_have_text('10')
    await expect(page.get_by_test_id('result-Resueltas')).to_have_text('0')

async def t_timeout(page):
    await page.clock.install()
    await fresh(page)
    await page.get_by_test_id('start').click()
    await page.get_by_test_id('answer').fill(await solution(page)); await page.get_by_test_id('validate').click()
    await page.clock.fast_forward('02:01')
    await expect(page.get_by_test_id('result')).to_be_visible()
    await expect(page.get_by_test_id('result-Resueltas')).to_have_text('1')

async def t_modals(page):
    await fresh(page)
    await page.get_by_test_id('open-ranking').click()
    await expect(page.get_by_test_id('ranking-offline')).to_be_visible()
    await page.get_by_role('button', name='Cerrar').click()
    await page.get_by_test_id('open-badges').click()
    await expect(page.get_by_test_id('badges-list').locator('li')).to_have_count(11)

TESTS = [t_home, t_contrarreloj, t_howto, t_clasico, t_combo, t_timeout, t_modals]
PROJECTS = {'mobile': dict(viewport={'width': 412, 'height': 839}, is_mobile=True, has_touch=True, device_scale_factor=2.6),
            'desktop': dict(viewport={'width': 1280, 'height': 720})}

async def main():
    failures = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME)
        for proj, opts in PROJECTS.items():
            for t in TESTS:
                ctx = await browser.new_context(**opts)
                page = await ctx.new_page()
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                try:
                    await t(page)
                    assert not errors, errors
                    print(f'  ✓ [{proj}] {t.__name__}')
                except Exception as e:  # noqa: BLE001
                    failures += 1
                    print(f'  ✗ [{proj}] {t.__name__}: {e}')
                await ctx.close()
        await browser.close()
    print(f'\n{len(TESTS) * len(PROJECTS) - failures} passed, {failures} failed')
    sys.exit(1 if failures else 0)

asyncio.run(main())
