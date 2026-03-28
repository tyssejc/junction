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
