# @junctionjs/destination-posthog

## 0.2.0

### Minor Changes

- [#21](https://github.com/tyssejc/junction/pull/21) [`e9c6155`](https://github.com/tyssejc/junction/commit/e9c6155d2b760012a57d9c30182b75ab48cf7e38) Thanks [@tyssejc](https://github.com/tyssejc)! - Add PostHog destination with web (device-mode) and server (cloud-mode) factories.

  `createPostHogWeb` loads posthog-js for full browser signals; `createPostHogServer` forwards
  events to PostHog's HTTP capture API with batching and retry. Junction stays the event source
  of truth (autocapture/pageview off by default). Establishes the canonical identity-projection
  convention in the destination rules.
