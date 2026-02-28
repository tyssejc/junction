import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../../"),
  transpilePackages: [
    "@junctionjs/core",
    "@junctionjs/client",
    "@junctionjs/next",
    "@junctionjs/debug",
    "@junctionjs/destination-ga4",
    "@junctionjs/destination-amplitude",
    "@junctionjs/destination-meta",
  ],
  webpack: (config) => {
    // Core packages use .js extensions in ESM imports but the source files are .ts
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
