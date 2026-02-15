# @junctionjs/client

Browser runtime for Junction. Wraps `@junctionjs/core` with browser-specific functionality.

## Features

- Persistent anonymous IDs via `localStorage`
- Session management with 30-minute timeout
- Auto page view tracking (initial load, History API, Astro View Transitions)
- Browser context resolution (page URL, device, UTM params, viewport)
- Single window global (`window.jct` by default)
- `sendBeacon` support on page unload

## Install

```bash
npm install @junctionjs/client
```

## Quick start

```typescript
import { createClient } from "@junctionjs/client";

const client = createClient({
  name: "my-site",
  environment: "production",
  consent: { defaultState: {}, queueTimeout: 30000, respectDNT: true, respectGPC: true },
  destinations: [/* your destinations */],
  globalName: "jct",     // registers window.jct
  autoPageView: true,    // tracks page views automatically
  beaconUrl: "/api/collect",
});

// Available everywhere as window.jct
window.jct.track("product", "viewed", { product_id: "SKU-123" });
```

## License

MIT
