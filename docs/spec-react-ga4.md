# Specification: Junction + GA4 on a React website

This document specifies how to implement **Junction** with the **Google Analytics 4** destination on a **client-rendered or hybrid React** application. It reflects the behavior of `@junctionjs/client` and `@junctionjs/destination-ga4` in this repository.

---

## 1. Goals and scope

| In scope | Out of scope (unless you add it) |
|----------|----------------------------------|
| Browser-side GA4 via **gtag.js** (loaded by Junction if missing) | Next.js App Router (use `@junctionjs/next` + `PageTracker` separately) |
| **Consent** (Junction state machine + optional **Google Consent Mode v2**) | Server-only GA4 (Measurement Protocol) without a collect path |
| **Event naming** (`entity` + `action`) and GA4 **recommended event** mapping | GTM as the primary loader (avoid double GA config) |
| Optional **Zod contracts** for `properties` | Other vendors |

**Stack assumption:** React 18+ (or compatible), any bundler. There is no `@junctionjs/react` package—use **one `createClient` instance** and **React context** (same idea as `JunctionProvider` in `@junctionjs/next`).

---

## 2. Dependencies

```bash
npm install @junctionjs/core @junctionjs/client @junctionjs/destination-ga4 zod
```

- **`zod`** — only if you use **event contracts**.

---

## 3. Configuration requirements

### 3.1 GA4

- **Measurement ID** `G-XXXXXXXXXX` — OK in the client bundle.
- **API secret** — for **Measurement Protocol** only; do **not** ship in a public SPA unless you accept that risk (prefer backend/edge collect).

### 3.2 Collector config

| Field | Purpose |
|-------|---------|
| `name`, `environment` | Identity / environment tagging. |
| `consent` | `ConsentConfig`: `defaultState`, `queueTimeout`, DNT/GPC, optional `strictMode`, `consentFallback`, `signals`. |
| `destinations` | Includes GA4 `DestinationEntry`. |

### 3.3 GA4 destination entry

Use **`ga4`** or **`createGA4()`** from `@junctionjs/destination-ga4`. Typical client setup:

```typescript
import { ga4 } from "@junctionjs/destination-ga4";

{
  destination: ga4,
  config: {
    measurementId: "G-XXXXXXXXXX",
    loadScript: true,        // default; loads gtag if missing
    consentMode: true,       // default consent + updates for Google
    sendPageView: false,     // Junction client emits page_view via page/viewed
  },
  consent: ["analytics", "marketing"],
}
```

The GA4 destination is defined with **`consent: ["analytics", "marketing"]`** — **both** must be granted (AND) before sends. Align CMP updates and `client.consent({ ... })` with that.

---

## 4. Google Consent Mode v2

1. **`consentMode: true`** on GA4 `config` — `init` runs `gtag("consent", "default", …)` before `gtag("config", …)`; `onConsent` runs `gtag("consent", "update", …)` on Junction consent changes.

2. **`googleConsentMode({ waitForUpdate })`** as **`consent.signals`** — for `wait_for_update` or centralized behavior; you can pair with **`consentMode: false`** on the destination if the signal owns updates.

Mapping is implemented in code (Junction categories → `analytics_storage`, `ad_storage`, etc.).

---

## 5. React integration

### 5.1 Lifecycle

- **`createClient(config)` once** per app (e.g. in `useEffect` with `[]`).
- **`client.shutdown()`** on unmount (removes listeners/global, teardown).

### 5.2 Context

Expose `JunctionClient` via **`createContext`** + **`useJunction()`** for `track`, `identify`, `consent`, `getConsent`.

### 5.3 Page views

With **`autoPageView: true`** (default), the client tracks **`page` / `viewed`** on load and on **`popstate`** / **`history.pushState`**. For routers that don’t use the History API, subscribe to route changes and call `client.track("page", "viewed", …)` manually.

### 5.4 `window.jct`

Optional: `globalName: "jct"`. Use `globalName: false` to avoid a global.

---

## 6. Events and GA4 mapping

- API: **`track(entity, action, properties?)`**.

Built-in examples (see `packages/destination-ga4/src/index.ts`):

| Junction | GA4 |
|----------|-----|
| `page:viewed` | `page_view` |
| `product:viewed` | `view_item` |
| `product:added` | `add_to_cart` |
| `product:list_viewed` | `view_item_list` |
| `checkout:started` | `begin_checkout` |
| `order:completed` | `purchase` |

Unmapped pairs become **`{entity}_{action}`** unless **`eventNameMap`** overrides. **`parameterMap`** overrides default property renames (e.g. `product_id` → `item_id`).

For **`items[]`** on ecommerce events, validate against GA4 docs; you may need **`parameterMap`** or custom payload shapes.

---

## 7. Zod contracts

Pass **`contracts: EventContract[]`** on the client config. **Strict** drops bad events; **lenient** warns and still sends; **no contract** allows any shape for that `entity`+`action`.

---

## 8. Identity

- **`client.identify(userId, traits?)`** — sets user; GA4 uses **`user_id`** and **`anonymousId`** as **`client_id`**.

---

## 9. CMP checklist

1. Configure **`defaultState`**, **`queueTimeout`**, **`strictMode`**, **`consentFallback`** as required.
2. On CMP choice, call **`client.consent({ analytics, marketing, ... })`**.
3. For stock GA4, grant **both** `analytics` and `marketing` if you want events to flow under default destination consent.

---

## 10. Verification

- **`debug: true`** on collector config; optional **`@junctionjs/debug`** panel.
- Browser network + GA4 **DebugView**.

---

## 11. Provider skeleton

```tsx
import { createClient, type ClientConfig, type JunctionClient } from "@junctionjs/client";
import { ga4 } from "@junctionjs/destination-ga4";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const JunctionContext = createContext<JunctionClient | null>(null);

export function useJunction(): JunctionClient {
  const client = useContext(JunctionContext);
  if (!client) throw new Error("useJunction must be used within JunctionProvider");
  return client;
}

export function JunctionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<JunctionClient | null>(null);

  useEffect(() => {
    const config: ClientConfig = {
      name: "my-react-app",
      environment: import.meta.env.MODE,
      consent: {
        defaultState: {},
        queueTimeout: 30_000,
        respectDNT: true,
        respectGPC: true,
      },
      destinations: [
        {
          destination: ga4,
          config: {
            measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
            consentMode: true,
            sendPageView: false,
          },
          consent: ["analytics", "marketing"],
        },
      ],
      globalName: "jct",
      autoPageView: true,
    };

    const instance = createClient(config);
    setClient(instance);
    return () => {
      void instance.shutdown();
      setClient(null);
    };
  }, []);

  if (!client) return null;
  return <JunctionContext.Provider value={client}>{children}</JunctionContext.Provider>;
}
```

---

## 12. Revision

| Version | Notes |
|---------|--------|
| 1.0 | Initial React + GA4 spec |
