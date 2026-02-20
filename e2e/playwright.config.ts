import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3456",
    headless: true,
  },
  webServer: {
    command: "npx tsx e2e/fixtures/serve.ts",
    port: 3456,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    cwd: "..",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
