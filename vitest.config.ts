import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    // Enable global test APIs like describe, it, expect
    globals: true,
    // Environment to run tests in
    environment: 'node',
    // Include files matching these patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Exclude files matching these patterns
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    // Configure timeouts
    testTimeout: 30000, // 30 seconds
    // Configure retry attempts
    retry: 0,
    // Configure reporters
    reporters: ['default'],
    // Configure coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/test/**', '**/*.d.ts'],
    },
  },
});
