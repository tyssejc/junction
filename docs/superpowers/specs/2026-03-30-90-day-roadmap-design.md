# 90-Day Product Roadmap — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Technical/product roadmap for Junction validation sprint (Phase 2)
**Team:** Solo founder + AI assistant (Claude Code)

## Objective

Make Junction credible, adoptable, and production-ready for design partner evaluation. By day 90, a design partner can deploy Junction in production, and a prospect can evaluate it end-to-end in under 10 minutes.

## Phase Structure

| Phase | Days | Dates | Focus | Exit Criteria |
|-------|------|-------|-------|---------------|
| **1: PostHog** | 1–20 | Mar 30 – Apr 18 | Ship PostHog destination | Published package, tested, documented, demo updated |
| **2: Hosted Gateway + Observability** | 21–60 | Apr 19 – May 28 | Production-ready managed gateway | Design partner can deploy, send events, see delivery status and errors |
| **3: Adoption Surface** | 61–90 | May 29 – Jun 27 | Reference impl, docs, migration guide, agentic spike | A prospect can evaluate Junction end-to-end in under 10 minutes |

## Phase 1: PostHog Destination (Days 1–20)

### Goal

Ship `@junctionjs/destination-posthog` as a published npm package that supports both client-side and server-side event capture.

### Scope

- Implement standard destination interface (init, transform, send)
- Event name mapping: entity:action → PostHog event names (3-tier: config override → default map → generated)
- Filter `_system` events in transform
- Support both client-side (posthog-js) and server-side (PostHog API) sending
- Map Junction identity (anonymous ID, user ID) to PostHog's `distinct_id`
- Map common properties (page URL, referrer, etc.)
- Consent category configuration (same pattern as other destinations)

### Deliverables

1. `packages/destination-posthog/` — source, tests, README
2. Demo app updated to include PostHog as a destination option
3. Docs page for PostHog setup
4. Published to npm

### Out of scope

- PostHog feature flags, session replay, or surveys integration
- Group analytics

## Phase 2: Hosted Gateway + Observability (Days 21–60)

### Goal

A design partner can deploy a managed Junction gateway on Cloudflare Workers and see what's happening with their events — delivery status, validation errors, consent-blocked events, and human-readable failure explanations.

### Sub-phase 2a: Managed Deployment + Persistence (Days 21–35)

- Cloudflare Workers deployment with Hono
- Credential/secret management for destination API keys (Workers secrets or KV)
- Durable event log — events received, validated, routed (D1 or KV, bounded retention)
- Retry logic for failed destination deliveries (Workers Queue or in-process with backoff)
- API key auth for the ingestion endpoint

### Sub-phase 2b: Observability API + Dashboard (Days 36–50)

- REST API to query: recent events, delivery status per destination, validation errors, consent-blocked events
- Lightweight dashboard UI (technology TBD during planning — standalone page, part of demo, or separate small app)
- Human-readable error explanations (why an event was dropped, blocked, or failed)

### Sub-phase 2c: Hardening + Design Partner Readiness (Days 51–60)

- Health endpoint
- Rate limiting
- CORS configuration for multi-origin support
- Documentation: setup guide, architecture overview, operational runbook
- Deployment playbook (Wrangler-based)

### Key decision (during planning)

- Dashboard UI approach: standalone app vs. embedded in demo vs. API-only with curl examples first

### Out of scope

- Multi-tenant / self-service provisioning
- Billing integration
- Custom transformation rules at the gateway level
- SST or Pulumi — Wrangler only for now

## Phase 3: Adoption Surface + Agentic Spike (Days 61–90)

### Goal

A prospect can evaluate Junction end-to-end in under 10 minutes. Plus a small proof-of-concept for agentic instrumentation.

### 3a: Reference Implementation (Days 61–75)

- Next.js SaaS example (build on existing demo or start fresh — TBD during planning)
- Full loop: event schemas → client SDK → hosted gateway → PostHog + GA4
- Consent flow with real CMP integration
- Debug panel active
- Gateway observability visible
- README that walks through "what just happened" for each interaction

### 3b: Docs + Migration Guide (Days 76–83)

- Reworked quickstart narrative: what Junction is, how it differs, how to get running
- GTM-to-Junction migration guide
- Gateway deployment guide
- Destination setup guides consolidated

### 3c: Agentic Instrumentation Spike (Days 84–90)

- `CLAUDE.md` template for Junction users — teaches AI assistants the entity:action convention, schema contracts, consent patterns
- Ships as part of the reference implementation and as a standalone template in docs
- Goal: when a developer uses an AI assistant in a Junction project, the assistant knows how to add events correctly without reading all the docs

### Out of scope

- Astro or ecommerce examples
- Launch-to-Junction migration guide
- CLI scaffolding or `npm create junction`
- Full AI prompt engineering for schema generation

## Explicitly Out of Scope for This 90 Days

- Additional destinations beyond PostHog (unless a design partner demands one)
- AI CLI tooling beyond the CLAUDE.md template
- Team workflows / environments / audit trail
- Schema ergonomics improvements
- Consent implementation cookbook
- Multi-tenant SaaS platform

These are valid Tier 2/3 items but don't serve the primary goal: getting a design partner running in production.

## Success Criteria

By day 90, Junction should have:

- **PostHog destination** shipped and published
- **Hosted gateway** deployable by a design partner on Cloudflare Workers
- **Observability** sufficient that a partner can see what happened to every event and why
- **Reference implementation** that demonstrates the full stack
- **Docs** that let a technical buyer understand and evaluate in one session
- **Agentic instrumentation** proof-of-concept showing Junction is AI-assistable
