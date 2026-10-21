// Build para um destino específico e empacotamento em .zip. Uso: node scripts/build-target.mjs itch|poki|crazygames
import { execSync } from 'node:child_process';

const target = process.argv[2];
if (!['itch', 'poki', 'crazygames'].includes(target)) {
  console.error('destino inválido: use itch, poki ou crazygames');
  process.exit(1);
}
execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, VITE_TARGET: target } });
execSync(`node scripts/package.mjs dist-${target} pique-brasil-${target}.zip`, { stdio: 'inherit' });
