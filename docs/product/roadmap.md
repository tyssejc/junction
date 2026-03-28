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

## Phase 2: Validation Sprint (Current — 90-Day Plan)

### Tier 1: Must-do now

- **PostHog destination** — broadens story beyond martech into product analytics; strengthens "one event layer for product + growth"
- **Observability / debugging MVP** — live event stream, payload inspection, validation errors, consent-blocking visibility, destination delivery status, human-readable failure explanations
- **Hosted gateway / runtime MVP** — managed ingestion endpoint, credential handling, delivery logs, retries, basic health status
- **Reference implementations** — Next.js SaaS example, Astro example, ecommerce/headless example (each showing schemas, consent, multi-destination, debug workflow)
- **Docs and quickstart improvements** — make the product understandable in one short session

### Tier 2: Build next

- Additional destinations based on design partner signal (candidates: Mixpanel, HubSpot, LinkedIn Ads, Segment-as-destination, RudderStack-as-destination)
- Schema/contract ergonomics — easier authoring, reusable patterns, starter templates, better validation messages
- Consent implementation experience — cookbooks, common consent modes, GPC/DNT examples
- Migration helpers — GTM-to-Junction guide, Adobe Launch-to-Junction guide, event inventory templates

### Tier 3: Differentiators to layer in

- AI CLI helpers — config scaffolding from prompts, schema generation, error explanation
- Destination mapping suggestions
- Vertical templates (ecommerce, SaaS, PLG)

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
