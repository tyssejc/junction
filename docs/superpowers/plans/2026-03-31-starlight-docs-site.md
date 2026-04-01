# Starlight Docs Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a Starlight docs site at `apps/docs/`, migrate existing user-facing content, and create stubs for destination/integration pages.

**Architecture:** Astro 5 + Starlight in the existing monorepo. Content pages in `src/content/docs/` as MDX. Sidebar configured manually in `astro.config.mjs`. Builds via Turborepo alongside the demo app.

**Tech Stack:** Astro 5, @astrojs/starlight, MDX, TypeScript

---

### Task 1: Scaffold Starlight project

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/astro.config.mjs`
- Create: `apps/docs/tsconfig.json`

- [ ] **Step 1: Create `apps/docs/package.json`**

```json
{
  "name": "@junctionjs/docs",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/starlight": "^0.34.0",
    "sharp": "^0.33.0"
  }
}
```

- [ ] **Step 2: Create `apps/docs/astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Junction",
      description:
        "Developer-native event collection and routing for scaling teams.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/tyssejc/junction",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/tyssejc/junction/edit/main/apps/docs/",
      },
      sidebar: [
        { label: "What is Junction?", slug: "index" },
        {
          label: "Getting Started",
          items: [{ slug: "getting-started/quickstart" }],
        },
        {
          label: "Concepts",
          items: [
            { slug: "concepts/events" },
            { slug: "concepts/consent" },
            { slug: "concepts/validation" },
            { slug: "concepts/architecture" },
          ],
        },
        {
          label: "Destinations",
          items: [
            { slug: "destinations/overview" },
            { slug: "destinations/ga4" },
            { slug: "destinations/amplitude" },
            { slug: "destinations/meta" },
            { slug: "destinations/plausible" },
            { slug: "destinations/http" },
          ],
        },
        {
          label: "Integrations",
          items: [
            { slug: "integrations/nextjs" },
            { slug: "integrations/astro" },
          ],
        },
        {
          label: "Product",
          items: [
            { slug: "product/mission" },
            { slug: "product/roadmap" },
          ],
        },
      ],
    }),
  ],
});
```

- [ ] **Step 3: Create `apps/docs/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install --workspace=apps/docs`
Expected: Dependencies installed, `node_modules` populated.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/package.json apps/docs/astro.config.mjs apps/docs/tsconfig.json package-lock.json
git commit -m "chore: scaffold Starlight docs site at apps/docs"
```

---

### Task 2: Create landing page and quickstart

**Files:**
- Create: `apps/docs/src/content/docs/index.mdx`
- Create: `apps/docs/src/content/docs/getting-started/quickstart.mdx`

- [ ] **Step 1: Create `apps/docs/src/content/docs/index.mdx`**

```mdx
---
title: What is Junction?
description: Developer-native event collection and routing for scaling teams.
template: splash
hero:
  tagline: More control than a tag manager. Less overhead than a CDP.
  actions:
    - text: Get Started
      link: /getting-started/quickstart/
      icon: right-arrow
      variant: primary
    - text: View on GitHub
      link: https://github.com/tyssejc/junction
      icon: external
      variant: minimal
---

import { Card, CardGrid } from "@astrojs/starlight/components";

## Why Junction?

Junction is a TypeScript event collection layer for scaling technical teams. Config-as-code, consent-first, isomorphic, destination-agnostic.

<CardGrid>
  <Card title="Config as code" icon="pencil">
    Tracking configuration lives in TypeScript, reviewed in PRs, deployed
    through CI/CD. No opaque UIs or workspace mysteries.
  </Card>
  <Card title="Typed events" icon="approve-check">
    Zod schema contracts enforce event shapes at runtime, catching data quality
    issues at the source — not weeks later when a funnel breaks.
  </Card>
  <Card title="Consent-first" icon="warning">
    A first-class consent state machine queues events until consent resolves,
    with per-destination gating and DNT/GPC respected by default.
  </Card>
  <Card title="Runs anywhere" icon="rocket">
    The same collector runs in browsers, Node.js, Deno, Cloudflare Workers, and
    Bun. One implementation, every runtime.
  </Card>
</CardGrid>

## Who is it for?

Technical growth-stage startups and scaling companies that are:

- Engineering-led or product-led
- Beyond "just install GA4" but not ready for full CDP complexity
- Running multiple analytics and marketing destinations
- Interested in code-first, AI-friendly development workflows

## How it works

All events use a typed entity:action model:

```typescript
import { createClient } from "@junctionjs/client";

