import { defineConfig } from 'vitest/config';

// DB integrity tests; run only via `npm run test:db` (scripts/test-db.sh),
// which provides TEST_DATABASE_URL for a disposable cluster.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test-db/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
