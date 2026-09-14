import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const versao = (JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }).version;

// base relativa: funciona tanto no GitHub Pages (subcaminho) quanto no WebView do Capacitor.
export default defineConfig({
  base: './',
  define: { __VERSAO_APP__: JSON.stringify(versao) },
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
