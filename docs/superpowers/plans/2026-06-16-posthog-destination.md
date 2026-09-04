# PostHog Destination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@junctionjs/destination-posthog` — one package exporting two tree-shakeable factories, `createPostHogServer()` (cloud-mode) and `createPostHogWeb()` (device-mode) — that send Junction events to PostHog.

**Architecture:** Follows the Plausible destination's factory pattern: each factory captures config in a closure and returns a `Destination<TConfig>` object with `init`/`transform`/`send` (+ `onConsent`/`teardown` for web). Pure helpers (event-name mapping, distinct_id resolution, `_system` filtering) live in a shared module. Server uses `fetch` against PostHog's `/capture` and `/batch` HTTP APIs with buffering + retry. Web loads `posthog-js` from PostHog's CDN via the queue-before-load snippet and routes Junction events through `posthog.capture()`/`posthog.identify()`.

**Tech Stack:** TypeScript (strict), ESM-only, tsup build, Vitest, Biome. Peer dependency on `@junctionjs/core`. No runtime dependency on `posthog-js` (loaded via script snippet).

## Global Constraints

Copied verbatim from `.claude/rules/packages.md`, `.claude/rules/destinations.md`, `.claude/rules/events.md`, and the design spec:

- **ESM only.** Build with `tsup src/index.ts --format esm --dts --sourcemap --target es2022 --no-config --external @junctionjs/core`. No CJS. No tsup config files — CLI flags only.
- **Dependency layering.** Destinations depend on core via `peerDependencies` only. Never import from `client` or `gateway`.
- **Package exports.** `@junctionjs/destination-posthog` scope. `exports` maps `.` to `./dist/index.js` + `./dist/index.d.ts`. `files: ["dist", "README.md"]`. `publishConfig: { access: "public", provenance: true }`. Add `"sideEffects": false` (required for consumer tree-shaking of the two factories).
- **Biome style.** Double quotes, semicolons always, trailing commas everywhere, 2-space indent, 120 char line width. Import organization on. `noExplicitAny` off, `noNonNullAssertion` off. Never add ESLint/Prettier.
- **Factory pattern.** Use factory functions returning plain objects, not classes, not `new`.
- **Event name mapping** — 3-tier: `config.eventNameMap[key]` → `DEFAULT_MAP[key]` → generated `entity_action`.
- **System events** — `transform` returns `null` when `event.entity === "_system"`.
- **Error isolation** — throw from `init`/`send` on real failures; the collector wraps every boundary. Prefix all console output with `[Junction:posthog-*]`.
- **Consent default** — `["analytics"]` for both factories.
- **Identity** — `distinct_id = event.user.userId ?? event.user.anonymousId`. `user:identified` is NOT a normal capture; it maps to `$identify` (server) / `posthog.identify()` (web).
- **PostHog default host** — `https://us.i.posthog.com`.
- **Node** — `engines.node >= 18`.

---

## File Structure

```
packages/destination-posthog/
├── package.json                 # New — copy Plausible's, adjust name/keywords, add sideEffects:false
├── tsconfig.json                # New — copy Plausible's verbatim
├── README.md                    # New — usage for both factories
└── src/
    ├── shared.ts                # New — types (PostHogBaseConfig), event-name mapping, distinct_id, _system helpers
    ├── shared.test.ts           # New
    ├── server.ts                # New — createPostHogServer (transform + send + batching + retry + factory)
    ├── server.test.ts           # New
    ├── web.ts                   # New — createPostHogWeb (loader + transform + send + consent + factory)
    ├── web.test.ts              # New
    ├── index.ts                 # New — barrel: re-export both factories + public types
    └── index.test.ts            # New — smoke test that barrel exports resolve
```

Other files touched:
- `vitest.config.ts` — add `@junctionjs/destination-posthog` resolve alias
- `.claude/rules/destinations.md` — add identity-projection convention (Task 7)
- `apps/docs/src/content/docs/destinations/posthog.mdx` — docs page (Task 8)
- `apps/docs/src/content/docs/destinations/overview.mdx` — add PostHog row (Task 8)
- `.changeset/<name>.md` — changeset (Task 8)

---

## Task 1: Scaffold package + shared helpers

**Files:**
- Create: `packages/destination-posthog/package.json`
- Create: `packages/destination-posthog/tsconfig.json`
- Create: `packages/destination-posthog/src/shared.ts`
- Test: `packages/destination-posthog/src/shared.test.ts`
- Modify: `vitest.config.ts` (add resolve alias)

**Interfaces:**
- Produces:
  - `interface PostHogBaseConfig { apiKey: string; host?: string; consent?: ConsentCategory[]; eventNameMap?: Record<string, string>; debug?: boolean; }`
  - `POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com"`
  - `getEventName(event: JctEvent, eventNameMap?: Record<string, string>): string`
  - `resolveDistinctId(event: JctEvent): string`
  - `isSystemEvent(event: JctEvent): boolean`
  - `isIdentifyEvent(event: JctEvent): boolean`
  - `resolveHost(host?: string): string` (strips trailing slash, defaults to `POSTHOG_DEFAULT_HOST`)
  - `buildEventProperties(event: JctEvent, extra?: Record<string, unknown>): Record<string, unknown>` (merges event.properties + page context, PostHog `$` conventions)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@junctionjs/destination-posthog",
  "version": "0.1.0",
  "description": "PostHog destination for Junction — web (device-mode) and server (cloud-mode)",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --sourcemap --target es2022 --no-config --external @junctionjs/core",
    "dev": "tsup src/index.ts --format esm --dts --watch --no-config --external @junctionjs/core",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@junctionjs/core": "^0.3.0"
  },
  "devDependencies": {
    "@junctionjs/core": "*",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true,
    "registry": "https://registry.npmjs.org/"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tyssejc/junction.git",
    "directory": "packages/destination-posthog"
  },
  "keywords": ["analytics", "posthog", "product-analytics", "junction-destination"]
}
```

- [ ] **Step 2: Create `tsconfig.json`** (verbatim copy of the other destinations')

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Add resolve alias in `vitest.config.ts`**

In the `resolve.alias` object, after the `destination-plausible` line, add:

```ts
      "@junctionjs/destination-posthog": path.resolve(__dirname, "packages/destination-posthog/src"),
