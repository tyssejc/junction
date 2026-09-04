---
"@junctionjs/destination-posthog": minor
---

Add PostHog destination with web (device-mode) and server (cloud-mode) factories.

`createPostHogWeb` loads posthog-js for full browser signals; `createPostHogServer` forwards
events to PostHog's HTTP capture API with batching and retry. Junction stays the event source
of truth (autocapture/pageview off by default). Establishes the canonical identity-projection
convention in the destination rules.
