# GA4 Demo Integration — Design Spec

## Goal

Replace the simulated GA4 destination in the demo app with the real `@junctionjs/destination-ga4` package, configured the way a customer would, to validate end-to-end functionality.

## Changes

### 1. `apps/demo/lib/junction-config.ts`

Import the real `ga4` destination from `@junctionjs/destination-ga4` and add it to the destinations array with real config. Remove the `simulatedGA4` import and destination entry.

```ts
import { ga4 } from "@junctionjs/destination-ga4";

// In destinations array:
{
  destination: ga4,
  config: {
    measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!,
    sendPageView: false,
    consentMode: true,
  },
  consent: ["analytics"],
  enabled: !!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
}
```

Key decisions:
- `sendPageView: false` — Junction's `PageTracker` handles page views
- `consentMode: true` — enables Google Consent Mode v2 integration
- `consent: ["analytics"]` — overrides the destination's default `["analytics", "marketing"]` to match what the demo expects
- `enabled` gated on env var — demo still works without it (falls back to demo sink only)

### 2. `apps/demo/lib/demo-sink.ts`

Remove `simulatedGA4` export. The demo sink's `send()` method already imports `ga4` for transform visualization — that stays unchanged.

### 3. `apps/demo/.env.local` (gitignored)

```
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 4. What stays the same

- Demo sink (event viewer UI) — still captures all events with vendor transforms
- Simulated Amplitude and Meta destinations
- All existing demo pages, contracts, and consent flow
- The GA4 destination package source code (bugs fixed separately if found)

## Testing

Manual verification in browser:
1. gtag.js loads in `<head>` (Network tab)
2. Events fire to GA4 on user actions (Network tab: `collect?` requests)
3. Events appear in GA4 Realtime / DebugView
4. Consent gating works: events queue before grant, fire after
5. Demo sink event viewer still shows GA4 transforms