```

- [ ] **Step 4: Write the failing test** — `packages/destination-posthog/src/shared.test.ts`

```ts
import type { JctEvent } from "@junctionjs/core";
import { describe, expect, it } from "vitest";
import {
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  POSTHOG_DEFAULT_HOST,
  resolveDistinctId,
  resolveHost,
} from "./shared.js";

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "page",
    action: "viewed",
    properties: {},
    context: {
      page: {
        url: "https://example.com/blog",
        path: "/blog",
        title: "Blog",
        referrer: "https://google.com",
        search: "",
        hash: "",
      },
      device: { type: "desktop", userAgent: "Mozilla/5.0 TestAgent", language: "en-US" },
    },
    user: { anonymousId: "anon-123" },
    timestamp: "2026-06-16T12:00:00.000Z",
    id: "evt-001",
    version: "1.0.0",
    source: { type: "server", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

describe("shared", () => {
  describe("getEventName (3-tier)", () => {
    it("uses config override first", () => {
      const name = getEventName(makeEvent({ entity: "product", action: "viewed" }), {
        "product:viewed": "Custom Name",
      });
      expect(name).toBe("Custom Name");
    });

    it("falls back to DEFAULT_MAP ($pageview for page:viewed)", () => {
      expect(getEventName(makeEvent(), undefined)).toBe("$pageview");
    });

    it("generates entity_action when no map matches", () => {
      expect(getEventName(makeEvent({ entity: "product", action: "added" }), undefined)).toBe("product_added");
    });
  });

  describe("resolveDistinctId", () => {
    it("prefers userId when present", () => {
      expect(resolveDistinctId(makeEvent({ user: { anonymousId: "anon-1", userId: "user-9" } }))).toBe("user-9");
    });

    it("falls back to anonymousId", () => {
      expect(resolveDistinctId(makeEvent())).toBe("anon-123");
    });
  });

  describe("isSystemEvent / isIdentifyEvent", () => {
    it("detects _system entity", () => {
      expect(isSystemEvent(makeEvent({ entity: "_system", action: "init" }))).toBe(true);
      expect(isSystemEvent(makeEvent())).toBe(false);
    });

    it("detects user:identified", () => {
      expect(isIdentifyEvent(makeEvent({ entity: "user", action: "identified" }))).toBe(true);
      expect(isIdentifyEvent(makeEvent())).toBe(false);
    });
  });

  describe("resolveHost", () => {
    it("defaults to PostHog US cloud", () => {
      expect(resolveHost(undefined)).toBe(POSTHOG_DEFAULT_HOST);
    });

    it("strips trailing slash", () => {
      expect(resolveHost("https://eu.i.posthog.com/")).toBe("https://eu.i.posthog.com");
    });
  });

  describe("buildEventProperties", () => {
    it("merges event properties with $current_url and $referrer from page context", () => {
      const props = buildEventProperties(makeEvent({ properties: { plan: "pro" } }));
      expect(props.plan).toBe("pro");
      expect(props.$current_url).toBe("https://example.com/blog");
      expect(props.$referrer).toBe("https://google.com");
    });

    it("merges extra properties", () => {
      const props = buildEventProperties(makeEvent(), { $lib: "junction-server" });
      expect(props.$lib).toBe("junction-server");
    });
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run packages/destination-posthog/src/shared.test.ts`
Expected: FAIL — cannot resolve `./shared.js` (module does not exist).

- [ ] **Step 6: Implement `packages/destination-posthog/src/shared.ts`**

```ts
/**
 * @junctionjs/destination-posthog — shared helpers
 *
 * Pure functions shared by the web (device-mode) and server (cloud-mode)
 * PostHog destinations. No side effects, no network, no DOM.
 */

import type { ConsentCategory, JctEvent } from "@junctionjs/core";

export const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

export interface PostHogBaseConfig {
  /** PostHog project API key */
  apiKey: string;

  /** PostHog host. Default US cloud; use https://eu.i.posthog.com or a self-hosted/proxy URL. */
  host?: string;

  /** Consent categories required (AND logic). Default ["analytics"]. */
  consent?: ConsentCategory[];

  /** Override entity:action → PostHog event name. */
  eventNameMap?: Record<string, string>;

  /** Verbose logging. */
  debug?: boolean;
}

/** PostHog accepts arbitrary event names, so the default map is deliberately thin. */
const POSTHOG_DEFAULT_MAP: Record<string, string> = {
  "page:viewed": "$pageview",
};

/** 3-tier event name resolution: config override → default map → generated entity_action. */
export function getEventName(event: JctEvent, eventNameMap?: Record<string, string>): string {
  const key = `${event.entity}:${event.action}`;
  return eventNameMap?.[key] ?? POSTHOG_DEFAULT_MAP[key] ?? `${event.entity}_${event.action}`;
}

/** PostHog uses a single distinct_id that flips from anonymous to known on identify. */
export function resolveDistinctId(event: JctEvent): string {
  return event.user.userId ?? event.user.anonymousId;
}

export function isSystemEvent(event: JctEvent): boolean {
  return event.entity === "_system";
}

export function isIdentifyEvent(event: JctEvent): boolean {
  return event.entity === "user" && event.action === "identified";
}

export function resolveHost(host?: string): string {
  return (host ?? POSTHOG_DEFAULT_HOST).replace(/\/$/, "");
}

/** Build PostHog event properties from a Junction event, adding $-prefixed browser context. */
export function buildEventProperties(
  event: JctEvent,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const props: Record<string, unknown> = { ...event.properties, ...extra };
  if (event.context.page) {
    props.$current_url = event.context.page.url;
    if (event.context.page.referrer) props.$referrer = event.context.page.referrer;
  }
  return props;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run packages/destination-posthog/src/shared.test.ts`
Expected: PASS (all cases in the `shared` describe block).

- [ ] **Step 8: Install workspace deps so the package is linked**

Run: `npm install`
Expected: completes; `@junctionjs/destination-posthog` now resolvable in the workspace.

- [ ] **Step 9: Commit**

```bash
git add packages/destination-posthog/package.json packages/destination-posthog/tsconfig.json \
  packages/destination-posthog/src/shared.ts packages/destination-posthog/src/shared.test.ts \
  vitest.config.ts package-lock.json
git commit -m "feat(posthog): scaffold package + shared helpers"
```

---

## Task 2: Server destination — transform

**Files:**
- Create: `packages/destination-posthog/src/server.ts`
- Test: `packages/destination-posthog/src/server.test.ts`

**Interfaces:**
- Consumes (from Task 1): `PostHogBaseConfig`, `getEventName`, `resolveDistinctId`, `isSystemEvent`, `isIdentifyEvent`, `resolveHost`, `buildEventProperties`.
- Produces:
  - `interface PostHogServerConfig extends PostHogBaseConfig { batchSize?: number; flushIntervalMs?: number; maxRetries?: number; }`
  - `interface PostHogCaptureEvent { event: string; distinct_id: string; properties: Record<string, unknown>; timestamp: string; uuid: string; }`
  - `transformServerEvent(event: JctEvent, config: PostHogServerConfig): PostHogCaptureEvent | null` (exported for testing)

- [ ] **Step 1: Write the failing test** — add to `packages/destination-posthog/src/server.test.ts`

```ts
import type { JctEvent } from "@junctionjs/core";
import { describe, expect, it } from "vitest";
import { transformServerEvent } from "./server.js";

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "page",
    action: "viewed",
    properties: {},
    context: {
      page: {
        url: "https://example.com/blog",
        path: "/blog",
        title: "Blog",
        referrer: "https://google.com",
        search: "",
        hash: "",
      },
    },
    user: { anonymousId: "anon-123" },
    timestamp: "2026-06-16T12:00:00.000Z",
    id: "evt-001",
    version: "1.0.0",
    source: { type: "server", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

describe("server transform", () => {
  it("returns null for _system events", () => {
    expect(transformServerEvent(makeEvent({ entity: "_system", action: "init" }), { apiKey: "k" })).toBeNull();
  });

  it("maps a capture event with distinct_id, uuid, timestamp", () => {
    const result = transformServerEvent(makeEvent({ entity: "product", action: "added" }), { apiKey: "k" });
    expect(result).toEqual({
      event: "product_added",
      distinct_id: "anon-123",
      properties: expect.objectContaining({ $current_url: "https://example.com/blog" }),
      timestamp: "2026-06-16T12:00:00.000Z",
      uuid: "evt-001",
    });
  });

  it("prefers userId as distinct_id", () => {
    const result = transformServerEvent(makeEvent({ user: { anonymousId: "a", userId: "u" } }), { apiKey: "k" });
    expect(result?.distinct_id).toBe("u");
  });

  it("maps user:identified to a $identify event with $anon_distinct_id and $set", () => {
    const event = makeEvent({
      entity: "user",
      action: "identified",
      user: { anonymousId: "anon-123", userId: "user-9", traits: { email: "a@b.co" } },
    });
    const result = transformServerEvent(event, { apiKey: "k" });
    expect(result?.event).toBe("$identify");
    expect(result?.distinct_id).toBe("user-9");
    expect(result?.properties.$anon_distinct_id).toBe("anon-123");
    expect(result?.properties.$set).toEqual({ email: "a@b.co" });
  });

  it("applies eventNameMap override", () => {
    const result = transformServerEvent(makeEvent({ entity: "order", action: "completed" }), {
      apiKey: "k",
      eventNameMap: { "order:completed": "purchase" },
    });
    expect(result?.event).toBe("purchase");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/destination-posthog/src/server.test.ts`
Expected: FAIL — cannot resolve `./server.js`.

- [ ] **Step 3: Implement the transform in `packages/destination-posthog/src/server.ts`**

```ts
/**
 * @junctionjs/destination-posthog — server (cloud-mode)
 *
 * Forwards Junction events to PostHog's HTTP capture API. No browser
 * signals, no session replay, no feature flags, no client sessionization.
 * The "just get events into my PostHog dataset" path.
 */

import type { Destination, JctEvent } from "@junctionjs/core";
import {
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  type PostHogBaseConfig,
  resolveDistinctId,
  resolveHost,
} from "./shared.js";

export interface PostHogServerConfig extends PostHogBaseConfig {
  /** Buffer up to this many events, then POST to /batch. 1 = send each event to /capture. Default 20. */
  batchSize?: number;

  /** Flush the buffer at least this often (ms). Default 5000. */
  flushIntervalMs?: number;

  /** Retry a failed flush this many times with exponential backoff. Default 3. */
  maxRetries?: number;
}

export interface PostHogCaptureEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
  uuid: string;
}

export function transformServerEvent(event: JctEvent, config: PostHogServerConfig): PostHogCaptureEvent | null {
  if (isSystemEvent(event)) return null;

  const distinctId = resolveDistinctId(event);

  if (isIdentifyEvent(event)) {
    return {
      event: "$identify",
      distinct_id: distinctId,
      properties: {
        $anon_distinct_id: event.user.anonymousId,
        ...(event.user.traits ? { $set: event.user.traits } : {}),
      },
      timestamp: event.timestamp,
      uuid: event.id,
    };
  }

  return {
    event: getEventName(event, config.eventNameMap),
    distinct_id: distinctId,
    properties: buildEventProperties(event, { $lib: "junction-server" }),
    timestamp: event.timestamp,
    uuid: event.id,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run packages/destination-posthog/src/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/destination-posthog/src/server.ts packages/destination-posthog/src/server.test.ts
git commit -m "feat(posthog): server transform (capture + \$identify)"
```

---

## Task 3: Server destination — send, batching, retry, factory

> **Amendment (post-review, 2026-09-04):** The Task 3 reviewer flagged three
> reliability defects in the flush/retry design *as originally specified below*.
> Adjudicated with the maintainer → fix all three, so the code below is
> superseded on these points:
> 1. **No silent data loss.** `flush()` requeues its batch on an exhausted-retry
>    failure instead of discarding it. A new `maxBufferSize` config (default 1000)
>    bounds memory, dropping + logging oldest events past the cap — mirroring
>    core's consent-queue guardrails.
> 2. **Timer-flush failures always log.** The `setInterval` flush no longer gates
>    its error log behind `config.debug` (that path runs outside the collector's
>    `send()` wrapper, so a swallowed error would be invisible).
> 3. **Non-retryable 4xx short-circuit.** `postWithRetry` retries only 429 + 5xx;
>    a 401/400/422 throws immediately (`isRetryableStatus`).
>
> See `packages/destination-posthog/src/server.ts` for the shipped implementation.

**Files:**
- Modify: `packages/destination-posthog/src/server.ts`
- Test: `packages/destination-posthog/src/server.test.ts` (add describe blocks)

**Interfaces:**
- Consumes: everything from Task 2, plus `resolveHost` from Task 1.
- Produces:
  - `createPostHogServer(config: PostHogServerConfig): Destination<PostHogServerConfig>`
  - Destination shape: `name: "posthog-server"`, `runtime: "server"`, `consent: config.consent ?? ["analytics"]`.
  - Behavior: `init` validates `apiKey`; `transform` = `transformServerEvent`; `send` buffers and flushes to `/batch/` (or `/capture/` when `batchSize <= 1`); `teardown` flushes remaining buffer.

- [ ] **Step 1: Write the failing tests** — add to `packages/destination-posthog/src/server.test.ts`

```ts
import { beforeEach, vi } from "vitest";
import { createPostHogServer } from "./server.js";

describe("server factory", () => {
  it("has correct defaults", () => {
    const dest = createPostHogServer({ apiKey: "phc_test" });
    expect(dest.name).toBe("posthog-server");
    expect(dest.runtime).toBe("server");
    expect(dest.consent).toEqual(["analytics"]);
  });

  it("throws on init when apiKey missing", () => {
    const dest = createPostHogServer({ apiKey: "" });
    expect(() => dest.init({} as any)).toThrow("apiKey is required");
  });

  it("honors a custom consent config", () => {
    const dest = createPostHogServer({ apiKey: "k", consent: ["analytics", "marketing"] });
    expect(dest.consent).toEqual(["analytics", "marketing"]);
  });
});

describe("server send", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs a single event to /capture when batchSize is 1", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "phc_test", batchSize: 1 });
    dest.init({} as any);
    const payload = dest.transform(makeEvent({ entity: "product", action: "added" }), {} as any);
    await dest.send(payload, {} as any);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/capture/");
    const body = JSON.parse(options.body);
    expect(body.api_key).toBe("phc_test");
    expect(body.event).toBe("product_added");
  });

  it("buffers events and flushes to /batch when batchSize is reached", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "phc_test", batchSize: 2 });
    dest.init({} as any);

    await dest.send(dest.transform(makeEvent({ entity: "a", action: "x" }), {} as any), {} as any);
    expect(mockFetch).not.toHaveBeenCalled(); // buffered, not yet flushed

    await dest.send(dest.transform(makeEvent({ entity: "b", action: "y" }), {} as any), {} as any);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/batch/");
    const body = JSON.parse(options.body);
    expect(body.batch).toHaveLength(2);
  });

  it("teardown flushes a partial buffer", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "phc_test", batchSize: 10 });
    dest.init({} as any);
    await dest.send(dest.transform(makeEvent({ entity: "a", action: "x" }), {} as any), {} as any);
    expect(mockFetch).not.toHaveBeenCalled();

    await dest.teardown?.();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).batch).toHaveLength(1);
  });

  it("uses the EU host when configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", host: "https://eu.i.posthog.com", batchSize: 1 });
    dest.init({} as any);
    await dest.send(dest.transform(makeEvent(), {} as any), {} as any);
    expect(mockFetch.mock.calls[0][0]).toBe("https://eu.i.posthog.com/capture/");
  });

  it("retries on failure then throws after maxRetries", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("boom") });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", batchSize: 1, maxRetries: 2 });
    dest.init({} as any);
    await expect(dest.send(dest.transform(makeEvent(), {} as any), {} as any)).rejects.toThrow("500");
    // initial attempt + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/destination-posthog/src/server.test.ts`
