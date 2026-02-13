# Junction Architecture

**A next-generation, Git-native event collection and routing system.**

Built for teams migrating away from proprietary tag managers (Adobe Launch, Google Tag Manager) toward a developer-owned, code-first analytics infrastructure.

---

## Design Principles

**Events are the primitive, not tags.** Traditional TMS thinking says "fire a tag when a condition is met." Junction inverts this: you emit typed events, and destinations decide what to do with them. This decouples instrumentation from vendor-specific concerns and makes consent gating, schema validation, and destination hot-swapping possible.

**One global, not two.** walkerOS puts both `window.elb` and `window.walker` on the page. Junction exposes a single `window.jct` (configurable) that IS the collector. Track events, manage consent, identify users — all from one object.

**Config-as-code, not config-as-UI-state.** Your entire analytics configuration lives in TypeScript files under version control. Environment-specific settings use standard patterns (env vars, conditional logic). Changes go through PRs, get reviewed, and deploy via CI/CD. This solves the Adobe Launch "Latest" problem and GTM's opaque workspace model.

**Consent is a first-class state machine.** Not an afterthought bolted on via GTM Consent Mode or fragmented Launch point-solutions. Events queue while consent is pending, then flush with updated user properties when consent resolves. Every destination declares its consent requirements. DNT and GPC are respected by default.

**Schema validation catches errors before they reach destinations.** Define contracts per entity+action pair using Zod. Invalid events are caught at the source, not discovered weeks later when a funnel breaks. This is the single biggest gap in every existing TMS.

**Runtime-agnostic.** The core runs anywhere JavaScript runs. The client package adds browser specifics. The gateway package runs on any WinterCG-compatible edge runtime (Cloudflare Workers, Deno Deploy, Vercel Edge, Bun).

---

## Package Architecture

```
@junctionjs/
├── core/                  # Isomorphic core (types, collector, consent, validation)
│   └── src/
│       ├── types.ts       # The entire type system
│       ├── collector.ts   # Event collector (the runtime engine)
│       ├── consent.ts     # Consent state machine + event queue
│       ├── validation.ts  # Zod-based schema validation
│       └── index.ts       # Public exports
│
├── client/                # Browser-specific wrapper
│   └── src/
│       └── index.ts       # DOM context, session, anon ID, auto page views
│
├── astro/                 # Astro v5+ integration
│   └── src/
│       ├── index.ts       # Astro integration (injectScript, addMiddleware)
│       ├── middleware.ts   # SSR middleware (session, geo, IP enrichment)
│       └── collect-endpoint.ts  # Server-side /api/collect route
│
├── gateway/               # Edge runtime forward proxy
│   └── src/
│       └── index.ts       # WinterCG-compatible request handler
│
├── destination-amplitude/ # Amplitude (Browser SDK + HTTP API)
├── destination-ga4/       # Google Analytics 4 (gtag + Measurement Protocol)
└── destination-meta/      # Meta Pixel + Conversions API
```

---

## Data Flow

### Client-Side Flow

```
Developer calls               Event is           Consent          Destinations
tp.track("product","added")   validated via      gate checks      transform and
        │                     Zod contract       consent state    send to vendor
        │                         │                  │                │
        ▼                         ▼                  ▼                ▼
┌─────────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐
│  track()    │→ │ Validator  │→ │ Consent  │→ │   Buffer     │→ │  Send    │
│  identify() │  │ (Zod)     │  │ Manager  │  │  (batch)     │  │ (async)  │
│  consent()  │  │           │  │          │  │              │  │          │
└─────────────┘  └───────────┘  └──────────┘  └──────────────┘  └──────────┘
                      │              │                                │
                 invalid events   pending events                sends to:
                 are dropped      are queued                    - Amplitude
                 (strict) or      until consent                 - GA4 (gtag)
                 warned (lenient) resolves                      - Meta Pixel
```

### Server-Side Flow (Gateway)

```
Client POSTs to         Gateway enriches       Server-side destinations
/api/collect            with IP, geo, UA       (no client-side secrets)
      │                       │                       │
      ▼                       ▼                       ▼
┌───────────┐  ┌────────────────┐  ┌────────────────────────────┐
│  Client   │→ │   Gateway      │→ │  Server Destinations       │
│  Browser  │  │  (Edge Worker) │  │  - Amplitude HTTP API      │
│           │  │  + IP/Geo      │  │  - Meta Conversions API    │
│           │  │  + Session     │  │  - BigQuery / Warehouse    │
└───────────┘  └────────────────┘  └────────────────────────────┘
```

### Astro-Specific Flow

