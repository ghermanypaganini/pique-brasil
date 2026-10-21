// Capturas de tela dos obstáculos temáticos, power-ups e eventos (forçados).
// Uso: npm run dev (em outro terminal) e depois: node scripts/shots.mjs <pasta-de-saída>
import { chromium, devices } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ ...devices['iPhone 13'], locale: 'pt-BR' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://127.0.0.1:5173/');
await page.getByText('Entendi').click();
await page.screenshot({ path: `${out}/a-menu.png` });
await page.getByText('Correr!').click();
// Coloca obstáculos temáticos à frente
await page.evaluate(async () => {
  const g = window.__pb.game;
  const { makeObstacle } = await import('/src/world/generator.ts');
  g.obstacles = g.obstacles.filter((o) => o.z > 80);
  const ids = { next: 90000 };
  g.obstacles.push(
    makeObstacle(ids, 'low', 0, 22, 'police'),
    makeObstacle(ids, 'high', 1, 26, 'olinda'),
    makeObstacle(ids, 'boi', 2, 34),
    makeObstacle(ids, 'drunk', 1, 48),
    makeObstacle(ids, 'ramp', 0, 52),
  );
  const roof = makeObstacle(ids, 'bus', 0, 59, 'roof'); roof.length = 14; g.obstacles.push(roof);
  g.player.invuln = 99;
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/b-obstaculos.png` });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/c-obstaculos2.png` });
await page.evaluate(() => { const g = window.__pb.game; g.player.powers.saci = 10; g.player.powers.habeas = true; });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/d-saci-habeas.png` });
await page.evaluate(() => { const g = window.__pb.game; g.player.powers.saci = 0; g.player.powers.immunity = 5; g.vorcanoActive = 0; g.nextVorcanoAt = 0; });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/e-imunidade-vorcano.png` });
await page.evaluate(() => { const g = window.__pb.game; g.player.powers.immunity = 0; g.lungeWarning = 2; g.chase = 15; });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/f-cuca-multidao.png` });
console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros');
await browser.close();
