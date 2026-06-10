import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/helpers/setupTests.ts'],
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/test/e2e/**'],
  },
});
