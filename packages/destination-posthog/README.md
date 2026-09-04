# @junctionjs/destination-posthog

PostHog destination for Junction, offered as two tree-shakeable factories mirroring
the web (device-mode) vs server (cloud-mode) split.

- **`createPostHogWeb`** — loads `posthog-js` on the page. Full library: sessionization,
  person profiles, session replay, feature flags, browser-signal enrichment. Junction stays
  the event source of truth (autocapture/pageview off by default).
- **`createPostHogServer`** — forwards events to PostHog's HTTP capture API. No replay, flags,
  or client sessionization. The "just get events into my dataset" path.

Import only the one you need — the other is eliminated by tree-shaking. `posthog-js` is loaded
from PostHog's CDN at runtime, never bundled.

## Install

```bash
npm install @junctionjs/destination-posthog
```

## Web (device-mode)

```ts
import { createPostHogWeb } from "@junctionjs/destination-posthog";

const posthogWeb = createPostHogWeb({
  apiKey: "phc_...",
  host: "https://us.i.posthog.com", // or eu.i.posthog.com / self-hosted
  sessionReplay: false,             // opt in when you want replay
});
```

## Server (cloud-mode)

```ts
import { createPostHogServer } from "@junctionjs/destination-posthog";

const posthogServer = createPostHogServer({
  apiKey: "phc_...",
  batchSize: 20,        // buffer then POST to /batch; 1 = per-event /capture
  flushIntervalMs: 5000,
  maxRetries: 3,
});
```

## Configuration

| Option | Web | Server | Default | Notes |
|---|---|---|---|---|
| `apiKey` | ✓ | ✓ | — | PostHog project API key (required) |
| `host` | ✓ | ✓ | `https://us.i.posthog.com` | EU cloud or self-hosted URL |
| `consent` | ✓ | ✓ | `["analytics"]` | Consent categories (AND logic) |
| `eventNameMap` | ✓ | ✓ | — | Override `entity:action` → PostHog event name |
| `loadScript` | ✓ | — | `true` | Inject the posthog-js snippet |
| `scriptUrl` | ✓ | — | `${host}/static/array.js` | Reverse-proxy / self-host override |
| `sessionReplay` | ✓ | — | `false` | Enable session recording |
| `autocapture` | ✓ | — | `false` | Let posthog-js autocapture on its own |
| `capturePageview` | ✓ | — | `false` | Junction owns `page:viewed` by default |
| `batchSize` | — | ✓ | `20` | Buffer size before flush to `/batch` |
| `flushIntervalMs` | — | ✓ | `5000` | Max time between flushes |
| `maxRetries` | — | ✓ | `3` | Retries with exponential backoff |
| `maxBufferSize` | — | ✓ | `1000` | Cap on buffered events while flushes fail; oldest dropped past it |
