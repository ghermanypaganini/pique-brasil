// Teste de fumaça no navegador: abre o jogo, joga, entra no ranking e salva capturas de tela.
// Uso: npm run dev (em outro terminal) e depois: node scripts/smoke.mjs [url] [pasta-de-saída]
import { chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.argv[3] ?? 'smoke-output';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ ...devices['iPhone 13'], locale: 'pt-BR' });
const errors = [];
const check = (ok, msg) => (ok ? console.log(`ok: ${msg}`) : errors.push(`FALHOU: ${msg}`));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

// 1. Tela de carregamento com patrocínio: no mínimo 4 s
await page.goto(url);
// Confere o card antes da captura: com a cena 3D pesada no navegador sem GPU, a captura
// pode demorar mais que os 4 s da tela de carregamento.
const adShown = await page.locator('.sp-ad').waitFor({ timeout: 3500 }).then(() => true, () => false);
check(adShown, 'card "ANUNCIE AQUI" na tela de carregamento');
await page.screenshot({ path: `${out}/0-carregando.png` });
await page.waitForSelector('#loading', { state: 'detached', timeout: 15000 });
const loadedAt = await page.evaluate(() => performance.now());
check(loadedAt >= 4000, `carregamento ficou pelo menos 4 s (${Math.round(loadedAt)} ms)`);

// 2. Aviso de sátira e menu
await page.screenshot({ path: `${out}/1-aviso.png` });
await page.getByText('Entendi').click();
await page.screenshot({ path: `${out}/2-menu.png` });
await page.locator('[data-char="bolsonero"]').click();
await page.getByText('Correr!').click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/3-correndo.png` });

// 3. Controles não podem estar espelhados: ← leva o personagem para a esquerda DA TELA.
await page.evaluate(() => (window.__pb.game.player.invuln = 5));
const x0 = await page.evaluate(() => window.__pb.playerScreenX());
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
const x1 = await page.evaluate(() => window.__pb.playerScreenX());
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const x2 = await page.evaluate(() => window.__pb.playerScreenX());
check(x1 < x0 && x2 > x0, `controles na direção certa (esq ${x1.toFixed(2)} · centro ${x0.toFixed(2)} · dir ${x2.toFixed(2)})`);
await page.keyboard.press('ArrowLeft');

// 4. Joga um pouco
const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
for (let i = 0; i < 12; i++) {
  await page.keyboard.press(keys[i % keys.length]);
  await page.waitForTimeout(350);
}
await page.screenshot({ path: `${out}/4-depois.png` });
const state = await page.evaluate(() => {
  const g = window.__pb.game;
  return { screen: window.__pb.screen, distance: Math.round(g.distance), chase: Math.round(g.chase), coins: g.coins };
});
console.log('estado:', JSON.stringify(state));

// 5. Captura -> continuar -> desistir -> pede apelido -> envia ao ranking
await page.evaluate(() => (window.__pb.game.chase = -10));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/5-continuar.png` });
await page.getByText('Desistir').click();
await page.waitForTimeout(300);
check((await page.evaluate(() => window.__pb.screen)) === 'nickname', 'pede apelido no primeiro fim de jogo');
await page.locator('.nick-input').fill('Lula 13');
await page.getByText('Salvar').click();
check((await page.locator('.error').textContent())?.includes('políticos'), 'recusa apelido de campanha');
await page.locator('.nick-input').fill('Zéca Teste');
await page.screenshot({ path: `${out}/6-apelido.png` });
await page.getByText('Salvar').click();
await page.waitForFunction(() => /lugar/.test(document.querySelector('.rank-status')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
const status = await page.locator('.rank-status').textContent();
check(/1º lugar na semana/.test(status ?? ''), `enviado ao ranking ("${status}")`);
await page.screenshot({ path: `${out}/7-fim.png` });

// 6. Tela de ranking
await page.locator('[data-screen="over"] [data-act="ranking"]').click();
await page.waitForSelector('.board li', { timeout: 8000 }).catch(() => {});
const first = await page.locator('.board li .name').first().textContent().catch(() => null);
check(first === 'Zéca Teste', `ranking semanal mostra o jogador (${first})`);
await page.screenshot({ path: `${out}/8-ranking.png` });
await page.locator('[data-board="bolsonero"]').click();
await page.waitForTimeout(500);
check((await page.locator('.board li').count()) >= 1, 'aba por personagem (Bolsonero)');
await page.locator('[data-screen="ranking"] [data-act="back"]').click();

// 7. Configurações: botões na tela
await page.locator('[data-screen="over"] [data-act="menu"]').click();
await page.locator('[data-screen="menu"] [data-act="settings"]').click();
await page.screenshot({ path: `${out}/9-config.png` });
await page.locator('[data-flag="touchButtons"]').check();
await page.locator('[data-screen="settings"] [data-act="back"]').click();
await page.getByText('Correr!').click();
await page.waitForTimeout(500);
check(await page.locator('.touch-pad').isVisible(), 'botões na tela aparecem quando ligados');
await page.screenshot({ path: `${out}/10-botoes.png` });

console.log(errors.length ? `ERROS:\n${errors.join('\n')}` : 'sem erros');
await browser.close();
process.exit(errors.length ? 1 : 0);
