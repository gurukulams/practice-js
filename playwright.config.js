import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3333',
  },
  webServer: {
    command: 'npx browser-sync start --server dist --port 3333 --no-notify --no-open',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
  },
});
