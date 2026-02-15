# @junctionjs/astro

Astro v5+ integration for Junction. First-class View Transitions support.

## Features

- Script injection at `before-hydration` stage (tracking ready before islands)
- View Transitions handling (`astro:page-load` deduplication, navigation timing)
- SSR middleware for server-side context (IP, geo, session)
- `/api/collect` endpoint for server-side event forwarding
- Dynamic destination resolution from npm packages

## Install

```bash
npm install @junctionjs/astro
```

## Usage

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import { junction } from "@junctionjs/astro";

export default defineConfig({
  integrations: [
    junction({
      config: {
        name: "my-site",
        environment: import.meta.env.MODE,
        consent: { defaultState: {}, queueTimeout: 30000, respectDNT: true, respectGPC: true },
        destinations: [
          {
            package: "@junctionjs/destination-amplitude",
            config: { apiKey: import.meta.env.AMPLITUDE_KEY, mode: "client" },
          },
        ],
      },
      debug: import.meta.env.DEV,
    }),
  ],
});
```

## Subpath exports

- `@junctionjs/astro` — the integration factory
- `@junctionjs/astro/middleware` — SSR middleware
- `@junctionjs/astro/collect-endpoint` — server-side collect route

## License

MIT
