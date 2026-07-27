import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    // The date helpers are timezone-sensitive by nature — that was the root of
    // the calendar-date corruption. Pin a non-UTC, positive-offset zone so a
    // regression fails here instead of only on a contributor's machine.
    // Individual tests override this via `vi.stubEnv` where they need to prove
    // behaviour across zones.
    env: { TZ: 'Asia/Kolkata' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/**/*.types.ts',
        'src/app/**/layout.tsx',
        'src/app/**/error.tsx',
        'src/app/**/global-error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/loading.tsx',
        'src/test/**',
        'next-env.d.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        // Core Decision Registry overrides (≥95% line & branch coverage)
        'src/lib/transaction.helpers.ts': { lines: 95, branches: 95 },
        'src/lib/utils.ts': { lines: 95, branches: 95 },
        'src/lib/reports.helpers.ts': { lines: 95, branches: 95 },
        'src/lib/forms.ts': { lines: 95, branches: 95 },
        'src/lib/apiResult.ts': { lines: 95, branches: 95 },
        'src/components/transactions/catalog.ts': { lines: 95, branches: 95 },
        'src/components/transactions/ReviewReasonBadges.tsx': { lines: 95, branches: 95 },
        // TransactionCard and the presentational pieces split out of it. They
        // are listed individually so moving markup between them cannot quietly
        // drop the card's coverage guarantee.
        'src/components/transactions/TransactionCard.tsx': { lines: 95, branches: 95 },
        'src/components/transactions/TransactionAmount.tsx': { lines: 95, branches: 95 },
        'src/components/transactions/TransactionCategoryBadges.tsx': { lines: 95, branches: 95 },
        'src/components/transactions/TransactionLinkBadges.tsx': { lines: 95, branches: 95 },
        'src/components/transactions/TransactionSelectCheckbox.tsx': { lines: 95, branches: 95 },
        'src/components/transactions/TransactionSourceBadge.tsx': { lines: 95, branches: 95 },
        'src/app/(protected)/transactions/page.tsx': { lines: 95, branches: 95 },
        'src/components/reports/builderReducer.ts': { lines: 95, branches: 95 },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