Expected: FAIL — `createPostHogServer` is not exported.

- [ ] **Step 3: Implement send + factory — append to `packages/destination-posthog/src/server.ts`**

```ts
const BACKOFF_BASE_MS = 100;

async function postWithRetry(
  url: string,
  apiKey: string,
  batch: PostHogCaptureEvent[],
  single: boolean,
  maxRetries: number,
): Promise<void> {
  const body = single
    ? JSON.stringify({ api_key: apiKey, ...batch[0] })
    : JSON.stringify({ api_key: apiKey, batch });

  let attempt = 0;
  // total attempts = 1 + maxRetries
  while (true) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (response.ok) return;
      const text = await response.text();
      throw new Error(`[Junction:posthog-server] POST ${url} returned ${response.status}: ${text}`);
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      attempt += 1;
      // exponential backoff: 100ms, 200ms, 400ms, ...
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_BASE_MS * 2 ** (attempt - 1)));
    }
  }
}

/**
 * Create a server-side (cloud-mode) PostHog destination.
 *
 * @example
 * ```ts
 * import { createPostHogServer } from "@junctionjs/destination-posthog";
 * const dest = createPostHogServer({ apiKey: "phc_...", host: "https://eu.i.posthog.com" });
 * ```
 */
export function createPostHogServer(config: PostHogServerConfig): Destination<PostHogServerConfig> {
  const host = resolveHost(config.host);
  const batchSize = config.batchSize ?? 20;
  const flushIntervalMs = config.flushIntervalMs ?? 5000;
  const maxRetries = config.maxRetries ?? 3;

  let buffer: PostHogCaptureEvent[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const single = batchSize <= 1;
    const url = single ? `${host}/capture/` : `${host}/batch/`;
    await postWithRetry(url, config.apiKey, batch, single, maxRetries);
  }

  return {
    name: "posthog-server",
    description: "PostHog (server / cloud-mode)",
    version: "0.1.0",
    consent: config.consent ?? ["analytics"],
    runtime: "server",

    init() {
      if (!config.apiKey) {
        throw new Error("[Junction:posthog-server] apiKey is required");
      }
      if (batchSize > 1 && !timer) {
        timer = setInterval(() => {
          void flush().catch((err) => {
            if (config.debug) console.error("[Junction:posthog-server] scheduled flush failed:", err);
          });
        }, flushIntervalMs);
        // Do not keep the Node process alive solely for the flush timer.
        (timer as { unref?: () => void }).unref?.();
      }
    },

    transform(event: JctEvent) {
      return transformServerEvent(event, config);
    },

    async send(payload: unknown) {
      buffer.push(payload as PostHogCaptureEvent);
      if (buffer.length >= batchSize) {
        await flush();
      }
    },

    async teardown() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      await flush();
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/destination-posthog/src/server.test.ts`
Expected: PASS. (The retry test exercises real `setTimeout` backoff of ~100ms + 200ms; it completes well under Vitest's default timeout.)

- [ ] **Step 5: Commit**

```bash
git add packages/destination-posthog/src/server.ts packages/destination-posthog/src/server.test.ts
git commit -m "feat(posthog): server send with batching, retry, and factory"
```

---

## Task 4: Web destination — transform

**Files:**
- Create: `packages/destination-posthog/src/web.ts`
- Test: `packages/destination-posthog/src/web.test.ts`

**Interfaces:**
- Consumes (Task 1): `PostHogBaseConfig`, `getEventName`, `isSystemEvent`, `isIdentifyEvent`, `buildEventProperties`.
- Produces:
  - `interface PostHogWebConfig extends PostHogBaseConfig { loadScript?: boolean; scriptUrl?: string; sessionReplay?: boolean; autocapture?: boolean; capturePageview?: boolean; }`
  - `type WebPayload = { type: "capture"; name: string; properties: Record<string, unknown> } | { type: "identify"; distinctId: string; traits?: Record<string, unknown> };`
  - `transformWebEvent(event: JctEvent, config: PostHogWebConfig): WebPayload | null` (exported for testing)

- [ ] **Step 1: Write the failing test** — `packages/destination-posthog/src/web.test.ts`

```ts
import type { JctEvent } from "@junctionjs/core";
import { describe, expect, it } from "vitest";
import { transformWebEvent } from "./web.js";

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "page",
    action: "viewed",
    properties: {},
    context: {
      page: {
        url: "https://example.com/blog",
        path: "/blog",
        title: "Blog",
        referrer: "https://google.com",
        search: "",
        hash: "",
      },
    },
    user: { anonymousId: "anon-123" },
    timestamp: "2026-06-16T12:00:00.000Z",
    id: "evt-001",
    version: "1.0.0",
    source: { type: "client", name: "browser", version: "0.0.0" },
    ...overrides,
  };
}

describe("web transform", () => {
  it("returns null for _system events", () => {
    expect(transformWebEvent(makeEvent({ entity: "_system", action: "init" }), { apiKey: "k" })).toBeNull();
  });

  it("maps a capture event", () => {
    const result = transformWebEvent(makeEvent({ entity: "product", action: "added" }), { apiKey: "k" });
    expect(result).toEqual({
      type: "capture",
      name: "product_added",
      properties: expect.objectContaining({ $current_url: "https://example.com/blog" }),
    });
  });

  it("maps user:identified to an identify payload", () => {
    const event = makeEvent({
      entity: "user",
      action: "identified",
      user: { anonymousId: "anon-123", userId: "user-9", traits: { email: "a@b.co" } },
    });
    const result = transformWebEvent(event, { apiKey: "k" });
    expect(result).toEqual({ type: "identify", distinctId: "user-9", traits: { email: "a@b.co" } });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/destination-posthog/src/web.test.ts`
Expected: FAIL — cannot resolve `./web.js`.

- [ ] **Step 3: Implement the transform in `packages/destination-posthog/src/web.ts`**

```ts
/**
 * @junctionjs/destination-posthog — web (device-mode)
 *
 * Loads posthog-js on the page and routes Junction's tracked events
 * through posthog.capture(). Junction stays the event source of truth:
 * posthog-js autocapture / capture_pageview are OFF by default.
 */

import type { ConsentState, Destination, JctEvent } from "@junctionjs/core";
import {
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  type PostHogBaseConfig,
  resolveDistinctId,
} from "./shared.js";

export interface PostHogWebConfig extends PostHogBaseConfig {
  /** Inject the posthog-js snippet. Default true. */
  loadScript?: boolean;

  /** Override the snippet URL (reverse proxy / self-hosted). */
  scriptUrl?: string;

  /** Enable session replay. Default false (heavy + privacy-sensitive). */
  sessionReplay?: boolean;

  /** Let posthog-js autocapture clicks/inputs on its own. Default false. */
  autocapture?: boolean;

  /** Let posthog-js fire its own pageviews. Default false (Junction owns page:viewed). */
  capturePageview?: boolean;
}

export type WebPayload =
  | { type: "capture"; name: string; properties: Record<string, unknown> }
  | { type: "identify"; distinctId: string; traits?: Record<string, unknown> };

export function transformWebEvent(event: JctEvent, config: PostHogWebConfig): WebPayload | null {
  if (isSystemEvent(event)) return null;

  if (isIdentifyEvent(event)) {
    return { type: "identify", distinctId: resolveDistinctId(event), traits: event.user.traits };
  }

  return {
    type: "capture",
    name: getEventName(event, config.eventNameMap),
    properties: buildEventProperties(event, { $lib: "junction-web" }),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run packages/destination-posthog/src/web.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/destination-posthog/src/web.ts packages/destination-posthog/src/web.test.ts
git commit -m "feat(posthog): web transform (capture + identify intents)"
```

---

## Task 5: Web destination — loader, send, consent, factory

> **Amendment (post-review, 2026-09-04):** Review of the implementation below
> surfaced two plan-mandated defects; adjudicated with the maintainer → fix both,
> so the code below is superseded on these points:
> 1. **`loadSnippet` never created `window.posthog`.** As written it only injects
>    `array.js`, so `init()`'s `getPostHog()?.init(...)` short-circuits and posthog
>    never initializes in a real browser — and every `capture`/`identify` before the
>    async script loads (including the first `page:viewed`) is dropped. Fixed by
>    installing PostHog's official queuing stub (the queue-before-load pattern
>    `.claude/rules/destinations.md` requires); `array.js` replays the queue on load.
> 2. **`onConsent` only opted out.** Re-granting analytics consent was a no-op.
>    Fixed to call `opt_in_capturing()` on `analytics === true` (consent-first).
>
> Deferred (not fixed): missing-`apiKey` validation is inside the `window` guard,
> so SSR misconfig no-ops silently until client mount — low value, folded into a
> later cross-destination validation pass. See `src/web.ts` for the shipped code.

