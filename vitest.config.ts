import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@junctionjs/core": path.resolve(__dirname, "packages/core/src"),
      "@junctionjs/client": path.resolve(__dirname, "packages/client/src"),
      "@junctionjs/gateway": path.resolve(__dirname, "packages/gateway/src"),
      "@junctionjs/astro": path.resolve(__dirname, "packages/astro/src"),
      "@junctionjs/destination-amplitude": path.resolve(__dirname, "packages/destination-amplitude/src"),
      "@junctionjs/destination-ga4": path.resolve(__dirname, "packages/destination-ga4/src"),
      "@junctionjs/destination-meta": path.resolve(__dirname, "packages/destination-meta/src"),
      "@junctionjs/cmp-onetrust": path.resolve(__dirname, "packages/cmp-onetrust/src"),
      "@junctionjs/auto-collect": path.resolve(__dirname, "packages/auto-collect/src"),
    },
  },
});
