# AGENTS.md — Junction

Junction is a **config-as-code event pipeline**: `track(entity, action, properties)` → validation → consent → destinations.

## Core concept

Events use an **entity + action** naming model (e.g. `product:viewed`, `order:completed`), not opaque tag names. Destinations map these to vendor formats (GA4 recommended events, Amplitude event types, Meta standard events, etc.).

## Where to find what you need

| What | Where |
|------|-------|
| Overview, quick start, destination stub template | [`README.md`](README.md) |
| Architecture, consent semantics, package layout | [Docs: Architecture](https://docs.jctn.io/concepts/architecture/) |
| Integration guides (framework wiring, decision tree) | [Docs: Integration Guide](https://docs.jctn.io/guides/integration/) |
| Destination reference (GA4, Amplitude, Meta, etc.) | [Docs: Destinations](https://docs.jctn.io/destinations/overview/) |
| Contributing to Junction itself | [`CLAUDE.md`](CLAUDE.md) |
| Example typed config with contracts and env switching | [`config/junction.config.ts`](config/junction.config.ts) |

## Key conventions

1. **One collector API** — `track`, `identify`, `consent`, optional `on` listeners.
2. **Consent is a state machine** — pending categories queue events; when consent updates, queued events replay. AND semantics: all required categories must be `true`.
3. **Contracts are optional Zod schemas** on event properties — keyed by entity + action. Modes: `"strict"` (drop invalid) or `"lenient"` (warn, still send).
4. **Never ship secrets to the browser** — use `@junctionjs/gateway` or server-side collectors for API keys and access tokens.
5. **`Destination.runtime`** is `"client" | "server" | "both"` — register destinations where they belong.

## Quick package picker

- **Browser analytics**: `@junctionjs/client` + destination packages
- **Next.js**: `@junctionjs/next` + `@junctionjs/client` + destinations
- **Astro**: `@junctionjs/astro` + destinations
- **Server/edge proxy**: `@junctionjs/gateway`
- **Auto-instrumentation**: `@junctionjs/auto-collect`
- **Debugging**: `@junctionjs/debug`

For detailed framework wiring, consent configuration, CMP integration, and anti-patterns, see the [Integration Guide](https://docs.jctn.io/guides/integration/).
