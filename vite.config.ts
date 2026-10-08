/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Der Äquivalenztest zur Referenz rechnet über 500 Konfigurationen doppelt und braucht je nach Rechnerlast 3–5 s.
    testTimeout: 20000,
  },
});