const jct = createClient({
  destinations: [ga4, amplitude, meta],
  consent: { default: "pending" },
});

// Entity:action — not flat strings
jct.track("product", "viewed", {
  product_id: "SKU-123",
  name: "Junction T-Shirt",
  price: 29.99,
  currency: "USD",
});
```

Destinations transform and deliver events independently. Consent gates control which destinations receive data. Schema contracts validate every event before it leaves the client.
```

- [ ] **Step 2: Create `apps/docs/src/content/docs/getting-started/quickstart.mdx`**

```mdx
---
title: Quickstart
description: Install Junction and fire your first event in under 5 minutes.
---

## Install

```bash
npm install @junctionjs/client @junctionjs/core
```

Add a destination — for example, GA4:

```bash
npm install @junctionjs/destination-ga4
```

## Configure

Create a Junction configuration file:

```typescript
// lib/junction.ts
import { createClient } from "@junctionjs/client";
import { ga4 } from "@junctionjs/destination-ga4";

export const jct = createClient({
  destinations: [
    {
      destination: ga4,
      config: {
        measurementId: "G-XXXXXXXXXX",
        sendPageView: false,
      },
      consent: ["analytics"],
    },
  ],
  consent: {
    default: "pending",
  },
});
```

## Track events

Use the entity:action model to track events:

```typescript
import { jct } from "./lib/junction";

// Page view
jct.track("page", "viewed");

// User action
jct.track("product", "added", {
  product_id: "SKU-123",
  name: "Junction T-Shirt",
  price: 29.99,
  currency: "USD",
});
```

## Manage consent

Update consent state when a user interacts with your consent banner:

```typescript
jct.consent({
  analytics: "granted",
  marketing: "denied",
});
```

Events queued while consent was pending are automatically flushed to permitted destinations.

## Add the debug panel

```bash
npm install @junctionjs/debug
```

Enable it in your config:

```typescript
const jct = createClient({
  debug: true, // shows the in-page debug panel
  // ... rest of config
});
```

Press `Ctrl+Shift+J` to toggle the debug panel and inspect events in real time.

## Next steps

- [Events](/concepts/events/) — understand the entity:action model
- [Consent](/concepts/consent/) — how the consent state machine works
- [Validation](/concepts/validation/) — add schema contracts
- [Destinations](/destinations/overview/) — see all available destinations
```

- [ ] **Step 3: Verify the site builds**

Run: `npm run build --workspace=apps/docs`
Expected: Build succeeds, output in `apps/docs/dist/`.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/index.mdx apps/docs/src/content/docs/getting-started/quickstart.mdx
git commit -m "docs: add landing page and quickstart guide"
```

---

### Task 3: Create concept pages

**Files:**
- Create: `apps/docs/src/content/docs/concepts/events.mdx`
- Create: `apps/docs/src/content/docs/concepts/consent.mdx`
- Create: `apps/docs/src/content/docs/concepts/validation.mdx`
- Create: `apps/docs/src/content/docs/concepts/architecture.mdx`

- [ ] **Step 1: Create `apps/docs/src/content/docs/concepts/events.mdx`**

```mdx
---
title: Events
description: Junction's entity:action event model.
---

## Entity:Action Model

Junction uses a structured event model where every event has an **entity** and an **action**:

```typescript
jct.track("product", "viewed", { product_id: "SKU-123" });
//         ^^^^^^    ^^^^^^
//         entity    action
```

This is different from flat event strings like `view_item` or `addToCart`. The entity:action model gives you:

- **Consistent naming** — events are always `entity:action`, never ambiguous
- **Schema validation** — define contracts per entity+action pair
- **Destination mapping** — each destination translates to its own naming convention

## Common Events

| Entity | Action | Description |
|--------|--------|-------------|
| `page` | `viewed` | Page view |
| `product` | `viewed` | Product detail view |
| `product` | `added` | Added to cart |
| `order` | `completed` | Purchase completed |
| `form` | `submitted` | Form submission |
| `cta` | `clicked` | Call-to-action click |

