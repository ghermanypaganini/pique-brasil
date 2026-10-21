import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona na Vercel e dentro do zip do itch.io.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
  },
});