**Files:**
- Modify: `packages/destination-posthog/src/web.ts`
- Test: `packages/destination-posthog/src/web.test.ts` (add describe blocks)

**Interfaces:**
- Consumes: everything from Task 4, plus `resolveHost` from Task 1.
- Produces:
  - `createPostHogWeb(config: PostHogWebConfig): Destination<PostHogWebConfig>`
  - Destination shape: `name: "posthog-web"`, `runtime: "client"`, `consent: config.consent ?? ["analytics"]`.
  - Behavior: `init` guards SSR, loads snippet (unless `loadScript === false` or already present), calls `posthog.init(apiKey, options)` with autocapture/pageview off; `send` routes to `posthog.capture()` / `posthog.identify()`; `onConsent` calls `posthog.opt_out_capturing()` when analytics is revoked.
- The tests provide a fake `window.posthog` so no real script loads.

- [ ] **Step 1: Write the failing tests** — add to `packages/destination-posthog/src/web.test.ts`

```ts
import { afterEach, beforeEach, vi } from "vitest";
import { createPostHogWeb } from "./web.js";

interface FakePostHog {
  init: ReturnType<typeof vi.fn>;
  capture: ReturnType<typeof vi.fn>;
  identify: ReturnType<typeof vi.fn>;
  opt_out_capturing: ReturnType<typeof vi.fn>;
  __loaded: boolean;
}

function installFakePostHog(): FakePostHog {
  const fake: FakePostHog = {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    opt_out_capturing: vi.fn(),
    __loaded: true,
  };
  vi.stubGlobal("window", { posthog: fake });
  return fake;
}

describe("web factory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has correct defaults", () => {
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    expect(dest.name).toBe("posthog-web");
    expect(dest.runtime).toBe("client");
    expect(dest.consent).toEqual(["analytics"]);
  });

  it("no-ops init in SSR (no window)", () => {
    vi.stubGlobal("window", undefined);
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    expect(() => dest.init({} as any)).not.toThrow();
  });

  it("inits posthog with autocapture and pageview off by default", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    expect(fake.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
      }),
    );
  });

  it("enables autocapture/pageview/replay when opted in", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({
      apiKey: "phc_test",
      autocapture: true,
      capturePageview: true,
      sessionReplay: true,
    });
    dest.init({} as any);
    const opts = fake.init.mock.calls[0][1];
    expect(opts.autocapture).toBe(true);
    expect(opts.capture_pageview).toBe(true);
    expect(opts.disable_session_recording).toBe(false);
  });
});

describe("web send", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes a capture payload to posthog.capture", async () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    const payload = dest.transform(makeEvent({ entity: "product", action: "added" }), {} as any);
    await dest.send(payload, {} as any);
    expect(fake.capture).toHaveBeenCalledWith("product_added", expect.objectContaining({ $lib: "junction-web" }));
  });

  it("routes an identify payload to posthog.identify", async () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    const event = makeEvent({
      entity: "user",
      action: "identified",
      user: { anonymousId: "anon-1", userId: "user-9", traits: { email: "a@b.co" } },
    });
    await dest.send(dest.transform(event, {} as any), {} as any);
    expect(fake.identify).toHaveBeenCalledWith("user-9", { $set: { email: "a@b.co" } });
  });
});

describe("web consent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opts out of capturing when analytics consent is revoked", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    dest.onConsent?.({ analytics: false } as any);
    expect(fake.opt_out_capturing).toHaveBeenCalled();
  });

  it("does not opt out while analytics consent is granted", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    dest.onConsent?.({ analytics: true } as any);
    expect(fake.opt_out_capturing).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/destination-posthog/src/web.test.ts`
