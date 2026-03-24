# @junctionjs/core

## 0.2.1

### Patch Changes

- [#9](https://github.com/tyssejc/junction/pull/9) [`79fc81d`](https://github.com/tyssejc/junction/commit/79fc81d2ffd6628e079071c6085b4c790463c494) Thanks [@tyssejc](https://github.com/tyssejc)! - fix(core): flush event buffer on consent change so queued events dispatch immediately

  fix(next): derive single URL dep in PageTracker to prevent double pageview on navigation

- [#10](https://github.com/tyssejc/junction/pull/10) [`deb159c`](https://github.com/tyssejc/junction/commit/deb159c8535932cc128a6664ca4e90a422563d42) Thanks [@tyssejc](https://github.com/tyssejc)! - fix(core): pin `necessary: true` in consent state so it is always granted and cannot be overridden

## 0.2.0

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

## 0.1.3

### Patch Changes

- [`34bf3ee`](https://github.com/tyssejc/junction/commit/34bf3ee0c2844cd9319a76ec604fc39d53091e04) Thanks [@tyssejc](https://github.com/tyssejc)! - Publish unpublished versions
