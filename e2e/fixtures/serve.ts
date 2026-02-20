/**
 * Minimal static file server for E2E tests.
 *
 * 1. Builds core as an IIFE bundle via tsup
 * 2. Serves static files from e2e/fixtures/ on port 3456
 */

import { execSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const PORT = 3456;
const FIXTURES_DIR = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname));
const ROOT_DIR = path.resolve(FIXTURES_DIR, "../..");

// ─── Build IIFE bundle ──────────────────────────────────────────

console.log("[e2e] Building IIFE bundle...");

execSync(
  "npx tsup e2e/fixtures/entry.ts --format iife --global-name Junction --outDir e2e/fixtures/dist --no-config --no-dts --no-splitting",
  { cwd: ROOT_DIR, stdio: "inherit" },
);

console.log("[e2e] Bundle built.");

// ─── Static file server ─────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  let filePath: string;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    filePath = path.join(FIXTURES_DIR, "index.html");
  } else {
    filePath = path.join(FIXTURES_DIR, url.pathname);
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`[e2e] Fixture server listening on http://localhost:${PORT}`);
});
