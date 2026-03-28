# Context Management Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate project context from agent-os into native Claude Code conventions (CLAUDE.md + path-scoped rules) so any contributor can clone the repo and be productive with Claude Code immediately.

**Architecture:** Move agent-os product docs to `docs/product/`, consolidate 17 agent-os standards into 6 path-scoped `.claude/rules/` files, create a lean CLAUDE.md (<200 lines), add superpowers install instructions, and clean up agent-os artifacts.

**Tech Stack:** Claude Code (.claude/ conventions), Markdown

---

### Task 1: Create `docs/product/` from agent-os product docs

**Files:**
- Create: `docs/product/mission.md` (copy from `agent-os/product/mission.md`)
- Create: `docs/product/roadmap.md` (copy from `agent-os/product/roadmap.md`)
- Create: `docs/product/tech-stack.md` (copy from `agent-os/product/tech-stack.md`)

- [ ] **Step 1: Create `docs/product/` directory and copy files**

```bash
mkdir -p docs/product
cp agent-os/product/mission.md docs/product/mission.md
cp agent-os/product/roadmap.md docs/product/roadmap.md
cp agent-os/product/tech-stack.md docs/product/tech-stack.md
```

- [ ] **Step 2: Verify files copied correctly**

```bash
ls docs/product/
```

Expected: `mission.md  roadmap.md  tech-stack.md`

- [ ] **Step 3: Commit**

```bash
git add docs/product/
git commit -m "docs: move product context from agent-os to docs/product"
```

---

### Task 2: Create `.claude/rules/consent.md`

Merges three related agent-os standards: consent-state-machine, consent-timing-heuristics, necessary-vs-exempt. Scoped to `packages/core/**`.

**Files:**
- Create: `.claude/rules/consent.md`

- [ ] **Step 1: Create the rule file**

```markdown
---
paths:
  - "packages/core/**"
---

# Consent Standards

## State Machine

Consent is a reactive state machine with event queuing, not a boolean gate.

- **Merge, not replace:** `setState({ analytics: true })` merges with existing state
- **AND logic:** Destination requiring `["analytics", "marketing"]` needs BOTH granted
- **"necessary" and "exempt" always allowed:** Never blocked by consent
- **Pending = undefined:** Categories not yet set are pending, not denied
- **Lenient by default:** Events pass through; strict mode is opt-in

### Event Queuing

Events arriving before consent resolves are queued and replayed when consent changes.

- Deduplicated by event ID
- `sentTo` Set tracks which destinations already received each event
- Queue expires based on `queueTimeout` (default 30s)
- In strict mode, queuing is disabled — pending = denied, events drop

### CMP Fallback

~15-20% of privacy-conscious users block CMP scripts. Use `consentFallback`:

```typescript
consent: {
  consentFallback: {
    timeout: 3000,
    state: { analytics: false, marketing: false }
  }
}
```

### DNT & GPC

When `respectDNT` or `respectGPC` is enabled:
- DNT disables `analytics` and `marketing`
- GPC additionally disables `personalization`

### ConsentSignals (Separate from Destinations)

Vendor consent protocols (e.g. Google Consent Mode) are modeled as ConsentSignals, not part of destinations:

```typescript
consentSignals: [
  googleConsentMode({ waitForUpdate: 500 })
]
```

## Timing Heuristics

Not all "pending" consent is equal. Junction distinguishes the signal behind why consent hasn't resolved.

| Signal | Meaning | Action |
|--------|---------|--------|
| CMP blocked | Script never loads | `consentFallback` (3s) |
| CMP loaded, no interaction | Banner visible | Queue, `queueTimeout` (30s) |
| CMP loaded, dismissed | Closed without choosing | Conservative defaults |

**Future direction:** Accept a `consentSignalHint` from CMP integrations:
- `"blocked"` → fast fallback (seconds)
- `"visible"` → patient queue (30s+)
- `"dismissed"` → conservative defaults immediately

### SPA vs MPA

- **MPA:** Navigation = unload = queue loss. First pageview uniquely fragile.
- **SPA:** User stays on page, consent resolves naturally.
- May be best addressed at integration layer (e.g. `@junctionjs/next` defaults) rather than core.

## Necessary vs. Exempt

Two always-allowed consent categories serving different layers of the privacy stack.

- **necessary**: CMP/storage layer. Cookies and web storage required for site functionality. Pinned to `true` in state. Legal basis: ePrivacy Art 5(3).
- **exempt**: Data/dispatch layer. Destinations that receive events regardless of consent state. Used for first-party observability. Legal basis: GDPR Art 6(1)(f) legitimate interest.

### Why Two Categories

They operate at different enforcement layers:
- CMPs enforce **storage** (cookies, localStorage)
- Junction enforces **dispatch** (network requests to destinations)

### Guardrails (required)

- **First-party only**: Exempt destinations must be first-party or contractually bound processors
- **Legal basis declaration**: Each exempt destination should declare its basis
- **Audit trail**: Events dispatched to exempt destinations carry `is_exempt: true` metadata
- **Transparency**: Emit `destination:exempt` events for debug panels and audit logs

| Aspect | necessary | exempt |
|--------|-----------|--------|
| Consent UI | Visible | Hidden |
| Consent queue | Participates | Bypasses |
| Legal basis | ePrivacy strictly necessary | GDPR legitimate interest |
| User can disable | No (always on) | No (operational) |
```

