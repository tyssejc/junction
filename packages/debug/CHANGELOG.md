# @junctionjs/debug

## 2.0.0

### Patch Changes

- Updated dependencies [[`cc7d872`](https://github.com/tyssejc/junction/commit/cc7d87281c3ffe9ab658af7ad7632b306b13254d)]:
  - @junctionjs/core@0.3.0

## 1.0.0

### Minor Changes

- [`2fc0380`](https://github.com/tyssejc/junction/commit/2fc0380d851b3cefe41849e1090e9da7a1b9c91b) Thanks [@tyssejc](https://github.com/tyssejc)! - Fix consent engine: AND logic, no double-sends, synchronous queue drain

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

### Patch Changes

- Updated dependencies [[`2fc0380`](https://github.com/tyssejc/junction/commit/2fc0380d851b3cefe41849e1090e9da7a1b9c91b)]:
  - @junctionjs/core@0.2.0