```
1. Build time:
   astro.config.mjs → tagpilot() integration → injects scripts + middleware

2. SSR request:
   Request → Middleware (session, geo) → Page render → Response

3. Client hydration:
   before-hydration script → createClient() → window.jct ready

4. View Transitions:
   astro:page-load event → tp.track("page","viewed") → destinations
```

---

## Consent Architecture

### State Machine

```
                    ┌─────────┐
          Initial → │ PENDING │ ← No explicit choice yet
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌───────────┐        ┌───────────┐
        │  GRANTED  │        │  DENIED   │
        └───────────┘        └───────────┘
              │                     │
              └──────────┬──────────┘
                         ▼
                  Can change at any time
                  (user updates preferences)
```

### Event Queuing

When consent is pending (user hasn't interacted with the CMP yet), events are queued in memory. When consent state changes:

1. Queued events are replayed to newly-permitted destinations
2. User properties on queued events are updated (identity may have changed)
3. Destinations receive an `onConsent()` callback to sync their own consent state (e.g., Google Consent Mode v2)

### Consent Categories

| Category          | Description                         | Example Destinations  |
|-------------------|-------------------------------------|-----------------------|
| `necessary`       | Always allowed                      | Error tracking        |
| `analytics`       | Site usage analytics                | Amplitude, GA4        |
| `marketing`       | Advertising and retargeting         | Meta Pixel, Google Ads|
| `personalization` | Content personalization             | Optimizely, LaunchDarkly |
| `social`          | Social media features               | Share widgets          |

---

## Schema Validation

### Contract Definition

```typescript
import { z } from "zod";
import { schemas } from "@junctionjs/core";

// This contract says: "product:added events MUST have these fields,
// with these types, or they get dropped before reaching any destination."
const productAddedContract = {
  entity: "product",
  action: "added",
  version: "1.0.0",
  mode: "strict",  // "strict" = drop invalid, "lenient" = warn + pass
  schema: z.object({
    product_id: z.string().min(1),
    name: z.string().min(1),
    price: z.number().nonnegative(),
    currency: z.string().length(3),
    quantity: z.number().int().positive(),
  }),
};
```

### What This Prevents

| Scenario | Without Validation | With Junction |
|---|---|---|
| Dev pushes `addToCart` instead of `product:added` | Amplitude funnel breaks silently | Build-time type error + runtime validation |
| Price sent as string `"19.99"` | Amplitude coerces unpredictably | Zod catches it, event dropped or coerced |
| Missing `product_id` | GA4 event fires without item_id | Contract rejects, logged as validation error |
| New dev forgets `currency` field | Revenue reports show $0 | Strict mode blocks the event |

---

## Destination Plugin Interface

Writing a custom destination requires implementing ONE interface with THREE required fields:

```typescript
const myDestination: Destination<MyConfig> = {
  name: "my-service",
  version: "1.0.0",
  consent: ["analytics"],        // required consent categories
  runtime: "client",             // "client" | "server" | "both"

  init(config) { },              // setup (load SDKs, etc.)
  transform(event) { },          // convert JctEvent → vendor format
  send(payload, config) { },     // deliver to vendor API

  // Optional:
  onConsent(state) { },          // react to consent changes
  teardown() { },                // cleanup on shutdown
};
```

The `transform` function replaces walkerOS's "mapping" DSL. It's just TypeScript — you can use whatever logic you want, including conditional mapping, default values, property renaming, or filtering events entirely (return `null` to skip).

---

## Git-Based Workflow

### Branch Strategy (Maps to Your Original Vision)

```
main (production)
├── staging          ← PR from feature branches
│   ├── feature/add-amplitude
│   ├── feature/update-consent-categories
│   └── fix/ga4-purchase-event-mapping
└── dev              ← experimental / local testing
```

### CI/CD Pipeline

```yaml
# .github/workflows/tagpilot.yml
name: Junction Deploy

on:
  push:
    branches: [main, staging]
    paths: ['config/**', 'packages/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run typecheck          # TypeScript catches config errors
      - run: npm run test:contracts     # Validate all event contracts
      - run: npm run test:destinations  # Test destination transforms

  deploy-gateway:
    needs: validate
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npx wrangler deploy        # Deploy gateway to Cloudflare Workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_TOKEN }}

  deploy-site:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - run: npm run build              # Astro build (includes Junction client)
      - run: npx wrangler pages deploy  # Deploy to Cloudflare Pages (or Vercel, Netlify)
```

### What This Solves

| Problem (from your doc) | Junction Solution |
|---|---|
| Launch saves to "Latest", breaking prod | Changes require PR + review + merge to main |
| GTM workspace model is unintuitive | Standard Git branches, standard PR workflow |
| No validation in Launch | Zod contracts + CI/CD type checking |
| Consent is "figure it out" | First-class consent state machine, per-destination gating |
| Closed source, can't debug | Everything is TypeScript you own |
| Team collaboration is hard | Git — the collaboration tool developers already know |

---

## Astro v5+ Integration Details

### View Transitions

The biggest gotcha with Astro analytics: View Transitions don't fire `DOMContentLoaded` on navigation. Junction handles this by:

1. Injecting at `before-hydration` (runs before islands activate)
2. Listening to `astro:page-load` (fires on initial load AND every View Transition)
3. Deduplicating the initial page view (client tracks it; View Transition listener skips first fire)

### Middleware (Server-Side Enrichment)

The Astro middleware runs on every SSR request and extracts:
- Client IP (from `cf-connecting-ip`, `x-forwarded-for`, etc.)
- Geo data (from Cloudflare/Vercel headers)
- User agent, referrer, accept-language
- Session ID (managed via HttpOnly cookie)

This data is available in `Astro.locals.junction` and forwarded to the gateway.

### Experimental CSP Support

Astro 5.9+ supports automatic CSP hash generation for inline scripts. Junction's injected scripts are compatible — no `unsafe-inline` needed.

---

## Comparison to Existing Solutions

| Feature | Junction | walkerOS | RudderStack | GTM | Adobe Launch |
|---|---|---|---|---|---|
| **Config model** | TypeScript in Git | JSON/TS in code | TOML config | GUI + JSON export | GUI + "Library" |
| **Version control** | Native Git | Manual | Manual | Workspaces | "Latest" lol |
| **CI/CD** | GitHub Actions | None | Docker/K8s | None | None |
| **Consent** | State machine + queue | State machine + queue | Transformations | Consent Mode (opaque) | "Figure it out" |
| **Schema validation** | Zod contracts | Basic event validation | Via transformations | None | None |
| **Window globals** | 1 (`jct`) | 2 (`elb`, `walker`) | 1 (`rudderanalytics`) | 2+ (`dataLayer`, `gtag`) | 1 (`_satellite`) |
| **Edge gateway** | WinterCG (any runtime) | Node.js | Go server (heavy) | Java container (heavy) | Proprietary |
| **Astro support** | First-class integration | None | JS SDK (manual) | Script tag | Script tag |
| **Team model** | Git PRs | N/A | N/A | Workspaces | "Latest" |
| **License** | MIT | MIT | Apache 2.0 | Proprietary | Proprietary |
| **Operational cost** | Edge function (~$0) | Self-managed | K8s cluster ($$$) | Free (Google-owned) | $$$$ |

---

## Migration Path: Adobe Analytics → Amplitude

For your specific client engagement:

### Phase 1: Parallel Tracking (Weeks 1-2)
- Deploy Junction alongside existing Adobe Launch
- Configure Amplitude destination (client-side)
- Map existing Adobe events to Junction event taxonomy
- Validate with contracts that data quality matches Adobe

### Phase 2: Add Destinations (Weeks 3-4)
- Add GA4 destination (replacing any existing GA setup)
- Add Meta Pixel + CAPI destination
- Deploy gateway for server-side event forwarding
- Set up consent management with existing CMP

### Phase 3: Cut Over (Week 5)
- Remove Adobe Launch container script
- Junction becomes the sole event collection layer
- Adobe contract ends, no dependency remains

### Phase 4: Optimize (Ongoing)
- Add schema contracts for all critical events
- Set up CI/CD validation pipeline
- Add monitoring/alerting for destination errors
- Iterate on event taxonomy

---

## What's Not Built Yet (Roadmap)

1. **Rules Engine** — Auto-emit events based on URL/DOM/cookie conditions (your original doc's concept). Currently events are emitted manually via `jct.track()`. The rules engine would add declarative auto-tracking.

2. **CMP Integrations** — Pre-built adapters for OneTrust, Cookiebot, Usercentrics that automatically sync consent state to Junction.

3. **Debug Panel** — Browser devtools panel showing real-time event flow, consent state, destination status. Replaces GTM Preview Mode and the AEP Debugger.

4. **Event Replay** — Record events in staging, replay against production destination configs to test changes without live traffic.

5. **Monitoring Dashboard** — Production health monitoring: destination error rates, event volumes, validation failures. Optional — could be a simple Grafana/Datadog integration.

6. **More Destinations** — Google Ads, LinkedIn Insight, TikTok Pixel, Pinterest Tag, Snowflake, BigQuery, S3/R2, Webhook (generic HTTP).
