import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4332',
    timezoneId: 'Asia/Tokyo',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://127.0.0.1:4332',
    reuseExistingServer: !process.env.CI,
  },
});
