---
"@junctionjs/core": minor
"@junctionjs/debug": minor
"@junctionjs/destination-ga4": patch
---

Fix consent engine: AND logic, no double-sends, synchronous queue drain

- **BREAKING**: Consent checking now uses AND logic — all required categories must be granted. Previously used OR logic where any single match was sufficient. This affects destinations declaring multiple consent categories (e.g., GA4 now requires both `analytics` AND `marketing`).
- Fix double-delivery to exempt destinations on queue flush
- Fix duplicate enqueuing — events are now deduplicated by ID in the consent queue
- Queue drain is now synchronous, preventing event leaks from rapid consent grant/revoke
- Track `sentTo` per queued event so destinations that already received an event are skipped on replay
- Debug panel: add consent category pills (A/M/P/E) on destination rows and event rows
- Debug panel: add placeholder SVG icons for GA4, Amplitude, Meta, and Sentry destinations
- Debug panel: expose `getDestinationConsent()` on DebugStore, thread consent info through `destination:init` events
- GA4 destination updated to `consent: ["analytics", "marketing"]`
- E2E fixture updated with realistic destination set (Amplitude, Sentry, Meta, GA4)