- [ ] **Step 2: Verify frontmatter is valid**

Open the file and confirm the `paths` frontmatter is correct YAML.

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/consent.md
git commit -m "docs: add path-scoped consent rules for packages/core"
```

---

### Task 3: Create `.claude/rules/destinations.md`

Merges: destination-interface, event-name-mapping, script-loading, system-events, error-isolation. Scoped to `packages/destination-*/**`.

**Files:**
- Create: `.claude/rules/destinations.md`

- [ ] **Step 1: Create the rule file**

```markdown
---
paths:
  - "packages/destination-*/**"
---

# Destination Standards

## Interface

Destinations are plain objects with async functions, not classes.

- Tree-shakeable (classes aren't), composable, easy to test
- Use factory functions (`createGA4()`, `http(config)`), not `new`

```typescript
interface Destination<TConfig> {
  name: string;
  version: string;
  consent: ConsentCategory[];  // AND logic
  runtime: "client" | "server" | "both";

  init: (config: TConfig) => Promise<void> | void;
  transform: (event: JctEvent, config: TConfig) => unknown | null;
  send: (payload: unknown, config: TConfig) => Promise<void>;
  onConsent?: (state: ConsentState) => void;
  teardown?: () => Promise<void> | void;
}
```

- `transform` returns `null` to skip an event for this destination
- `transform` is a pure function — no side effects, no network calls
- `send` handles all network I/O
- Config is type-generic: `Destination<GA4Config>`

## Event Name Mapping

All destinations use a 3-tier fallback:

1. **Config override** — `config.eventNameMap["product:viewed"]`
2. **Default map** — Built-in mapping per destination
3. **Generated name** — `entity_action` (or destination-specific format)

```typescript
function getEventName(event: JctEvent, config: Config): string {
  const key = `${event.entity}:${event.action}`;
  return config.eventNameMap?.[key]
    ?? DEFAULT_MAP[key]
    ?? `${event.entity}_${event.action}`;
}
```

### Per-Destination Defaults

| entity:action | GA4 | Amplitude | Meta |
|---|---|---|---|
| page:viewed | page_view | Page Viewed | PageView |
| product:viewed | view_item | Product Viewed | ViewContent |
| product:added | add_to_cart | Product Added | AddToCart |
| order:completed | purchase | Order Completed | Purchase |

## Script Loading

Client-side destinations that load vendor scripts use a queue-before-load pattern:

- Always check `typeof window === "undefined"` first (SSR safety)
- Always check if already loaded (idempotent)
- Create queuing stub before loading script
- Use `script.async = true`
- Support custom script URLs via config
- Gate loading with `loadScript?: boolean` config (default: true)

## System Events

The `_system` entity is reserved for internal lifecycle events. All destinations must filter them:

```typescript
transform(event: JctEvent, config: Config) {
  if (event.entity === "_system") return null;
  // ... normal transformation
}
```

## Error Isolation

The collector must never crash. Every external boundary is wrapped in try/catch.

| Boundary | Failure behavior |
|---|---|
| `destination.init()` | Logged, destination skipped, collector continues |
| `destination.transform()` | Logged, event skipped for that destination, others still receive it |
| `destination.send()` | `.catch()` logs error, no await blocking |
| Consent listeners | Caught per-listener, other listeners still fire |

- Use `emit("destination:error", ...)` so consumers can observe failures
- Never let one destination's failure affect another
- Prefix all console output with `[Junction]`
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/destinations.md
git commit -m "docs: add path-scoped destination rules for destination packages"
```

---

### Task 4: Create `.claude/rules/gateway.md`

From: gateway-request-flow. Scoped to `packages/gateway/**`.

**Files:**
- Create: `.claude/rules/gateway.md`

- [ ] **Step 1: Create the rule file**

```markdown
---
paths:
  - "packages/gateway/**"
---

# Gateway Standards

## Request Flow

```
POST /collect
  → CORS preflight (OPTIONS)
  → Auth check (bearer token or x-api-key)
  → Parse JSON body: { events: JctEvent[], consent?: ConsentState }
  → Apply client-reported consent
  → Per event: set context, identify if userId, track(entity, action, props)
  → Flush immediately
  → Return { ok: true, received: count }
```

## Edge-First Design

- **Flush immediately** after processing — edge functions are short-lived
- No batching or queueing at gateway level (client SDK handles that)
- Uses only Web Standard APIs: Request, Response, URL, fetch, JSON
- Zero platform-specific imports

## Server Context Enrichment

Gateway extracts server-side context per request:
- IP: `cf-connecting-ip` → `x-forwarded-for` → `x-real-ip`
- Geo: `cf-ipcountry`, `cf-ipregion`, `cf-ipcity`
- User-Agent, Referer

Merged with client context via `resolveContext` closure.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/gateway.md
git commit -m "docs: add path-scoped gateway rules"
```

---

### Task 5: Create `.claude/rules/events.md`

From: entity-action-events. Scoped to core and client packages.

**Files:**
- Create: `.claude/rules/events.md`

- [ ] **Step 1: Create the rule file**

```markdown
---
paths:
  - "packages/core/**"
  - "packages/client/**"
---

# Event Standards

## Entity:Action Pairs

All events use `entity:action` pairs, not flat strings.

```typescript
// Good
track("product", "viewed", { product_id: "123" })
track("order", "completed", { order_id: "456" })

// Bad
track("Product Viewed", { product_id: "123" })
```

## Naming Rules

- **Entities:** lowercase, singular or plural (`product`, `page`, `order`, `user`)
- **Actions:** lowercase, past tense preferred (`viewed`, `added`, `completed`, `signed_up`)
- **Combined key:** `entity:action` used for contract lookup and destination mapping
- Wildcard contracts (`entity:*`) match all actions for an entity
- If no contract exists, events pass through unvalidated

## Destination Mapping

Destinations map entity:action to vendor event names:

```typescript
const GA4_EVENT_MAP: Record<string, string> = {
  "page:viewed": "page_view",
  "product:viewed": "view_item",
  "product:added": "add_to_cart",
  "order:completed": "purchase",
};
```
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/events.md
git commit -m "docs: add path-scoped event naming rules for core/client"
```

---

### Task 6: Create `.claude/rules/testing.md`

Merges: vitest-conventions, mock-patterns, test-factories. Scoped to test files.

**Files:**
- Create: `.claude/rules/testing.md`

- [ ] **Step 1: Create the rule file**

```markdown
---
paths:
  - "**/*.test.ts"
---

# Testing Standards

## Vitest Setup

- Centralized config at root `vitest.config.ts`
- Node environment by default; `@vitest-environment happy-dom` for DOM tests
- Globals enabled (`describe`, `it`, `expect`, `vi` available without import)
- Tests co-located: `packages/*/src/**/*.test.ts`

## Structure

```typescript
describe("ConsentManager", () => {           // Module/class
  describe("initialization", () => {         // Feature group
    it("starts with the default state", () => { // Behavior
    });
  });
});
```

- 2-3 levels of `describe` nesting
- `it` statements describe behavior, not functions
- Use `// ─── section name ───` dividers for major sections

## Fake Timers

```typescript
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
```

- Use `vi.advanceTimersByTime(ms)` for sync advancement
- Use `await vi.advanceTimersByTimeAsync(ms)` when microtasks need to resolve

## Mock Patterns

```typescript
// vi.fn() — new functions
onConsent: vi.fn()
init: vi.fn().mockResolvedValue(undefined)
send: vi.fn().mockRejectedValue(new Error("Network error"))
transform: vi.fn((event) => ({ transformed: true, event }))

// vi.spyOn() — existing objects (always suppress output)
vi.spyOn(console, "error").mockImplementation(() => {})

// vi.stubGlobal() — browser globals in Node tests
vi.stubGlobal("navigator", { sendBeacon: vi.fn() })
```

- `vi.fn()` for mock objects in factories
- `vi.spyOn()` only for existing objects (console, timers)
- Always `.mockImplementation(() => {})` on console spies
- Reset with `.mockClear()` in `beforeEach` if reusing across tests

## Test Factories

```typescript
function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "test",
    action: "tracked",
    properties: {},
    context: {},
    user: { anonymousId: "anon-123" },
    timestamp: new Date().toISOString(),
    id: "evt-001",
    version: "1.0.0",
    source: { type: "client", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

function mockDestination(overrides?: Partial<Destination>): Destination {
  return {
    name: "test-destination",
    version: "0.1.0",
    consent: ["analytics"],
    runtime: "both",
    init: vi.fn().mockResolvedValue(undefined),
    transform: vi.fn((event) => ({ transformed: true, event })),
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

- `make*` for data objects, `mock*` for objects with spied methods
- Accept `Partial<T>` and spread overrides last
- Provide complete, sensible defaults
- Co-locate factories in each test file (no shared test utils)

## Rules

- Every test file is self-contained (own factories, own setup)
- Clean up in `afterEach`: restore timers, clear mocks
- No shared mutable state between tests
- Behavior-focused test names: "notifies listeners on change", not "test notify"
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/testing.md
git commit -m "docs: add path-scoped testing rules for test files"
```

---

### Task 7: Create `.claude/rules/packages.md`

Merges: dependency-layering, esm-only-build, package-exports, biome-code-style. Scoped to all packages.

**Files:**
- Create: `.claude/rules/packages.md`

- [ ] **Step 1: Create the rule file**

```markdown
---
paths:
  - "packages/**"
---

# Package Standards

## Dependency Layering

Packages form a strict hierarchy. No circular deps.

```
@junctionjs/{astro,next}          <- Framework integrations
@junctionjs/destination-*          <- Destinations
@junctionjs/{client,gateway}       <- Runtime wrappers
@junctionjs/core                   <- Foundation
```

| Package type | How it depends on core |
|---|---|
| `client`, `gateway` | `dependencies` |
| `destination-*` | `peerDependencies` |
| Framework integrations | `peerDependencies` on core + client |

- Destinations must never import from `client` or `gateway`
- Core has no workspace dependencies (only Zod)
- No package may depend on a package in a higher layer

## ESM-Only Build

All packages output ESM only. No CJS.

```bash
tsup src/index.ts --format esm --dts --sourcemap --target es2022 --no-config
```

- Always: `--format esm --dts --sourcemap --target es2022 --no-config`
- Mark workspace dependencies as `--external`
- Mark framework dependencies as `--external`
- No tsup config files — CLI flags only
- Output to `dist/`

## Package Exports

All packages use `@junctionjs/*` scope.

- Destinations: `@junctionjs/destination-{provider}`
- Framework integrations: `@junctionjs/{framework}`

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}
```

- ESM only — no `require` condition
- Every export needs both `.js` and `.d.ts`
- `files` field: `["dist", "README.md"]`
- `publishConfig`: `{ "access": "public", "provenance": true }`

## Code Style (Biome)

- Double quotes, always semicolons, trailing commas everywhere
- 2-space indent, 120 char line width
- Unused variables/imports: warn (not error)
- `noExplicitAny`: off, `noNonNullAssertion`: off
- Import organization enabled (Biome sorts imports)
- Never add ESLint or Prettier configs
- Don't disable Biome rules without good reason
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/packages.md
git commit -m "docs: add path-scoped package rules"
```

---

### Task 8: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create the CLAUDE.md file**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for Claude Code contributor experience"
```

---

### Task 9: Clean up agent-os artifacts

**Files:**
- Delete: `agent-os/` (entire directory)
- Delete: `.claude/commands/agent-os/` (slash commands that depend on agent-os)

- [ ] **Step 1: Remove agent-os directory**

```bash
rm -rf agent-os/
```

- [ ] **Step 2: Remove agent-os slash commands**

```bash
rm -rf .claude/commands/agent-os/
```

- [ ] **Step 3: Check if .claude/commands/ is now empty and clean up if so**

```bash
ls .claude/commands/
```

If empty, remove the directory:

```bash
rmdir .claude/commands/
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove agent-os directory and commands (migrated to .claude/rules and docs/product)"
```

---

### Task 10: Final verification

- [ ] **Step 1: Verify the new structure**

```bash
ls CLAUDE.md
ls docs/product/
ls .claude/rules/
```

Expected:
- `CLAUDE.md` exists at root
- `docs/product/`: `mission.md`, `roadmap.md`, `tech-stack.md`
- `.claude/rules/`: `consent.md`, `destinations.md`, `events.md`, `gateway.md`, `packages.md`, `testing.md`

- [ ] **Step 2: Verify agent-os is gone**

```bash
ls agent-os/ 2>&1
ls .claude/commands/agent-os/ 2>&1
```

Expected: both return "No such file or directory"

- [ ] **Step 3: Run build and tests to confirm nothing broke**

```bash
npm run build && npm test
```

Expected: all pass (this migration is docs-only, no code changes)