Expected: FAIL — `createPostHogWeb` is not exported.

- [ ] **Step 3: Implement loader + send + factory — append to `packages/destination-posthog/src/web.ts`**

Add `resolveHost` to the existing import from `./shared.js`, then append:

```ts
interface PostHogJs {
  init: (apiKey: string, options: Record<string, unknown>) => void;
  capture: (name: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  opt_out_capturing: () => void;
  __loaded?: boolean;
}

function getPostHog(): PostHogJs | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { posthog?: PostHogJs }).posthog;
}

/** Inject the posthog-js snippet with an array stub that queues calls until the script loads. */
function loadSnippet(scriptUrl: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { posthog?: PostHogJs; document?: Document };
  if (w.posthog?.__loaded) return;

  const doc = w.document;
  if (!doc) return;
  if (doc.querySelector(`script[src="${scriptUrl}"]`)) return;

  const script = doc.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  const first = doc.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);
}

/**
 * Create a client-side (device-mode) PostHog destination.
 *
 * @example
 * ```ts
 * import { createPostHogWeb } from "@junctionjs/destination-posthog";
 * const dest = createPostHogWeb({ apiKey: "phc_...", sessionReplay: true });
 * ```
 */
export function createPostHogWeb(config: PostHogWebConfig): Destination<PostHogWebConfig> {
  const apiHost = resolveHost(config.host);
  const scriptUrl = config.scriptUrl ?? `${apiHost}/static/array.js`;

  return {
    name: "posthog-web",
    description: "PostHog (web / device-mode)",
    version: "0.1.0",
    consent: config.consent ?? ["analytics"],
    runtime: "client",

    init() {
      if (typeof window === "undefined") return; // SSR guard
      if (!config.apiKey) {
        throw new Error("[Junction:posthog-web] apiKey is required");
      }
      if (config.loadScript !== false) {
        loadSnippet(scriptUrl);
      }
      const posthog = getPostHog();
      posthog?.init(config.apiKey, {
        api_host: apiHost,
        autocapture: config.autocapture ?? false,
        capture_pageview: config.capturePageview ?? false,
        capture_pageleave: config.capturePageview ?? false,
        disable_session_recording: !(config.sessionReplay ?? false),
      });
    },

    transform(event: JctEvent) {
      return transformWebEvent(event, config);
    },

    async send(payload: unknown) {
      const posthog = getPostHog();
      if (!posthog) return; // script not loaded yet / SSR
      const p = payload as WebPayload;
      if (p.type === "identify") {
        posthog.identify(p.distinctId, p.traits ? { $set: p.traits } : undefined);
      } else {
        posthog.capture(p.name, p.properties);
      }
    },

    onConsent(state: ConsentState) {
      if (state.analytics === false) {
        getPostHog()?.opt_out_capturing();
      }
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/destination-posthog/src/web.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/destination-posthog/src/web.ts packages/destination-posthog/src/web.test.ts
git commit -m "feat(posthog): web loader, send routing, and consent opt-out"
```

