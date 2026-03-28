---
paths:
  - "packages/core/**"
---

# Consent Standards

## State Machine

Consent is a reactive state machine with event queuing, not a boolean gate.

- **Merge, not replace:** `setState({ analytics: true })` merges with existing state
- **AND logic:** Destination requiring `["analytics", "marketing"]` needs BOTH granted
- **"necessary" and "exempt" always allowed:** Never blocked by consent
- **Pending = undefined:** Categories not yet set are pending, not denied
- **Lenient by default:** Events pass through; strict mode is opt-in

### Event Queuing

Events arriving before consent resolves are queued and replayed when consent changes.

- Deduplicated by event ID
- `sentTo` Set tracks which destinations already received each event
- Queue expires based on `queueTimeout` (default 30s)
- In strict mode, queuing is disabled — pending = denied, events drop

### CMP Fallback

~15-20% of privacy-conscious users block CMP scripts. Use `consentFallback`:

```typescript
consent: {
  consentFallback: {
    timeout: 3000,
    state: { analytics: false, marketing: false }
  }
}
```

### DNT & GPC

When `respectDNT` or `respectGPC` is enabled:
- DNT disables `analytics` and `marketing`
- GPC additionally disables `personalization`

### ConsentSignals (Separate from Destinations)

Vendor consent protocols (e.g. Google Consent Mode) are modeled as ConsentSignals, not part of destinations:

```typescript
consentSignals: [
  googleConsentMode({ waitForUpdate: 500 })
]
```

## Timing Heuristics

Not all "pending" consent is equal. Junction distinguishes the signal behind why consent hasn't resolved.

| Signal | Meaning | Action |
|--------|---------|--------|
| CMP blocked | Script never loads | `consentFallback` (3s) |
| CMP loaded, no interaction | Banner visible | Queue, `queueTimeout` (30s) |
| CMP loaded, dismissed | Closed without choosing | Conservative defaults |

**Future direction:** Accept a `consentSignalHint` from CMP integrations:
- `"blocked"` → fast fallback (seconds)
- `"visible"` → patient queue (30s+)
- `"dismissed"` → conservative defaults immediately

### SPA vs MPA

- **MPA:** Navigation = unload = queue loss. First pageview uniquely fragile.
- **SPA:** User stays on page, consent resolves naturally.
- May be best addressed at integration layer (e.g. `@junctionjs/next` defaults) rather than core.

## Necessary vs. Exempt

Two always-allowed consent categories serving different layers of the privacy stack.

- **necessary**: CMP/storage layer. Cookies and web storage required for site functionality. Pinned to `true` in state. Legal basis: ePrivacy Art 5(3).
- **exempt**: Data/dispatch layer. Destinations that receive events regardless of consent state. Used for first-party observability. Legal basis: GDPR Art 6(1)(f) legitimate interest.

### Why Two Categories

They operate at different enforcement layers:
- CMPs enforce **storage** (cookies, localStorage)
- Junction enforces **dispatch** (network requests to destinations)

### Guardrails (required)

- **First-party only**: Exempt destinations must be first-party or contractually bound processors
- **Legal basis declaration**: Each exempt destination should declare its basis
- **Audit trail**: Events dispatched to exempt destinations carry `is_exempt: true` metadata
- **Transparency**: Emit `destination:exempt` events for debug panels and audit logs

| Aspect | necessary | exempt |
|--------|-----------|--------|
| Consent UI | Visible | Hidden |
| Consent queue | Participates | Bypasses |
| Legal basis | ePrivacy strictly necessary | GDPR legitimate interest |
| User can disable | No (always on) | No (operational) |
