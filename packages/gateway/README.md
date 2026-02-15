# @junctionjs/gateway

WinterCG-compatible edge gateway for Junction. Receives events from clients and routes them to server-side destinations.

Runs on Cloudflare Workers, Deno Deploy, Vercel Edge, Bun, and Node.js 18+.

## Features

- CORS configuration with origin allowlisting
- Bearer token or API key authentication
- Server-side context enrichment (IP, geo, user agent)
- Immediate flush after response (edge functions are short-lived)
- Rate limiting support (requires KV adapter)

## Install

```bash
npm install @junctionjs/gateway
```

## Usage

```typescript
// Cloudflare Workers
import { createGateway } from "@junctionjs/gateway";
import { amplitude } from "@junctionjs/destination-amplitude";

const gateway = createGateway({
  destinations: [
    { destination: amplitude, config: { apiKey: "...", mode: "server", secretKey: "..." } },
  ],
  collector: {
    name: "my-gateway",
    environment: "production",
    consent: { defaultState: { analytics: true }, queueTimeout: 0, respectDNT: false, respectGPC: false },
  },
  cors: { allowedOrigins: ["https://mysite.com"] },
  auth: { type: "bearer", key: "my-secret" },
});

export default { fetch: gateway.handleRequest };
```

## License

MIT
