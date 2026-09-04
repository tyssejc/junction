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

## Identity Projection

Junction owns a canonical identity model; each destination projects it into the vendor's shape.

Canonical fields on every event:
- `event.user.anonymousId` — first-party anonymous/device ID, always present
- `event.user.userId` — known ID, set after `collector.identify()`
- `event.user.traits` — persistent traits from `identify()`
- `event.id` — unique per event, used as a dedup key
- `user:identified` — lifecycle event emitted by `collector.identify()`

| Canonical | GA4 | Amplitude | PostHog |
|---|---|---|---|
| `anonymousId` | `client_id` | `device_id` | `distinct_id` (server; web uses posthog-js's own ID — see gap) |
| `userId` | `user_id` | `user_id` | `distinct_id` after merge + `$identify` |
| `traits` | `user_properties` | `user_properties` | person props via `$set` |
| `user:identified` | no-op (carries `user_id`) | no-op (carries `user_id`) | `posthog.identify()` / `$identify` w/ `$anon_distinct_id` |
| `event.id` | — | `insert_id` | `uuid` |

**Every destination must decide how it handles `user:identified`.** Parallel-fields vendors
(GA4, Amplitude) carry `device_id` + `user_id` on every event and can no-op it. Merge/alias
vendors (PostHog) must act on it to stitch anonymous history to the known person.

> **Known gap (tracked):** `UserIdentity` has no `sessionId`; GA4/Amplitude do not yet map
> `session_id`/`$session_id`. Cross-destination follow-up, not owned by any single destination.

> **Known gap (tracked):** web-mode (`createPostHogWeb`) delegates the anonymous
> `distinct_id` to posthog-js's own cookie-managed ID rather than binding Junction's
> `anonymousId` (posthog-js needs the ID at `init()`, before any event is seen), so
> pre-identify web events won't correlate with server-mode events by `anonymousId`.
> Reconcile via `bootstrap.distinctID` once the collector exposes `anonymousId` at init.

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
