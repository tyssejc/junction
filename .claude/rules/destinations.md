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
