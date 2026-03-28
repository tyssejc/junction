# Tech Stack

## Language

- **TypeScript** — all packages, strict mode
- Targets Node.js >= 18, browser, and WinterCG edge runtimes

## Monorepo

- **npm workspaces** (migrating to **bun** as primary package manager going forward)
- **Turborepo** — build orchestration across packages
- **Changesets** — versioning and npm publishing

## Runtime

- **Isomorphic core** — runs in browser, Node.js, Deno, Cloudflare Workers, Bun
- **WinterCG-compatible** edge gateway
- **Zod** — schema validation for event contracts

## Framework Integrations

- **Astro v5+** — first-class integration (script injection, SSR middleware, View Transitions)
- **Next.js** — dedicated package

## Testing

- **Vitest** — unit and integration tests (v8 coverage provider, happy-dom for browser env)
- **Playwright** — end-to-end tests

## Linting & Formatting

- **Biome** — linting and formatting (replaces ESLint + Prettier)
- **lint-staged** + **Husky** — pre-commit hooks

## CI/CD

- **GitHub Actions** — CI on push/PR to main, matrix testing across Node 18/20/22
- **Changesets** — automated release workflow
- **Cloudflare Workers / Wrangler** — gateway deployment target

## Hosting

- **Cloudflare Workers** — primary edge runtime target for gateway
- **Cloudflare Pages** — site/demo deployment
- Designed to run on any WinterCG-compatible platform (Vercel Edge, Deno Deploy, Bun)
