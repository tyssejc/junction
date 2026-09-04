/**
 * @junctionjs/destination-posthog
 *
 * PostHog destination for Junction, offered as two tree-shakeable factories:
 * - createPostHogWeb   — device-mode: loads posthog-js, full browser signals
 * - createPostHogServer — cloud-mode: forwards events to PostHog's HTTP API
 *
 * Import only the one you need; the other is eliminated by tree-shaking.
 */

export { POSTHOG_DEFAULT_HOST, type PostHogBaseConfig } from "./shared.js";
export { createPostHogServer, type PostHogServerConfig } from "./server.js";
export { createPostHogWeb, type PostHogWebConfig } from "./web.js";