---

## Task 6: Barrel export + full build/lint/typecheck verification

**Files:**
- Create: `packages/destination-posthog/src/index.ts`
- Create: `packages/destination-posthog/src/index.test.ts`
- Create: `packages/destination-posthog/README.md`

**Interfaces:**
- Consumes: `createPostHogServer`, `PostHogServerConfig` (Task 3); `createPostHogWeb`, `PostHogWebConfig` (Task 5); `PostHogBaseConfig` (Task 1).
- Produces: the package's public API surface.

- [ ] **Step 1: Write the failing test** — `packages/destination-posthog/src/index.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { createPostHogServer, createPostHogWeb } from "./index.js";

describe("index barrel", () => {
  it("exports both factories", () => {
    expect(typeof createPostHogWeb).toBe("function");
    expect(typeof createPostHogServer).toBe("function");
    expect(createPostHogWeb({ apiKey: "k" }).runtime).toBe("client");
    expect(createPostHogServer({ apiKey: "k" }).runtime).toBe("server");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run packages/destination-posthog/src/index.test.ts`
Expected: FAIL — cannot resolve `./index.js`.

- [ ] **Step 3: Implement `packages/destination-posthog/src/index.ts`**

```ts
/**
 * @junctionjs/destination-posthog
 *
 * PostHog destination for Junction, offered as two tree-shakeable factories:
 * - createPostHogWeb   — device-mode: loads posthog-js, full browser signals
 * - createPostHogServer — cloud-mode: forwards events to PostHog's HTTP API
 *
 * Import only the one you need; the other is eliminated by tree-shaking.
 */

export { type PostHogBaseConfig, POSTHOG_DEFAULT_HOST } from "./shared.js";
export { createPostHogServer, type PostHogServerConfig } from "./server.js";
export { createPostHogWeb, type PostHogWebConfig } from "./web.js";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run packages/destination-posthog/src/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `packages/destination-posthog/README.md`**

````markdown
# @junctionjs/destination-posthog

PostHog destination for Junction, offered as two tree-shakeable factories mirroring
the web (device-mode) vs server (cloud-mode) split.

- **`createPostHogWeb`** — loads `posthog-js` on the page. Full library: sessionization,
  person profiles, session replay, feature flags, browser-signal enrichment. Junction stays
  the event source of truth (autocapture/pageview off by default).
- **`createPostHogServer`** — forwards events to PostHog's HTTP capture API. No replay, flags,
  or client sessionization. The "just get events into my dataset" path.

Import only the one you need — the other is eliminated by tree-shaking. `posthog-js` is loaded
from PostHog's CDN at runtime, never bundled.

## Install

```bash
npm install @junctionjs/destination-posthog
```

## Web (device-mode)

```ts
import { createPostHogWeb } from "@junctionjs/destination-posthog";

