import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts']
  },
  server: {
    port: 5173
  }
});
