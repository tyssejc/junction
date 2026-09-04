# PostHog Destination — Design Spec

**Date:** 2026-06-16
**Status:** Approved (design), pending implementation plan
**Roadmap:** Phase 2.1 — PostHog Destination

## Summary

Add `@junctionjs/destination-posthog`: a single package exporting two tree-shakeable
factory functions — `createPostHogWeb()` (device-mode) and `createPostHogServer()`
(cloud-mode) — that let an engineering team send Junction events to PostHog with an
explicit web/server split, modeled on Segment's device-mode vs cloud-mode distinction
but adapted to Junction's conventions.

This is the **first Junction destination to model the web/server split as a first-class
product concept**. GA4 is client-only; Amplitude quietly conflates both behind one HTTP
`runtime: "both"`. PostHog makes device-mode vs cloud-mode a deliberate choice the
engineer makes based on whether they need browser-side signals.

## Background & Motivation

Junction positions itself as a tag-manager replacement for engineers ("bring your own
device collection layer"). An engineering team choosing PostHog without Adobe Launch or
GTM has two legitimate needs:

- **"I want the full PostHog library"** — sessionization, person profiles, session replay,
  feature flags, browser-signal enrichment (`$current_url`, referrer, UTM, device). This is
  device-mode: load `posthog-js` on the page.
- **"I just want events in my PostHog dataset"** — forward events server-side to the capture
  API. This is cloud-mode: explicitly *not* a full replacement (no replay, no flags, no
  client sessionization, no automatic browser enrichment), consistent with how Segment
  frames its cloud-mode destinations.

**Scope framing (short-term goal):** demonstrate multiple *configurable* destinations, not
100% feature parity with PostHog. Expose PostHog's marquee capabilities as configurable
knobs, default them conservatively, do not attempt to wrap every posthog-js method in v1.

## Key Design Decisions

### 1. Two destinations: web (device-mode) and server (cloud-mode)

Maps onto Junction's existing `runtime: "client" | "server"` field.

- **PostHog Web** (`runtime: "client"`) — loads `posthog-js`, routes Junction's tracked
  events through `posthog.capture()`. Full library available for the asking.
- **PostHog Server** (`runtime: "server"`) — forwards to PostHog's `/capture` (and `/batch`)
  HTTP API. No browser signals, no replay/flags/sessionization.

**Junction stays the event source of truth.** Even in web mode, posthog-js's autonomous
capture (`autocapture`, `capture_pageview`) is **off by default** — Junction feeds it events
rather than letting it independently capture. Otherwise double-counting and two competing
event models. The engineer can opt into autocapture explicitly.

### 2. One package, two tree-shakeable factories

`@junctionjs/destination-posthog` exports `createPostHogWeb` and `createPostHogServer` as
independent, side-effect-free named exports (`sideEffects: false`, ESM-only — Junction
conventions). An engineer importing only `createPostHogServer` gets **only** the server code
path in their bundle; the web factory is statically eliminated.

**Rejected alternatives:**
- *Two separate packages* (`-web`, `-server`) — would force the same split on GA4, Amplitude,
  and every future vendor; messy for engineers who must know which package to install; more
  release/version overhead. Diverges from the one-package-per-vendor norm.
- *One factory, mode option* (`posthog({ mode })`) — hides two very different implementations
  behind one entry, less discoverable, conflates the distinction we want to make explicit.

**Footprint:** the "one package = everything ships to everyone" worry is dissolved by two
mechanisms already used in Junction — tree-shaking (server-only import excludes web code) and
runtime script loading (posthog-js is loaded from PostHog's CDN snippet at runtime, never
bundled as an npm dependency). Net: server-only engineers ship a few KB of `fetch`-based
code; web engineers ship a thin script-loader and pull posthog-js from the edge. No
`posthog-js` in anyone's `package.json`.

**Deliberate v1 cut:** script-load only, no npm-import option for posthog-js. Some teams
eventually want the npm package (typing, strict CSP) — that's a config knob to add later on
signal (YAGNI).

### 3. posthog-js init posture — conservative, everything opt-in

| posthog-js capability | Web default | Rationale |
|---|---|---|
| `autocapture` | **off** | Junction owns the event stream; would double-fire alongside `track()` |
| `capture_pageview` | **off** | Junction emits `page:viewed`, routed through `posthog.capture()` |
| `capture_pageleave` | **off** | Tied to pageview ownership |
| Session replay | **off**, opt-in via `sessionReplay: true` | Heavy payload + privacy-sensitive |
| Feature flags | **loaded** (posthog-js fetches on init), **no Junction wrapper API in v1** | Reading flags is orthogonal to event collection; call `posthog.isFeatureEnabled()` directly. Typed wrapper is a later, signal-driven addition |
| `persistence` (cookies/localStorage) | PostHog default — safe | Destination only inits *after* consent resolves; no consent → posthog-js never loads → no cookies |

Throughline: Junction calls `posthog.capture()` for events it already tracks; everything
posthog-js would do autonomously is off unless the engineer turns it on.

**Consent revocation mid-session:** since the script is already loaded, `onConsent`/`teardown`
must stop capture (`posthog.opt_out_capturing()`). This is real logic, not free — same problem
GA4 already solves, so there is precedent.

### 4. Identity — canonical projection convention

Junction already has a canonical identity model consumed by GA4 and Amplitude:

- `event.user.anonymousId` — first-party anonymous/device ID, always present
- `event.user.userId` — known ID, populated after `collector.identify()`
- `event.user.traits` — persistent traits from `identify()`
- `collector.identify(userId, traits)` — mutates canonical user *and* emits `user:identified`
- `event.id` — unique per event, dedup key

**Canonical → vendor projection:**

| Junction canonical | GA4 (today) | Amplitude (today) | PostHog (this spec) |
|---|---|---|---|
| `anonymousId` | `client_id` | `device_id` | `distinct_id` (while anonymous) |
| `userId` | `user_id` | `user_id` | `distinct_id` after merge + `$identify` |
| `traits` | `user_properties` | `user_properties` | person props via `$set` |
| `user:identified` | no-op (carries `user_id`) | no-op (carries `user_id`) | `posthog.identify()` / `$identify` w/ `$anon_distinct_id` |
| `event.id` | n/a | `insert_id` | `uuid` (dedup) |

**Why PostHog forces this to be a named concept:** GA4/Amplitude use a *parallel-fields*
identity model (carry `device_id` + `user_id` side by side forever). PostHog uses a
*merge/alias* model — a single `distinct_id` that starts anonymous and, on identify, gets
stitched to the known person so pre-login history follows them. PostHog is therefore the first
destination that must *act* on `user:identified` rather than passively stamp a field.

**Convention introduced by this spec:** document the canonical→vendor identity projection in
`.claude/rules/destinations.md`, and add "handle `user:identified`" as an explicit step in the
destination contract (even though GA4/Amplitude currently no-op it).

**Out of scope (tracked fast-follows, not this spec):**
- Audit GA4/Amplitude against the named convention (they already comply on field mapping).
- **Session-ID gap** — `UserIdentity` has no `sessionId`; GA4/Amplitude don't map
  `session_id`/`$session_id`. A genuine cross-destination hole; its own ticket.

## Configuration Surface

```ts
interface PostHogBaseConfig {
  apiKey: string;                    // PostHog project API key
  host?: string;                     // default "https://us.i.posthog.com"; eu.i... or self-hosted
  consent?: ConsentCategory[];       // default ["analytics"]
  eventNameMap?: Record<string, string>;
  debug?: boolean;
}

interface PostHogWebConfig extends PostHogBaseConfig {
  loadScript?: boolean;              // default true (queue-before-load snippet)
  scriptUrl?: string;                // override for reverse-proxy / self-host
  sessionReplay?: boolean;           // default false
  autocapture?: boolean;             // default false
  capturePageview?: boolean;         // default false — Junction owns page:viewed
}

interface PostHogServerConfig extends PostHogBaseConfig {
  batchSize?: number;                // default 20 → uses /batch; else /capture
  flushIntervalMs?: number;          // default 5000
  maxRetries?: number;               // default 3, exponential backoff
}
```

## Event Name Mapping

Junction's 3-tier fallback: config override → `DEFAULT_MAP` → generated `entity_action`.

`DEFAULT_MAP` is deliberately thin — PostHog accepts arbitrary event names:

```ts
const POSTHOG_DEFAULT_MAP: Record<string, string> = {
  "page:viewed": "$pageview",
};
```

Two events sit **outside** `capture()`:
- `_system` entity → `transform` returns `null` (filtered, per the reserved-entity rule).
- `user:identified` → routed to identify/`$identify`, not a generic capture.

## Data Flow

### Web (device-mode)

1. `init` — SSR guard (`typeof window === "undefined"` → skip). Inject posthog snippet via
   queue-before-load pattern (idempotent, `script.async = true`, `loadScript`-gated, custom
   `scriptUrl` supported). Init posthog-js with `autocapture`/`capture_pageview` off,
   `sessionReplay` respected.
2. `transform` — map entity:action → event name, build properties. `_system` → `null`.
   `user:identified` marked for identify routing.
3. `send` — `posthog.capture(name, properties)` using posthog-js's managed `distinct_id`.
   `user:identified` → `posthog.identify(userId, { $set: traits })` (auto-aliases prior anon ID).
4. `onConsent`/`teardown` — on consent revocation, `posthog.opt_out_capturing()`.

### Server (cloud-mode)

1. `init` — set up batch buffer if `batchSize > 1`. No window, no cookies.
2. `transform` — build `{ api_key, event, distinct_id: userId ?? anonymousId, properties,
   timestamp, uuid: event.id }`. `_system` → `null`. `user:identified` → `$identify` event
   carrying `$anon_distinct_id: anonymousId` + `distinct_id: userId`.
3. `send` — POST to `/capture`, or buffer and flush to `/batch` when `batchSize` reached or
   `flushIntervalMs` elapses. Retry with exponential backoff up to `maxRetries`.

## Consent

- Default `consent: ["analytics"]`.
- The destination only initializes after consent resolves, so cookie/persistence concerns are
  handled by the existing consent gate (no consent → posthog-js never loads → no cookies).
- Session replay stays under `analytics` for v1 but is flagged as sensitive and worth
  revisiting (may warrant a stricter category).

## Error Isolation

Follows `.claude/rules/destinations.md`:

- try/catch at `init`, `transform`, `send` boundaries.
- `emit("destination:error", …)` so consumers can observe failures.
- `[Junction]` prefix on all console output.
- `send` never blocks the collector — `.catch()` logs, no awaited blocking.
- One destination's failure never affects another.

## Testing

Co-located Vitest (`packages/destination-posthog/src/**/*.test.ts`), `make*` factories for
data, `mock*` for spies.

- **Server:** mock `fetch`. Cover payload shape, `distinct_id` precedence (`userId ??
  anonymousId`), `uuid` dedup, `/capture` vs `/batch` selection, batch flush on size + interval,
  retry/backoff on failure, `$identify` on `user:identified`.
- **Web:** posthog-js stub + `window` guard. Cover SSR skip, idempotent script load,
  `loadScript: false`, init options (autocapture/pageview off, sessionReplay), `capture()`
  routing, `identify()` on `user:identified`, `opt_out_capturing()` on consent revocation.
- **Shared:** 3-tier event-name mapping, `_system` filtering, config defaults.

## Deliverables (Phase 2.1)

- `packages/destination-posthog/` — package + tests, following `.claude/rules/packages.md`
  (ESM-only, peerDependency on core, `sideEffects: false`, tsup build flags).
- Demo-app wiring (`apps/demo/`) showing both web and server destinations.
- Starlight docs page (`apps/docs/src/content/docs/destinations/posthog.mdx`).
- Identity-convention addition to `.claude/rules/destinations.md`.
- Changeset + npm publish.

## Follow-ups (out of scope)

- Audit GA4/Amplitude against the identity-projection convention.
- Session-ID cross-destination gap (add `sessionId` to `UserIdentity`, map per vendor).
- Optional npm-import mode for posthog-js (typing / strict CSP).
- Typed Junction wrapper for PostHog feature flags.