## Properties

The third argument to `track()` is a properties object. Properties are passed to destinations after transformation:

```typescript
jct.track("product", "viewed", {
  product_id: "SKU-123",
  name: "Junction T-Shirt",
  price: 29.99,
  currency: "USD",
  category: "Apparel",
});
```

## System Events

The `_system` entity is reserved for internal lifecycle events (initialization, consent changes, errors). Destinations automatically filter system events — you don't need to handle them.

## Identity

Use `identify()` to associate events with a user:

```typescript
jct.identify("user-123", {
  email: "user@example.com",
  plan: "pro",
});
```

Anonymous IDs are generated automatically and persist across sessions via localStorage.
```

- [ ] **Step 2: Create `apps/docs/src/content/docs/concepts/consent.mdx`**

```mdx
---
title: Consent
description: Junction's consent state machine and event queuing.
---

## Consent-First Design

Consent in Junction is not an afterthought bolted onto an existing system. It's a first-class state machine that controls event flow from the moment the collector initializes.

## State Machine

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

Every consent category starts in a configurable default state (typically `pending`). Events are queued until consent resolves.

## Consent Categories

| Category | Description | Example Destinations |
|----------|-------------|---------------------|
| `necessary` | Always allowed | Error tracking |
| `analytics` | Site usage analytics | Amplitude, GA4 |
| `marketing` | Advertising and retargeting | Meta Pixel, Google Ads |
| `personalization` | Content personalization | Optimizely, LaunchDarkly |
| `social` | Social media features | Share widgets |

## Event Queuing

When consent is pending:

1. Events are queued in memory (with configurable size limits)
2. When consent resolves, queued events are replayed to permitted destinations
3. User properties on queued events are updated (identity may have changed since queuing)
4. Destinations receive an `onConsent()` callback to sync their own consent state

## Setting Consent

```typescript
// From your CMP callback or consent banner
jct.consent({
  analytics: "granted",
  marketing: "denied",
  personalization: "granted",
});
```

## Per-Destination Consent

Each destination declares which consent categories it requires:

```typescript
{
  destination: ga4,
  config: { measurementId: "G-XXXXXXXXXX" },
  consent: ["analytics"],  // requires analytics consent
}
```

A destination only receives events when **all** its required categories are granted (AND logic).

## DNT and GPC

Junction respects `Do Not Track` and `Global Privacy Control` signals by default. When these signals are detected, marketing and analytics consent categories are automatically denied.
```

- [ ] **Step 3: Create `apps/docs/src/content/docs/concepts/validation.mdx`**

```mdx
---
title: Validation
description: Zod-based schema contracts for event data quality.
---

## Why Validate?

Without validation, data quality issues are discovered weeks later when a funnel breaks, a report shows $0 revenue, or a destination silently drops malformed events. Junction catches these at the source.

## Schema Contracts

Define contracts per entity+action pair using Zod:

```typescript
import { z } from "zod";

const schemas = {
  "product:added": {
    version: "1.0.0",
    mode: "strict",
    schema: z.object({
      product_id: z.string().min(1),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      currency: z.string().length(3),
      quantity: z.number().int().positive(),
    }),
  },
};
```

## Validation Modes

| Mode | Invalid Event Behavior |
|------|----------------------|
| `strict` | Event is dropped, error logged |
| `lenient` | Warning logged, event passes through |

Use `strict` for critical events (purchases, sign-ups) and `lenient` during development or for non-critical events.

## What This Prevents

| Scenario | Without Validation | With Junction |
|----------|-------------------|---------------|
| `addToCart` instead of `product:added` | Funnel breaks silently | Type error + runtime validation |
| Price sent as string `"19.99"` | Destination coerces unpredictably | Zod catches it |
| Missing `product_id` | GA4 event fires without item_id | Contract rejects, logged |
| New dev forgets `currency` field | Revenue reports show $0 | Strict mode blocks the event |

## Adding Contracts to Your Config

```typescript
import { createClient } from "@junctionjs/client";

const jct = createClient({
  schemas,
  destinations: [/* ... */],
});
```

