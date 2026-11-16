import { defineConfig, devices } from '@playwright/test';

// Adapt PORT, the start command, and testDir to the repo.
const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A stray test.only fails CI instead of silently skipping the rest of the suite.
  forbidOnly: isCI,
  // In CI a retry surfaces flakes as "flaky" in the report. It is never a fix.
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  // blob reports from CI shards can be merged into one report.
  reporter: isCI ? [['blob'], ['github']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // Locally there are no retries, so keep traces of failures; in CI, record on the retry.
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Remove the setup project and its dependency if the app has no login.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
