import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    hookTimeout: 20000,
    testTimeout: 20000,
    // Integration/contract tests share one real Postgres database (including
    // connect-pg-simple's auto-created "session" table) — run files sequentially
    // to avoid cross-file races (duplicate CREATE TABLE, one file's cleanup
    // wiping another file's in-progress fixtures).
    fileParallelism: false
  }
});