Events without a matching contract pass through unvalidated. Add contracts incrementally — start with your most critical events.
```

- [ ] **Step 4: Create `apps/docs/src/content/docs/concepts/architecture.mdx`**

Migrate from `docs/ARCHITECTURE.md`. This is the largest content page — include the full architecture document with Starlight frontmatter added. Copy the content from `docs/ARCHITECTURE.md` verbatim, adding only the frontmatter:

```mdx
---
title: Architecture
description: Junction's system design, data flow, and package structure.
---
```

Then paste the full content of `docs/ARCHITECTURE.md` starting from the first paragraph (skip the H1 title since Starlight generates it from frontmatter).

- [ ] **Step 5: Verify build**

Run: `npm run build --workspace=apps/docs`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/content/docs/concepts/
git commit -m "docs: add concept pages — events, consent, validation, architecture"
```

---

### Task 4: Create destination stubs

**Files:**
- Create: `apps/docs/src/content/docs/destinations/overview.mdx`
- Create: `apps/docs/src/content/docs/destinations/ga4.mdx`
- Create: `apps/docs/src/content/docs/destinations/amplitude.mdx`
- Create: `apps/docs/src/content/docs/destinations/meta.mdx`
- Create: `apps/docs/src/content/docs/destinations/plausible.mdx`
- Create: `apps/docs/src/content/docs/destinations/http.mdx`

- [ ] **Step 1: Create `apps/docs/src/content/docs/destinations/overview.mdx`**

```mdx
---
title: Destinations Overview
description: How Junction destinations work and how to configure them.
---

## What is a Destination?

A destination is a plugin that receives events from Junction and delivers them to an external service (analytics platform, ad network, warehouse, etc.). Each destination implements three functions:

- **`init(config)`** — set up the destination (load vendor SDKs, etc.)
- **`transform(event, config)`** — convert a Junction event into the vendor's format
- **`send(payload, config)`** — deliver the transformed event

## Available Destinations

| Destination | Package | Runtime |
|-------------|---------|---------|
| [Google Analytics 4](/destinations/ga4/) | `@junctionjs/destination-ga4` | Client + Server |
| [Amplitude](/destinations/amplitude/) | `@junctionjs/destination-amplitude` | Client + Server |
| [Meta Pixel + CAPI](/destinations/meta/) | `@junctionjs/destination-meta` | Client + Server |
| [Plausible](/destinations/plausible/) | `@junctionjs/destination-plausible` | Client |
| [HTTP (Generic)](/destinations/http/) | `@junctionjs/destination-http` | Server |

## Configuration

Every destination follows the same pattern in your Junction config:

```typescript
{
  destination: ga4,           // the destination factory
  config: {                   // destination-specific settings
    measurementId: "G-XXXXXXXXXX",
  },
  consent: ["analytics"],     // required consent categories (AND logic)
}
```

## Event Name Mapping

Destinations use a 3-tier fallback for event names:

1. **Config override** — `config.eventNameMap["product:viewed"]`
2. **Default map** — built-in mapping per destination
3. **Generated name** — `entity_action` format

```typescript
{
  destination: ga4,
  config: {
    measurementId: "G-XXXXXXXXXX",
    eventNameMap: {
      "product:viewed": "view_item",   // explicit override
      "cta:clicked": "my_custom_event", // custom mapping
    },
  },
}
```

## System Events

The `_system` entity is reserved for internal lifecycle events. All destinations automatically filter these — you don't need to handle them.

## Writing a Custom Destination

See the [Contributing guide](https://github.com/tyssejc/junction/blob/main/CONTRIBUTING.md) for the full guide to writing a new destination.
```

- [ ] **Step 2: Create `apps/docs/src/content/docs/destinations/ga4.mdx`**

```mdx
---
title: Google Analytics 4
description: GA4 destination for Junction — client-side via gtag.js and server-side via Measurement Protocol.
---

## Install

```bash
npm install @junctionjs/destination-ga4
```

## Usage

```typescript
import { ga4 } from "@junctionjs/destination-ga4";

