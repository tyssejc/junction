# Starlight Docs Site — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Scaffold a Starlight (Astro) docs site, migrate existing content, create stubs for upcoming docs

## Objective

Set up a user-facing documentation site at `apps/docs/` using Starlight so that docs can be incrementally improved alongside roadmap work. Migrate existing user-relevant content from `docs/` and create stubs for destination/integration pages.

## Location & Setup

- **Path:** `apps/docs/` — follows existing monorepo convention (`apps/*` workspace)
- **Framework:** Astro 5 + Starlight
- **Build pipeline:** Added to Turborepo tasks (`dev`, `build`)
- **Deploy target:** Cloudflare Pages (future — not set up in this spec)
- **Dev server:** `npm run dev --workspace=apps/docs` or via Turbo

## Site Structure

```
apps/docs/
├── astro.config.mjs       # Starlight config, sidebar, site metadata
├── package.json
├── tsconfig.json
└── src/
    ├── content/
    │   └── docs/
    │       ├── index.mdx              # Landing — "What is Junction?"
    │       ├── getting-started/
    │       │   └── quickstart.mdx     # Install, configure, first event
    │       ├── concepts/
    │       │   ├── events.mdx         # Entity:action model
    │       │   ├── consent.mdx        # Consent state machine
    │       │   ├── validation.mdx     # Zod schemas, strict/lenient
    │       │   └── architecture.mdx   # Migrated from ARCHITECTURE.md
    │       ├── destinations/
    │       │   ├── overview.mdx       # How destinations work
    │       │   ├── ga4.mdx            # Stub — basic config
    │       │   ├── amplitude.mdx      # Stub — basic config
    │       │   ├── meta.mdx           # Stub — basic config
    │       │   ├── plausible.mdx      # Stub — basic config
    │       │   └── http.mdx           # Stub — basic config
    │       ├── integrations/
    │       │   ├── nextjs.mdx         # Stub
    │       │   └── astro.mdx          # Stub
    │       └── product/
    │           ├── mission.mdx        # Migrated from docs/product/mission.md
    │           └── roadmap.mdx        # Migrated from docs/product/roadmap.md
    └── assets/                        # Logo, images if needed
```

## Content Plan

### Migrate from existing docs

| Source | Target | Treatment |
|--------|--------|-----------|
| `docs/ARCHITECTURE.md` | `concepts/architecture.mdx` | Migrate, light restructuring for Starlight format |
| `docs/product/mission.md` | `product/mission.mdx` | Migrate as-is with frontmatter |
| `docs/product/roadmap.md` | `product/roadmap.mdx` | Migrate as-is with frontmatter |

### Write fresh

| Page | Content |
|------|---------|
| `index.mdx` | Short "What is Junction?" landing — positioning statement, key features, link to quickstart |
| `quickstart.mdx` | Install, configure, fire first event, see it in debug panel |
| `events.mdx` | Entity:action model explanation, examples |
| `consent.mdx` | Consent state machine overview, modes, queuing behavior |
| `validation.mdx` | Zod schemas, strict vs lenient, error handling |
| `destinations/overview.mdx` | How the destination interface works, lifecycle (init → transform → send) |

### Stubs

Destination pages (GA4, Amplitude, Meta, Plausible, HTTP) and integration pages (Next.js, Astro) start as stubs with:
- Package name and install command
- Basic configuration example
- "Full documentation coming soon" note

These get fleshed out as we work through the roadmap.

### Stays in `docs/` (not migrated)

- `docs/superpowers/` — internal specs and plans
- `docs/status-reports/` — internal weekly reports
- `docs/product/tech-stack.md` — contributor reference

## Sidebar Configuration

```
- What is Junction?
- Getting Started
  - Quickstart
- Concepts
  - Events
  - Consent
  - Validation
  - Architecture
- Destinations
  - Overview
  - GA4
  - Amplitude
  - Meta
  - Plausible
  - HTTP
- Integrations
  - Next.js
  - Astro
- Product
  - Mission
  - Roadmap
```

## Starlight Configuration

- **Title:** Junction
- **Social links:** GitHub repo
- **Edit link:** GitHub source for each page
- **Theme:** Default Starlight (no custom theme)
- **Logo:** Add if available, skip if not

## Out of Scope

- Auto-generated API reference (typedoc)
- Custom theme or branding
- Cloudflare Pages deployment configuration
- Search configuration beyond Starlight defaults
- Blog or changelog section
