const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || 4317;
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: ['api/**/*.spec.js', 'quality/**/*.spec.js'],
      use: {
        baseURL: BASE_URL,
      },
    },
    {
      name: 'ui',
      testMatch: ['ui/**/*.spec.js', 'e2e/**/*.spec.js', 'contract/**/*.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
  ],
  webServer: {
    command: 'node server/index.js',
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: 'test',
    },
  },
});
