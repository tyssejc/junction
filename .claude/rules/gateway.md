---
paths:
  - "packages/gateway/**"
---

# Gateway Standards

## Request Flow

```
POST /collect
  → CORS preflight (OPTIONS)
  → Auth check (bearer token or x-api-key)
  → Parse JSON body: { events: JctEvent[], consent?: ConsentState }
  → Apply client-reported consent
  → Per event: set context, identify if userId, track(entity, action, props)
  → Flush immediately
  → Return { ok: true, received: count }
```

## Edge-First Design

- **Flush immediately** after processing — edge functions are short-lived
- No batching or queueing at gateway level (client SDK handles that)
- Uses only Web Standard APIs: Request, Response, URL, fetch, JSON
- Zero platform-specific imports

## Server Context Enrichment

Gateway extracts server-side context per request:
- IP: `cf-connecting-ip` → `x-forwarded-for` → `x-real-ip`
- Geo: `cf-ipcountry`, `cf-ipregion`, `cf-ipcity`
- User-Agent, Referer

Merged with client context via `resolveContext` closure.
