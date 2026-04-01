# Product Roadmap

## Phase 1: MVP (Shipped)

The core open-source product is built and functional:

- Isomorphic event collector with typed event model (entity + action)
- Consent state machine with event queuing, per-destination gating, DNT/GPC support
- Zod-based schema validation (strict and lenient modes)
- Browser client with anonymous IDs, sessions, auto page views
- Astro v5+ integration (script injection, SSR middleware, View Transitions)
- WinterCG edge gateway (Cloudflare Workers, Deno, Bun, Vercel Edge)
- Next.js integration
- Destinations: Amplitude, GA4, Meta Pixel + CAPI, HTTP (generic), Plausible
- In-page debug panel for real-time event flow visibility
- OneTrust CMP adapter
- Auto-collect module
- Monorepo with CI/CD, Changesets for versioning, npm publishing

## Phase 2: Validation Sprint (Current — 90-Day Plan, Mar 30 – Jun 27 2026)

Goal: make Junction production-ready for design partner adoption. A design partner can deploy and operate Junction; a prospect can evaluate it end-to-end in under 10 minutes.

### Phase 2.1: PostHog Destination (Days 1–20, Mar 30 – Apr 18)

- `@junctionjs/destination-posthog` — client-side (posthog-js) and server-side (API) event capture
- Standard destination interface, entity:action mapping, consent configuration
- Demo app updated, docs page, published to npm

### Phase 2.2: Hosted Gateway + Observability (Days 21–60, Apr 19 – May 28)

- Cloudflare Workers deployment with Hono, credential management, API key auth
- Durable event log, retry logic for failed deliveries
- Observability API: recent events, delivery status, validation errors, consent-blocked events
- Lightweight dashboard UI with human-readable error explanations
- Health endpoint, rate limiting, CORS, deployment playbook

### Phase 2.3: Adoption Surface (Days 61–90, May 29 – Jun 27)

- **Reference implementation** — Next.js SaaS example showing full loop: client SDK → hosted gateway → PostHog + GA4, with consent flow and debug panel
- **Docs** — reworked quickstart, GTM-to-Junction migration guide, gateway deployment guide
- **Agentic instrumentation spike** — `CLAUDE.md` template for Junction users so AI assistants know how to instrument events correctly

### Deferred to post-Phase 2

- Additional destinations based on design partner signal (Mixpanel, HubSpot, LinkedIn Ads, Segment-as-destination)
- Schema/contract ergonomics — easier authoring, reusable patterns, starter templates
- Consent implementation cookbook
- AI CLI tooling beyond the CLAUDE.md template
- Team workflows / environments / audit trail

## Phase 3: Post-Launch Product Expansion

- **Rules engine** — declarative auto-tracking based on URL/DOM/cookie conditions
- **CMP integrations** — pre-built adapters for Cookiebot, Usercentrics, and others
- **Event replay** — record events in staging, replay against production configs
- **Monitoring dashboard** — destination error rates, event volumes, validation failures
- **Team workflows** — environments, approvals, audit trail, access controls
- **More destinations** — Google Ads, LinkedIn Insight, TikTok Pixel, Pinterest Tag, Snowflake, BigQuery, S3/R2

## Monetization Sequence

1. **Productized implementation services** (via Stacked Analytics) — migration, modernization, architecture, launch support
2. **Hosted gateway / runtime** — managed infrastructure as recurring revenue
3. **Observability / debugging / event QA** — premium software surface
4. **Team workflows / audit trail** — expansion into agencies and larger teams
