# Junction

Next-generation, Git-native event collection and routing system. A replacement for Adobe Launch and Google Tag Manager built for the modern web.

## Why Junction

Tag managers were designed for marketers adding snippets to websites. Junction is designed for engineers building data infrastructure. Events are the primitive — not tags, not rules. Configuration lives in TypeScript files, reviewed in pull requests, deployed through CI/CD.

**Config as code.** Your tracking config is a TypeScript file in your repo. No web UI, no race conditions, no "who changed that rule in production?"

**Consent-first.** Events queue until consent is resolved. Destinations only receive events they're allowed to see. DNT and GPC respected out of the box.

**Schema validation.** Zod contracts enforce event shapes at runtime. Catch typos, missing fields, and type mismatches before they reach your analytics.

**Isomorphic.** The same collector runs in browsers, Node.js, Deno, Cloudflare Workers, and Bun. Write once, deploy anywhere.

## Packages

| Package | Description |
|---------|-------------|
| [`@junctionjs/core`](packages/core) | Isomorphic collector, consent state machine, Zod validation |
| [`@junctionjs/client`](packages/client) | Browser runtime — anonymous IDs, sessions, auto page views |
| [`@junctionjs/astro`](packages/astro) | Astro v5+ integration — script injection, SSR middleware, View Transitions |
| [`@junctionjs/gateway`](packages/gateway) | WinterCG edge gateway — Cloudflare Workers, Deno, Bun, Vercel Edge |
| [`@junctionjs/destination-amplitude`](packages/destination-amplitude) | Amplitude (HTTP API, client + server) |
| [`@junctionjs/destination-ga4`](packages/destination-ga4) | GA4 (gtag.js, Measurement Protocol, Consent Mode v2) |
| [`@junctionjs/destination-meta`](packages/destination-meta) | Meta Pixel + Conversions API |
| [`@junctionjs/debug`](packages/debug) | In-page debug panel — real-time event flow visibility |

## Quick start

```bash
npm install @junctionjs/core @junctionjs/client
```

```typescript
import { createClient } from "@junctionjs/client";
import { amplitude } from "@junctionjs/destination-amplitude";

const client = createClient({
  name: "my-site",
  environment: "production",
  consent: {
    defaultState: {},
    queueTimeout: 30000,
    respectDNT: true,
    respectGPC: true,
  },
  destinations: [
    {
      destination: amplitude,
      config: { apiKey: "YOUR_KEY", mode: "client" },
      consent: ["analytics"],
    },
  ],
});

// Track events
client.track("product", "viewed", { product_id: "SKU-123", price: 29.99, currency: "USD" });

// Update consent
client.consent({ analytics: true, marketing: false });

// Identify users
client.identify("user-42", { email: "user@example.com" });
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design document covering data flow, consent semantics, destination plugin interface, and migration paths.

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Writing a destination

Destinations are plain objects with three required methods:

```typescript
import type { Destination, JctEvent, ConsentState } from "@junctionjs/core";

export const myDestination: Destination<{ apiKey: string }> = {
  name: "my-destination",
  version: "0.1.0",
  consent: ["analytics"],
  runtime: "both",

  init(config) {
    // Load SDKs, validate config
  },

  transform(event: JctEvent) {
    // Convert Junction event to your format. Return null to skip.
    return { name: `${event.entity}_${event.action}`, data: event.properties };
  },

  async send(payload, config) {
    // Send to your service
    await fetch("https://api.example.com/events", {
      method: "POST",
      headers: { "Authorization": `Bearer ${config.apiKey}` },
      body: JSON.stringify(payload),
    });
  },
};
```

## License

MIT
