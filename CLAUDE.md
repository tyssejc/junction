# Junction

Junction is a TypeScript event collection layer for scaling technical teams. Config-as-code, consent-first, isomorphic (browser/Node/edge), destination-agnostic. Think "tag manager for engineers" — more control than GTM, less overhead than a CDP.

## Quick Start

```bash
npm install
npm run build      # Build all packages (Turborepo)
npm test           # Vitest (all packages)
npm run typecheck  # TypeScript strict mode
npm run lint       # Biome check
npm run format     # Biome format --write
```

## Monorepo Structure

```
packages/
├── core/                  # Isomorphic collector, consent state machine, validation
├── client/                # Browser runtime (sessions, anon IDs, page views)
├── gateway/               # WinterCG edge gateway (Cloudflare Workers, Deno, Bun)
├── debug/                 # In-page debug panel
├── auto-collect/          # Automatic event collection
├── astro/                 # Astro v5+ integration
├── next/                  # Next.js integration
├── cmp-onetrust/          # OneTrust CMP adapter
├── destination-amplitude/ # Amplitude destination
├── destination-ga4/       # GA4 destination
├── destination-meta/      # Meta Pixel + CAPI destination
├── destination-http/      # Generic HTTP destination
├── destination-plausible/ # Plausible destination
apps/
└── demo/                  # Demo application
```

## Key Architecture Decisions

- **Entity:action events** — all events use `track("product", "viewed", props)`, not flat strings
- **Consent state machine** — reactive with queuing, AND logic, strict/lenient modes. See `.claude/rules/consent.md`
- **Plain-object destinations** — factory functions, not classes. See `.claude/rules/destinations.md`
- **ESM only** — no CJS builds. tsup with `--format esm --dts --sourcemap --target es2022 --no-config`
- **Zod schemas** — runtime event validation with strict and lenient modes

## Gotchas

- **gtag.js requires Arguments objects** — `window.dataLayer.push()` silently ignores plain Arrays. Always use `function() { dataLayer.push(arguments); }` pattern. See the GA4 destination for reference.
- **Consent queue deduplication** — events are deduped by ID in the consent queue. Always ensure events have unique IDs.
- **System events** — the `_system` entity is reserved. All destinations must return `null` from `transform()` for system events.
- **Dependency layers** — destinations must never import from `client` or `gateway`. Core has no workspace deps. See `.claude/rules/packages.md`.

## Testing

```bash
npm test                           # All tests
npx vitest run packages/core       # Single package
npx vitest --watch                 # Watch mode
npx playwright test --config e2e/playwright.config.ts  # E2E
```

- Tests co-located with source: `packages/*/src/**/*.test.ts`
- Use `make*` factories for data, `mock*` for spied objects
- See `.claude/rules/testing.md` for full conventions

## Writing a New Destination

See `CONTRIBUTING.md` for the full guide. The short version:

1. Create `packages/destination-<name>/`
2. Implement `Destination` interface (init, transform, send)
3. Use 3-tier event name mapping (config override → default map → generated)
4. Filter `_system` events in `transform()`
5. Add tests

## Claude Code Setup

This project uses [superpowers](https://github.com/anthropics/claude-plugins-official/tree/main/superpowers) for development workflow skills (planning, TDD, debugging, code review).

```bash
claude plugins install superpowers@claude-plugins-official
```

Path-scoped rules in `.claude/rules/` load contextually — consent rules when editing core, destination rules when editing destinations, etc.

## Links

- Product context: `docs/product/` (mission, roadmap, tech stack)
- Contributing guide: `CONTRIBUTING.md`
- Release process: `RELEASING.md`