{
  destination: ga4,
  config: {
    measurementId: "G-XXXXXXXXXX",
    consentMode: true,
    sendPageView: false,
  },
  consent: ["analytics"],
}
```

## Features

- Client-side via gtag.js (loaded lazily if not present)
- Server-side via GA4 Measurement Protocol
- Google Consent Mode v2 — automatically maps Junction consent state to Google's consent signals
- GA4 recommended event mapping (`view_item`, `add_to_cart`, `purchase`, etc.)
- Custom event name and parameter overrides

## Default Event Mapping

| Junction Event | GA4 Event |
|---------------|-----------|
| `page:viewed` | `page_view` |
| `product:viewed` | `view_item` |
| `product:added` | `add_to_cart` |
| `order:completed` | `purchase` |

Full documentation coming soon.
```

- [ ] **Step 3: Create `apps/docs/src/content/docs/destinations/amplitude.mdx`**

```mdx
---
title: Amplitude
description: Amplitude destination for Junction — client-side via Browser SDK and server-side via HTTP API.
---

## Install

```bash
npm install @junctionjs/destination-amplitude
```

## Usage

```typescript
import { amplitude } from "@junctionjs/destination-amplitude";

{
  destination: amplitude,
  config: {
    apiKey: "YOUR_AMPLITUDE_API_KEY",
  },
  consent: ["analytics"],
}
```

## Features

- Client-side via Amplitude Browser SDK
- Server-side via Amplitude HTTP API v2
- Automatic user and session mapping
- Custom event name and property overrides

## Default Event Mapping

| Junction Event | Amplitude Event |
|---------------|----------------|
| `page:viewed` | `Page Viewed` |
| `product:viewed` | `Product Viewed` |
| `product:added` | `Product Added` |
| `order:completed` | `Order Completed` |

Full documentation coming soon.
```

- [ ] **Step 4: Create `apps/docs/src/content/docs/destinations/meta.mdx`**

```mdx
---
title: Meta Pixel + CAPI
description: Meta destination for Junction — client-side via Meta Pixel and server-side via Conversions API.
---

## Install

```bash
npm install @junctionjs/destination-meta
```

## Usage

```typescript
import { meta } from "@junctionjs/destination-meta";

{
  destination: meta,
  config: {
    pixelId: "YOUR_PIXEL_ID",
    accessToken: "YOUR_ACCESS_TOKEN", // for CAPI
  },
  consent: ["marketing"],
}
```

## Features

- Client-side via Meta Pixel (`fbq`)
- Server-side via Conversions API (CAPI)
- Event deduplication between Pixel and CAPI
- Standard Meta event mapping

## Default Event Mapping

| Junction Event | Meta Event |
|---------------|------------|
| `page:viewed` | `PageView` |
| `product:viewed` | `ViewContent` |
| `product:added` | `AddToCart` |
| `order:completed` | `Purchase` |

Full documentation coming soon.
```

- [ ] **Step 5: Create `apps/docs/src/content/docs/destinations/plausible.mdx`**

```mdx
---
title: Plausible
description: Plausible Analytics destination for Junction.
---

## Install

```bash
npm install @junctionjs/destination-plausible
```

## Usage

```typescript
import { plausible } from "@junctionjs/destination-plausible";

{
  destination: plausible,
  config: {
    domain: "your-site.com",
  },
  consent: ["analytics"],
}
```

## Features

- Client-side event tracking via Plausible script
- Privacy-focused — no cookies by default
- Custom event and property support

Full documentation coming soon.
```

- [ ] **Step 6: Create `apps/docs/src/content/docs/destinations/http.mdx`**

```mdx
---
title: HTTP (Generic)
description: Generic HTTP destination for sending events to any endpoint.
---

## Install

```bash
npm install @junctionjs/destination-http
```

## Usage

```typescript
import { http } from "@junctionjs/destination-http";

{
  destination: http,
  config: {
    url: "https://your-api.com/events",
    headers: {
      Authorization: "Bearer YOUR_TOKEN",
    },
  },
  consent: ["analytics"],
}
```

## Features

- Send events to any HTTP endpoint
- Configurable headers, method, and body format
- Useful for custom backends, warehouses, or webhooks

Full documentation coming soon.
```

- [ ] **Step 7: Verify build**

