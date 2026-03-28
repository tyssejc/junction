# GA4 Demo Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the real GA4 destination in the demo app to validate end-to-end functionality.

**Architecture:** Swap the simulated GA4 no-op destination for the real `@junctionjs/destination-ga4` package in the demo's Junction config. The Measurement ID comes from an env var so it's not committed. The demo sink continues to show GA4 transforms for visualization.

**Tech Stack:** Next.js 15, @junctionjs/destination-ga4, Google Analytics 4, gtag.js

---

### Task 1: Remove simulatedGA4 from demo-sink.ts

**Files:**
- Modify: `apps/demo/lib/demo-sink.ts:81`

- [ ] **Step 1: Remove simulatedGA4 export**

In `apps/demo/lib/demo-sink.ts`, remove line 81:

```ts
// DELETE this line:
export const simulatedGA4 = noopDestination("ga4", ["analytics"]);
```

- [ ] **Step 2: Verify demo-sink.ts still exports the other simulated destinations and demoSink**

The file should still export: `simulatedAmplitude`, `simulatedMeta`, `demoSink`, `getEvents`, `onEvent`, `clearEvents`, and `CapturedEvent`.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/lib/demo-sink.ts
git commit -m "refactor(demo): remove simulatedGA4 no-op destination"
```

---

### Task 2: Wire up real GA4 destination in junction-config.ts

**Files:**
- Modify: `apps/demo/lib/junction-config.ts`

- [ ] **Step 1: Update imports**

Replace:
```ts
import { demoSink, simulatedAmplitude, simulatedGA4, simulatedMeta } from "./demo-sink";
```

With:
```ts
import { ga4 } from "@junctionjs/destination-ga4";
import { demoSink, simulatedAmplitude, simulatedMeta } from "./demo-sink";
```

- [ ] **Step 2: Replace simulatedGA4 destination entry with real ga4**

Replace:
```ts
    { destination: simulatedGA4, config: {}, enabled: true },
```

With:
```ts
    // Real GA4 — gated on env var. When disabled, the collector skips it
    // entirely (no init call), so the empty measurementId fallback is safe.
    // See: packages/core/src/collector.ts:97 — `if (entry.enabled === false) continue;`
    ...(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
      ? [
          {
            destination: ga4,
            config: {
              measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
              sendPageView: false,
              consentMode: true,
            },
            consent: ["analytics"],
            enabled: true,
          },
        ]
      : []),
```

> **Note:** Using spread-conditional instead of `enabled: false` with an empty string. This avoids the destination entry entirely when the env var is absent — cleaner and doesn't rely on the collector's `enabled` guard.

- [ ] **Step 3: Update the file's doc comment**

Replace the comment block above `destinations:` to reflect that GA4 is now real:

```ts
/**
 * Junction collector configuration for the Orbit Supply demo.
 *
 * The demo-sink (exempt) always receives events for visualization.
 * GA4 is a real destination gated on NEXT_PUBLIC_GA4_MEASUREMENT_ID env var.
 * Simulated Amplitude/Meta destinations are consent-gated so the
 * consent queue actually works: events queue while pending, flush on
 * grant, and drop on deny.
 */
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/demo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/demo/lib/junction-config.ts
git commit -m "feat(demo): wire up real GA4 destination with consent mode"
```

---

### Task 3: Create .env.local with placeholder

**Files:**
- Create: `apps/demo/.env.local`

- [ ] **Step 1: Create .env.local**

```
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

(User will replace `G-XXXXXXXXXX` with their real Measurement ID)

- [ ] **Step 2: Verify .env.local is gitignored**

Run: `git check-ignore apps/demo/.env.local`
Expected: `apps/demo/.env.local` (confirms it's ignored by root `.gitignore` pattern `.env*.local`)

- [ ] **Step 3: No commit needed** — file is gitignored

---

### Task 4: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `cd apps/demo && npm run dev`

- [ ] **Step 2: Open browser and check gtag.js loads**

Open http://localhost:3000. In DevTools Network tab, filter for `gtag`. Verify:
- `gtag/js?id=G-XXXXXXXXXX` script loads
- No console errors from Junction or GA4

- [ ] **Step 3: Check events fire on interaction**

Navigate to Store page, click a product. In Network tab, filter for `google-analytics.com/g/collect`. Verify:
- Requests are being sent to GA4
- Event names match expected GA4 events (e.g., `page_view`, `view_item`)

- [ ] **Step 4: Check consent gating**

Clear cookies/localStorage, reload. Before accepting consent:
- Events should queue (visible in demo's event viewer)
- No GA4 network requests should fire

After granting analytics consent:
- Queued events should flush
- GA4 network requests should appear

- [ ] **Step 5: Check GA4 Realtime dashboard**

Open GA4 property > Reports > Realtime. Verify events appear with correct names and parameters.