const posthogWeb = createPostHogWeb({
  apiKey: "phc_...",
  host: "https://us.i.posthog.com", // or eu.i.posthog.com / self-hosted
  sessionReplay: false,             // opt in when you want replay
});
```

## Server (cloud-mode)

```ts
import { createPostHogServer } from "@junctionjs/destination-posthog";

const posthogServer = createPostHogServer({
  apiKey: "phc_...",
  batchSize: 20,        // buffer then POST to /batch; 1 = per-event /capture
  flushIntervalMs: 5000,
  maxRetries: 3,
});
```

## Configuration

| Option | Web | Server | Default | Notes |
|---|---|---|---|---|
| `apiKey` | ✓ | ✓ | — | PostHog project API key (required) |
| `host` | ✓ | ✓ | `https://us.i.posthog.com` | EU cloud or self-hosted URL |
| `consent` | ✓ | ✓ | `["analytics"]` | Consent categories (AND logic) |
| `eventNameMap` | ✓ | ✓ | — | Override `entity:action` → PostHog event name |
| `loadScript` | ✓ | — | `true` | Inject the posthog-js snippet |
| `scriptUrl` | ✓ | — | `${host}/static/array.js` | Reverse-proxy / self-host override |
| `sessionReplay` | ✓ | — | `false` | Enable session recording |
| `autocapture` | ✓ | — | `false` | Let posthog-js autocapture on its own |
| `capturePageview` | ✓ | — | `false` | Junction owns `page:viewed` by default |
| `batchSize` | — | ✓ | `20` | Buffer size before flush to `/batch` |
| `flushIntervalMs` | — | ✓ | `5000` | Max time between flushes |
| `maxRetries` | — | ✓ | `3` | Retries with exponential backoff |
````

- [ ] **Step 6: Build the package**

Run: `npm run build --workspace @junctionjs/destination-posthog`
Expected: tsup emits `dist/index.js` and `dist/index.d.ts` with no errors.

- [ ] **Step 7: Typecheck, lint, and run the full suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck clean; Biome reports no errors; all tests pass (the existing 179 plus the new PostHog tests).

- [ ] **Step 8: Commit**

```bash
git add packages/destination-posthog/src/index.ts packages/destination-posthog/src/index.test.ts \
  packages/destination-posthog/README.md
git commit -m "feat(posthog): barrel export, README, build verification"
```

---

## Task 7: Document the identity-projection convention

**Files:**
- Modify: `.claude/rules/destinations.md`

**Interfaces:** none (docs only). This is the spec's "convention introduced by this spec" deliverable.

- [ ] **Step 1: Add an Identity section to `.claude/rules/destinations.md`**

Insert this section immediately after the "## Event Name Mapping" section (before "## Script Loading"):

```markdown
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
| `anonymousId` | `client_id` | `device_id` | `distinct_id` (while anonymous) |
| `userId` | `user_id` | `user_id` | `distinct_id` after merge + `$identify` |
| `traits` | `user_properties` | `user_properties` | person props via `$set` |
| `user:identified` | no-op (carries `user_id`) | no-op (carries `user_id`) | `posthog.identify()` / `$identify` w/ `$anon_distinct_id` |
| `event.id` | — | `insert_id` | `uuid` |

**Every destination must decide how it handles `user:identified`.** Parallel-fields vendors
(GA4, Amplitude) carry `device_id` + `user_id` on every event and can no-op it. Merge/alias
vendors (PostHog) must act on it to stitch anonymous history to the known person.

> **Known gap (tracked):** `UserIdentity` has no `sessionId`; GA4/Amplitude do not yet map
> `session_id`/`$session_id`. Cross-destination follow-up, not owned by any single destination.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/destinations.md
git commit -m "docs(rules): add identity-projection convention for destinations"
```

