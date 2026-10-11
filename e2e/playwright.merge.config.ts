// Combines the nightly jobs' blob reports into one HTML report and junit.xml:
// npx playwright merge-reports --config e2e/playwright.merge.config.ts <blob-dir>
// It sits next to playwright.config.ts so test paths resolve the same way.
const mergeConfig = {
  testDir: '.',
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
};

export default mergeConfig;
