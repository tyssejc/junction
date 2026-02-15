# @junctionjs/core

Isomorphic event collection core for Junction. Runs in browsers, Node.js, Deno, Cloudflare Workers, and Bun.

## What's inside

- **Collector** — the runtime engine. Accepts events, validates them against Zod contracts, checks consent, buffers, and dispatches to destinations.
- **Consent manager** — reactive state machine with event queuing. Events that arrive before consent is resolved get queued and replayed when consent changes.
- **Validator** — Zod-based schema validation per `entity:action` pair. Strict mode drops invalid events; lenient mode warns and passes through.
- **Types** — the full type system: `JctEvent`, `Destination`, `Collector`, `ConsentState`, `EventContract`, `Rule`, and more.
- **Common schemas** — reusable Zod schemas for products, orders, pages, and user traits.

## Install

```bash
npm install @junctionjs/core
```

## Quick start

```typescript
import { createCollector } from "@junctionjs/core";

const collector = createCollector({
  config: {
    name: "my-app",
    environment: "production",
    consent: { defaultState: { analytics: true }, queueTimeout: 30000, respectDNT: true, respectGPC: true },
    destinations: [],
  },
  source: { type: "client", name: "browser", version: "1.0.0" },
});

collector.track("page", "viewed", { path: "/home" });
collector.track("product", "added", { product_id: "SKU-123", price: 29.99, currency: "USD" });
collector.consent({ analytics: true, marketing: false });
collector.identify("user-42", { email: "user@example.com" });
```

## License

MIT