Run: `npm run build --workspace=apps/docs`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/src/content/docs/destinations/
git commit -m "docs: add destination pages — overview + GA4, Amplitude, Meta, Plausible, HTTP stubs"
```

---

### Task 5: Create integration stubs

**Files:**
- Create: `apps/docs/src/content/docs/integrations/nextjs.mdx`
- Create: `apps/docs/src/content/docs/integrations/astro.mdx`

- [ ] **Step 1: Create `apps/docs/src/content/docs/integrations/nextjs.mdx`**

```mdx
---
title: Next.js
description: Junction integration for Next.js applications.
---

## Install

```bash
npm install @junctionjs/next @junctionjs/client @junctionjs/core
```

## Usage

```typescript
import { createClient } from "@junctionjs/client";
import { ga4 } from "@junctionjs/destination-ga4";

const jct = createClient({
  destinations: [
    {
      destination: ga4,
      config: { measurementId: "G-XXXXXXXXXX" },
      consent: ["analytics"],
    },
  ],
});
```

See the [demo app](https://github.com/tyssejc/junction/tree/main/apps/demo) for a full Next.js reference implementation.

Full documentation coming soon.
```

- [ ] **Step 2: Create `apps/docs/src/content/docs/integrations/astro.mdx`**

```mdx
---
title: Astro
description: Junction integration for Astro v5+ with View Transitions support.
---

## Install

```bash
npm install @junctionjs/astro @junctionjs/client @junctionjs/core
```

## Setup

Add the Junction integration to your Astro config:

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import junction from "@junctionjs/astro";

export default defineConfig({
  integrations: [
    junction({
      debug: true,
    }),
  ],
});
```

## Features

- Automatic script injection at `before-hydration`
- SSR middleware for session, geo, and IP enrichment
- View Transitions support — page views tracked on every navigation
- Server-side `/api/collect` endpoint
- CSP-compatible (no `unsafe-inline` needed)

## Exports

| Export | Description |
|--------|-------------|
| `@junctionjs/astro` | Astro integration (script injection, middleware) |
| `@junctionjs/astro/middleware` | SSR middleware for server-side enrichment |
| `@junctionjs/astro/collect-endpoint` | Server-side collect API route |

Full documentation coming soon.
```

- [ ] **Step 3: Verify build**

Run: `npm run build --workspace=apps/docs`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/integrations/
git commit -m "docs: add integration pages — Next.js and Astro stubs"
```

---

### Task 6: Migrate product pages

**Files:**
- Create: `apps/docs/src/content/docs/product/mission.mdx`
- Create: `apps/docs/src/content/docs/product/roadmap.mdx`

- [ ] **Step 1: Create `apps/docs/src/content/docs/product/mission.mdx`**

Copy the content from `docs/product/mission.md` and add Starlight frontmatter:

```mdx
---
title: Mission
description: The problem Junction solves and who it's for.
---
```

Then paste the content of `docs/product/mission.md` starting from the `## Problem` heading (skip the H1 since Starlight generates it from frontmatter).

- [ ] **Step 2: Create `apps/docs/src/content/docs/product/roadmap.mdx`**

Copy the content from `docs/product/roadmap.md` and add Starlight frontmatter:

```mdx
---
title: Roadmap
description: Junction's product roadmap and development phases.
---
```

Then paste the content of `docs/product/roadmap.md` starting from the `## Phase 1` heading.

- [ ] **Step 3: Verify build**

Run: `npm run build --workspace=apps/docs`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/product/
git commit -m "docs: migrate mission and roadmap to Starlight"
```

---

### Task 7: Verify full site and final commit

**Files:**
- None new — verification only

- [ ] **Step 1: Full build**

Run: `npm run build --workspace=apps/docs`
Expected: Build succeeds with all pages rendered.

- [ ] **Step 2: Dev server smoke test**

Run: `npm run dev --workspace=apps/docs`
Expected: Dev server starts. Manually verify:
- Landing page renders with hero and cards
- Sidebar navigation works
- All pages are reachable
- No broken links in sidebar

Stop the dev server after verification.

- [ ] **Step 3: Run monorepo build to ensure no conflicts**

Run: `npm run build`
Expected: Turborepo builds all packages and apps including docs. No errors.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "docs: fix any issues found during verification"
```

Only create this commit if changes were made during verification. Skip if everything passed clean.
