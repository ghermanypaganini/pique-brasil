// Teste de fumaça no navegador: abre o jogo, joga alguns segundos e salva capturas de tela.
// Uso: npm run dev (em outro terminal) e depois: node scripts/smoke.mjs [url] [pasta-de-saída]
import { chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.argv[3] ?? 'smoke-output';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ ...devices['iPhone 13'], locale: 'pt-BR' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/1-aviso.png` });
await page.getByText('Entendi').click();
await page.screenshot({ path: `${out}/2-menu.png` });
await page.getByText('Bolsonero', { exact: true }).click();
await page.getByText('Correr!').click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/3-correndo.png` });

// Controles não podem estar espelhados: ← leva o personagem para a esquerda DA TELA.
await page.evaluate(() => (window.__pb.game.player.invuln = 5));
const x0 = await page.evaluate(() => window.__pb.playerScreenX());
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
const x1 = await page.evaluate(() => window.__pb.playerScreenX());
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const x2 = await page.evaluate(() => window.__pb.playerScreenX());
if (!(x1 < x0 && x2 > x0)) errors.push(`controles espelhados: centro=${x0.toFixed(2)} esquerda=${x1.toFixed(2)} direita=${x2.toFixed(2)}`);
else console.log(`controles ok: esquerda=${x1.toFixed(2)} centro=${x0.toFixed(2)} direita=${x2.toFixed(2)}`);
await page.keyboard.press('ArrowLeft');

// Joga com o teclado por alguns segundos
const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
for (let i = 0; i < 14; i++) {
  await page.keyboard.press(keys[i % keys.length]);
  await page.waitForTimeout(350);
}
await page.screenshot({ path: `${out}/4-depois.png` });
const state = await page.evaluate(() => {
  const g = window.__pb.game;
  return { screen: window.__pb.screen, phase: g.phase, distance: Math.round(g.distance), chase: Math.round(g.chase), coins: g.coins };
});
console.log('estado:', JSON.stringify(state));

// Força a captura para ver a tela de continuar
await page.evaluate(() => (window.__pb.game.chase = 0.01));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/5-continuar.png` });
await page.getByText('Desistir').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/6-fim.png` });

console.log(errors.length ? `ERROS:\n${errors.join('\n')}` : 'sem erros no console');
await browser.close();
