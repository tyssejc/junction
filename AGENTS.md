# AGENTS.md — Junction integration guide

This file is for **AI coding agents** and **human developers** adding [Junction](https://github.com/tyssejc/junction) to an application. Junction is a **config-as-code** event pipeline: **`track(entity, action, properties)`** → validation → consent → destinations.

**Canonical references in this repo**

| Document | Use |
|----------|-----|
| [`README.md`](README.md) | Overview, quick start, destination stub template |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Data flow, consent semantics, package layout |
| [`docs/spec-react-ga4.md`](docs/spec-react-ga4.md) | React + GA4 end-to-end spec |
| [`config/junction.config.ts`](config/junction.config.ts) | Example typed config, contracts, env switching |

---

## 1. Mental model (non-negotiables)

1. **Events are the primitive** — `entity` + `action` (e.g. `product` / `viewed`), not opaque tag names. Destinations map these to vendor formats.
2. **One collector API** — `track`, `identify`, `consent`, optional `on` listeners. Browser client optionally exposes **`window.jct`** (`globalName`, default `"jct"`).
3. **Consent is a state machine** — pending categories can **queue** events (unless `strictMode`). When consent updates, queued events replay to newly allowed destinations. **`DestinationEntry.consent`** overrides per install; default is on the **`Destination`** object.
4. **Contracts are optional Zod schemas** on **`event.properties`** only — keyed by `entity` + `action` (or `action: "*"` wildcard). Strict = drop invalid events; lenient = warn and still send.
5. **AND semantics for destination consent** — all **required** categories for that destination must be **`true`** (not `undefined`). Plan CMP and `client.consent()` accordingly.

---

## 2. Decision tree: what to install

```
Need analytics in the browser?
├─ No (server-only / edge-only) → createCollector from @junctionjs/core (+ gateway if proxying from clients)
└─ Yes
   ├─ Astro 5+ → @junctionjs/astro (+ destinations, optional @junctionjs/client patterns via integration)
   ├─ Next.js 14+ (App Router) → @junctionjs/next + @junctionjs/client + destinations
   ├─ React SPA / Vite / CRA → @junctionjs/client + destinations (Context provider pattern; see docs/spec-react-ga4.md)
   └─ Non-React browser app → @junctionjs/client + destinations

Need to accept events from the browser to server-side destinations (secrets, enrichment)?
└─ Yes → @junctionjs/gateway (WinterCG) or app-specific API + createCollector on server

Need automatic DOM signals (clicks, scroll, web vitals)?
└─ @junctionjs/auto-collect (pass the collector/client)

Need in-page debugging?
└─ @junctionjs/debug
```

**Minimum packages for a typical marketing site**

- `@junctionjs/client` (browser) **or** `@junctionjs/core` only (isomorphic/server)
- `@junctionjs/core` (types, `createCollector`, `createCmpBridge`, `schemas`) — usually pulled transitively; add explicitly for types
- One or more `@junctionjs/destination-*` packages
- `zod` if you define **`contracts`**

---

## 3. Client vs server vs edge (how to choose)

| Concern | Prefer |
|---------|--------|
| UI engagement, page views, client SDKs (gtag, `fbq`) | **Client** — `@junctionjs/client` or framework glue |
| **Secrets** (Measurement Protocol API secret, CAPI access tokens, server API keys) | **Server or gateway** — never embed in public bundles |
| **IP / geo / raw UA** enrichment | **Server middleware** (Astro), **gateway**, or your API |
| Ad blockers / third-party script reliability | **Dual**: client best-effort + **server** duplicate where vendor supports it (e.g. Meta CAPI + Pixel, GA4 MP + gtag) |
| Edge latency, unified collect URL | **`@junctionjs/gateway`** on Workers / Deno / Vercel Edge / Bun |
| GDPR-strict “no queue before consent” | `consent.strictMode: true` (disables pending queue semantics) |

**`Destination.runtime`** on each plugin is `"client" | "server" | "both"` — match where you register it (browser config vs gateway/server collector).

---

## 4. Framework glue (how to wire)

### 4.1 Browser — `@junctionjs/client`

- **`createClient(ClientConfig)`** wraps **`createCollector`** with:
  - Persistent **anonymousId**, **session**, **page/device/UTM** context
  - **`autoPageView`**: initial `page`/`viewed`, `popstate`, patched `history.pushState`, `astro:page-load`
  - Optional **`beaconUrl`** + `sendBeacon` on hide for collect pipelines
- **React / SPA**: create **once** in `useEffect`, `shutdown()` on unmount, expose via **Context** (same idea as Next provider).

### 4.2 Next.js — `@junctionjs/next`

- **`JunctionProvider`** — `createClient({ ...config, autoPageView: false })` (routing handled separately).
- **`PageTracker`** — inside provider + **`Suspense`**; uses `usePathname` / `useSearchParams`, fires `track("page", "viewed")` on client navigations (skips first mount to reduce double counts).
- **`useJunction()`** — access client from client components.
- Optional **debug** prop mounts `@junctionjs/debug`.

Peers: `next`, `react`, `@junctionjs/client`, `@junctionjs/core`, optional `@junctionjs/debug`.

### 4.3 Astro — `@junctionjs/astro`

- **`junction({ config, ... })`** in `astro.config.mjs`.
- Client **`config.destinations`** use **`package` + `config`** (resolved at build time) — do **not** put server secrets in serialized client config.
- Subpaths: **`@junctionjs/astro/middleware`**, **`@junctionjs/astro/collect-endpoint`** for SSR context and `/api/collect`-style forwarding.
- View Transitions aligned with client auto page view via `astro:page-load`.

### 4.4 Server / edge collect — `@junctionjs/gateway`

- **`createGateway({ destinations, collector, cors, auth, ... })`** → **`handleRequest`** for `fetch` handlers.
- Typical pattern: browser sends events to your worker; gateway runs **server `mode`** destinations with secrets; enrich with IP/UA/geo.
- Collector **`consent`** on gateway often uses **`queueTimeout: 0`** when trust boundary is already server-side — tune per compliance story.

### 4.5 Isomorphic core — `@junctionjs/core`

- **`createCollector({ config, source, resolveContext? })`** when you are not in the browser package (Node scripts, tests, custom SSR, gateway).
- Implement **`resolveContext`** to attach request-derived fields to **`EventContext`**.

---

## 5. Event contracts (Zod)

1. Define **`EventContract[]`**: `{ entity, action, version, schema: z.object(...), mode: "strict" | "lenient" }`.
2. Pass as **`contracts`** on **`CollectorConfig`** (same object used by `createClient`).
3. **Wildcard**: `action: "*"` applies to all actions for that `entity` if no exact key exists (exact wins when both registered — see `packages/core/src/validation.ts`).
4. Reuse **`schemas`** from `@junctionjs/core` (`schemas.product`, `schemas.order`, `schemas.page`, `schemas.userTraits`) to stay consistent.
5. Align **`entity`/`action`** with **destination mappings** (e.g. GA4 recommended events use `page:viewed`, `product:added`, …).

---

## 6. Consent and CMP integration

### 6.1 `ConsentConfig` (on `CollectorConfig.consent`)

- **`defaultState`** — initial categories before CMP runs.
- **`queueTimeout`** — ms to retain queued pending events (`0` = no queue retention by cleanup).
- **`respectDNT` / `respectGPC`** — browser signals downgrade categories on init.
- **`strictMode`** — pending treated as denied for dispatch; **no queuing** for compliance-sensitive deployments.
- **`consentFallback`** — if CMP never loads, apply **`state`** after **`timeout`** ms.
- **`signals`** — **`ConsentSignal[]`**: `init`, `update(state)`, `teardown` for vendor protocols (e.g. Google Consent Mode via `googleConsentMode()` from `@junctionjs/destination-ga4`).

### 6.2 Application code

- Call **`collector.consent({ analytics: true, marketing: false, ... })`** when the user saves preferences or CMP updates.
- **`identify(userId, traits?)`** after login; queued replays attach updated user.

### 6.3 OneTrust — `@junctionjs/cmp-onetrust`

- **`createOneTrustAdapter(collector, { categoryMap?, debug? })`** — browser only; wires **`OneTrustGroupsUpdated`**, **`OptanonWrapper`**, maps **`OnetrustActiveGroups`** → **`ConsentState`** (defaults: C0002 analytics, C0003 personalization, C0004 marketing, C0005 social).
- **`destroy()`** / **`sync()`** for SPA lifecycle.

### 6.4 Other CMPs (Cookiebot, Usercentrics, …)

- Use **`createCmpBridge`** from `@junctionjs/core`: implement **`readState`**, **`subscribe`**, **`mapState`** → **`collector.consent(...)`**. Mirror the OneTrust package pattern.

### 6.5 Vendor-specific consent APIs

- **GA4**: `consentMode: true` on destination **or** `googleConsentMode({ waitForUpdate })` as a **signal**.
- **Meta**: destination handles **`fbq("consent", ...)`** where applicable — see destination README.

---

## 7. Destinations — reference

For each destination, respect **`consent`** (and **override** on `DestinationEntry` if product/legal requires). **`transform` returning `null`** skips the event.

| Package | Role | Default consent (plugin) | Runtime | Notes |
|---------|------|---------------------------|---------|--------|
| `@junctionjs/destination-amplitude` | Amplitude HTTP API | `["analytics"]` | `both` | **`mode: "client" | "server"`**; **`secretKey`** optional server; **`eventNameFormat`**, **`propertyMap`** |
| `@junctionjs/destination-ga4` | GA4 gtag + Measurement Protocol | **`["analytics", "marketing"]`** (AND) | `both` | **`measurementId`** required; **`apiSecret`** for MP; **`consentMode`**; **`sendPageView`** usually `false` if Junction emits `page:viewed`; **`createGA4()`** for isolated instance; **`googleConsentMode()`** signal |
| `@junctionjs/destination-meta` | Pixel + CAPI | `["marketing"]` | `both` | **`pixelId`**; **`accessToken`** server for CAPI; map standard events (PageView, Purchase, …) |
| `@junctionjs/destination-http` | Generic **`http({ url, transform, headers, ... })`** factory | configurable (default `["analytics"]`) | configurable | Use for custom ingest, webhooks, or self-shaped Plausible-style payloads |
| `@junctionjs/destination-plausible` | Plausible Events API | **`["exempt"]`** (consent not required) | **Server-oriented** | **`domain`**; needs UA / forwarded IP from server context; privacy-first |

**Registering in config**

```typescript
destinations: [
  {
    destination: amplitude, // or ga4, meta, http(...), plausible(...)
    config: { /* package-specific */ },
    consent: ["analytics"], // optional override of destination.consent
    enabled: true,
  },
],
```

---

## 8. Optional add-ons

### `@junctionjs/auto-collect`

- **`createAutoCollect(collector, { clicks, scrollDepth, video, formSubmit, engagement, webVitals })`**
- **No separate consent logic** — events go through **`track()`** and destination gating.
- Returns **`destroy()`** for teardown.

### `@junctionjs/debug`

- **`createDebugPanel(client, options)`** or Next **`JunctionProvider` `debug`** prop.
- Inspects events, consent, destination health.

---

## 9. Implementation checklist

1. **Choose glue** (client / Next / Astro / gateway only / hybrid).
2. **List destinations** and **where they run** (client vs server); **never** ship secrets to the browser.
3. **Set `consent`** defaults, **queueTimeout** / **strictMode** / **fallback** per legal.
4. **Wire CMP** → **`consent()`** (OneTrust adapter or **`createCmpBridge`**).
5. **Add vendor consent signals** if using GA4 consent mode / similar.
6. **Define contracts** for high-value events (`strict` in prod recommended).
7. **Use recommended `entity:action`** pairs** for each vendor (see destination source `*_MAP` tables).
8. **Verify** with `@junctionjs/debug`, browser network, vendor realtime/debug tools.
9. **Avoid double page views** (Next: provider + `PageTracker` vs raw `autoPageView`; React Strict Mode dev double mount).

---

## 10. Anti-patterns

- Embedding **API secrets** or **MP secrets** in client bundles.
- **GA4** default destination requires **both** `analytics` and `marketing` **true** — if you only set `analytics`, **no GA4 sends** until marketing is granted unless you **override `consent`** on the entry (understand privacy implications).
- Registering the **same** browser event to **both** gtag’s automatic page_view and Junction **`page:viewed`** without disabling one side (`sendPageView: false` on GA4).
- Assuming **lenient** contracts **fix** bad data — they only warn; destinations still receive raw properties.
- **Ignoring `shutdown()`** in SPAs → leaked listeners / duplicate globals on HMR.

---

## 11. Contributing / extending

- **New vendor**: implement **`Destination<TConfig>`** (`init`, `transform`, `send`, optional `onConsent`, `teardown`) in a new `packages/destination-*` package; see root **`README.md`** stub.
- **New framework**: mirror **Next** (provider + router hook) or **Astro** (integration + middleware + collect route).

When unsure, read **`packages/core/src/collector.ts`** (dispatch pipeline) and **`packages/core/src/consent.ts`** (queue + allow/pending).
