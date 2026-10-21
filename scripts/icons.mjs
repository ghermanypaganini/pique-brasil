// Gera os PNGs do PWA a partir de public/icons/favicon.svg. Uso: node scripts/icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync('public/icons/favicon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const sizes = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['icon-maskable-512.png', 512, 0.12], // margem de segurança para ícones recortados (Android)
];
for (const [file, size, pad] of sizes) {
  // iOS pinta cantos transparentes de preto: o ícone da Apple precisa de fundo cheio.
  const solid = pad > 0 || file.startsWith('apple');
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:${solid ? '#0a9c4a' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`,
  );
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: !solid });
  console.log('ok', file);
}
await browser.close();