---

## Task 8: Docs page, overview row, demo wiring, changeset

**Files:**
- Create: `apps/docs/src/content/docs/destinations/posthog.mdx`
- Modify: `apps/docs/src/content/docs/destinations/overview.mdx`
- Modify: demo app destination registration (locate first — see Step 3)
- Create: `.changeset/posthog-destination.md`

**Interfaces:** none (docs/demo/release).

- [ ] **Step 1: Create the docs page** — `apps/docs/src/content/docs/destinations/posthog.mdx`

First open `apps/docs/src/content/docs/destinations/plausible.mdx` to copy its frontmatter shape (title/description keys), then write:

```mdx
---
title: PostHog
description: Send Junction events to PostHog — web (device-mode) or server (cloud-mode).
---

`@junctionjs/destination-posthog` offers two tree-shakeable factories mirroring the
device-mode vs cloud-mode split. Import only the one you need.

## Web (device-mode)

Loads `posthog-js` on the page for the full library — sessionization, person profiles,
session replay, feature flags, browser-signal enrichment. Junction stays the event source of
truth: `posthog-js` autocapture and pageview capture are **off by default**.

```ts
import { createPostHogWeb } from "@junctionjs/destination-posthog";

const posthogWeb = createPostHogWeb({
  apiKey: "phc_...",
  host: "https://us.i.posthog.com",
  sessionReplay: false,
});
```

## Server (cloud-mode)

Forwards events to PostHog's HTTP capture API. No replay, flags, or client sessionization —
the "just get events into my dataset" path. Buffers and flushes to `/batch` with retry.

```ts
import { createPostHogServer } from "@junctionjs/destination-posthog";

const posthogServer = createPostHogServer({
  apiKey: "phc_...",
  batchSize: 20,
  maxRetries: 3,
});
```

## Consent

Both default to `consent: ["analytics"]` and only initialize after consent resolves — no
consent means `posthog-js` never loads and no cookies are set. Session replay stays under
`analytics`; treat it as sensitive.

## Identity

Junction's canonical identity maps onto PostHog's single `distinct_id`: anonymous events use
`anonymousId`; after `identify()` the destination emits `$identify` (server) or calls
`posthog.identify()` (web) to stitch prior anonymous history to the known person.
```

- [ ] **Step 2: Add a PostHog row to `overview.mdx`**

Open `apps/docs/src/content/docs/destinations/overview.mdx`, find the list/table of
destinations, and add a PostHog entry consistent with the existing rows (link to
`/destinations/posthog`, note "web + server"). Match the surrounding markup exactly.

- [ ] **Step 3: Wire the demo app**

Run: `grep -rn "destination-plausible\|destination-amplitude\|createPostHog\|plausible(\|amplitude" apps/demo/src`
to find where destinations are registered in the demo. Add a `createPostHogServer` (and/or
`createPostHogWeb`) registration alongside the existing ones, following the same shape. Add
`"@junctionjs/destination-posthog": "*"` to `apps/demo/package.json` dependencies if the demo
imports by package name. If no destinations are registered in the demo yet, skip this step and
note it in the commit body.

- [ ] **Step 4: Create the changeset** — `.changeset/posthog-destination.md`

```markdown
---
"@junctionjs/destination-posthog": minor
---

Add PostHog destination with web (device-mode) and server (cloud-mode) factories.

`createPostHogWeb` loads posthog-js for full browser signals; `createPostHogServer` forwards
events to PostHog's HTTP capture API with batching and retry. Junction stays the event source
of truth (autocapture/pageview off by default). Establishes the canonical identity-projection
convention in the destination rules.
```

- [ ] **Step 5: Build docs + verify everything once more**

Run: `npm run build && npm test`
Expected: docs site builds; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/content/docs/destinations/posthog.mdx \
  apps/docs/src/content/docs/destinations/overview.mdx \
  apps/demo .changeset/posthog-destination.md
git commit -m "docs(posthog): destination page, overview row, demo wiring, changeset"
```

---

## Self-Review

**Spec coverage:**
- Two destinations, web + server → Tasks 4–5 (web), 2–3 (server) ✓
- One package, two tree-shakeable factories → `sideEffects: false` (Task 1), barrel (Task 6) ✓
- posthog-js via script snippet, not bundled → `loadSnippet` (Task 5), no `posthog-js` dependency in package.json (Task 1) ✓
- Conservative init posture (autocapture/pageview/replay off) → Task 5 init + tests ✓
- Identity projection + `user:identified` handling → server `$identify` (Task 2), web `identify` (Tasks 4–5), rule doc (Task 7) ✓
- Config surface (base + web + server) → Tasks 1, 3, 4 ✓
- Event-name mapping (3-tier, `$pageview` default) → Task 1 ✓
- `_system` filtering → Tasks 2, 4 ✓
- distinct_id precedence → Task 1 `resolveDistinctId`, tested in 2 & 4 ✓
- Server batching (/capture vs /batch), retry/backoff → Task 3 ✓
- Consent default `["analytics"]`, revocation opt-out → Tasks 3, 5 ✓
- Error isolation (throw on failure, `[Junction:*]` prefix) → Tasks 3, 5 ✓
- Testing (server fetch mock, web posthog stub, shared units) → Tasks 1–6 ✓
- Deliverables: package + tests, docs page, demo wiring, rule convention, changeset → Tasks 1–8 ✓
- Out-of-scope items (GA4/Amplitude retrofit, session-ID gap, npm-import mode, flag wrapper) → left out; session-ID gap noted in Task 7 rule doc ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Task 8 Step 3 (demo wiring) is a discovery step with an exact grep command and an explicit fallback, not a placeholder.

**Type consistency:** `PostHogBaseConfig` (Task 1) extended by `PostHogServerConfig` (Task 2/3) and `PostHogWebConfig` (Task 4). `transformServerEvent`/`transformWebEvent` names consistent between definition and factory use. `resolveDistinctId`, `getEventName`, `buildEventProperties`, `resolveHost`, `isSystemEvent`, `isIdentifyEvent` defined in Task 1 and consumed with matching signatures in Tasks 2–5. `WebPayload` / `PostHogCaptureEvent` shapes consistent between transform (produce) and send (consume).
```
