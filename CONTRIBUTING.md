# Contributing to Junction

Thanks for your interest in contributing to Junction! This document covers everything you need to get started.

## Getting started

```bash
# Fork and clone
git clone https://github.com/<your-username>/junction.git
cd junction

# Install dependencies
npm install

# Build all packages (order matters — Turborepo handles it)
npm run build

# Run tests
npm test
```

Junction is a monorepo managed with npm workspaces and Turborepo. All packages live in `packages/` and share a root `tsconfig.json`.

## Project structure

```
packages/
├── core/                  # Isomorphic collector, consent, validation
├── client/                # Browser runtime (sessions, anon IDs, page views)
├── astro/                 # Astro v5 integration
├── gateway/               # WinterCG edge gateway
├── debug/                 # In-page debug panel
├── destination-amplitude/ # Amplitude destination
├── destination-ga4/       # GA4 destination
└── destination-meta/      # Meta Pixel destination
```

## Development workflow

1. **Create a branch** from `main` with a descriptive name:
   - `feat/rules-engine` for new features
   - `fix/consent-timeout` for bug fixes
   - `dest/linkedin` for new destinations
   - `docs/contributing` for documentation

2. **Make your changes.** Keep commits focused — one logical change per commit.

3. **Build and test** before pushing:
   ```bash
   npm run build   # Builds all packages via Turborepo
   npm test         # Runs Vitest suite
   npm run typecheck # TypeScript type checking
   npm run lint     # Biome linting
   ```

4. **Open a pull request** against `main`. Fill out the PR template — it helps reviewers understand your changes quickly.

## Writing a new destination

Destinations are the most common contribution. Here's the recipe:

1. Create `packages/destination-<name>/` with:
   - `package.json` (use an existing destination as a template)
   - `tsconfig.json`
   - `src/index.ts` implementing the `Destination` interface
   - `README.md`

2. Implement the required methods:
   - `init(config)` — validate config, load SDKs
   - `transform(event)` — convert Junction events to the destination's format (return `null` to skip)
   - `send(payload, config)` — deliver the transformed payload

3. Optional methods:
   - `onConsent(state)` — react to consent changes
   - `teardown()` — clean up resources

4. Add tests in `src/index.test.ts`.

5. Add your destination to the root `README.md` package table.

See the [Architecture doc](docs/ARCHITECTURE.md) for the full destination plugin interface.

## Code style

- **TypeScript** everywhere. Strict mode.
- **Biome** for formatting and linting — run `npm run lint` and `npm run format`.
- **No default exports** in library code (except destination entry points for ergonomics).
- **ESM only** — all packages are `"type": "module"`.
- Keep dependencies minimal. Core has one dependency (Zod). Client has zero beyond core.

## Testing

Tests use Vitest and live alongside source files as `*.test.ts`.

```bash
npm test                           # Run all tests
npx vitest run packages/core       # Run tests for a specific package
npx vitest --watch                 # Watch mode
```

When adding features, include tests. When fixing bugs, add a regression test that would have caught the bug.

## Commit messages

Write clear commit messages that explain **why**, not just what:

```
feat(core): add wildcard action matching for contracts

Allows registering a contract for "product:*" that validates any
product action (viewed, added, removed) against a shared schema.
```

Prefix with the scope: `feat`, `fix`, `docs`, `test`, `refactor`, `dest`, `ci`.

## Opening issues

- **Bug reports**: Include the Junction version, your environment (browser/Node/edge runtime), and a minimal reproduction.
- **Feature requests**: Describe the use case first, then the proposed solution.
- **Destination requests**: Tell us which service and whether you'd be willing to implement it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
