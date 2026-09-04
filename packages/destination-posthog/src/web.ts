/**
 * @junctionjs/destination-posthog — web (device-mode)
 *
 * Loads posthog-js on the page and routes Junction's tracked events
 * through posthog.capture(). Junction stays the event source of truth:
 * posthog-js autocapture / capture_pageview are OFF by default.
 */

import type { ConsentState, Destination, JctEvent } from "@junctionjs/core";
import {
  type PostHogBaseConfig,
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  resolveDistinctId,
  resolveHost,
} from "./shared.js";

export interface PostHogWebConfig extends PostHogBaseConfig {
  /** Inject the posthog-js snippet. Default true. */
  loadScript?: boolean;

  /** Override the snippet URL (reverse proxy / self-hosted). */
  scriptUrl?: string;

  /** Enable session replay. Default false (heavy + privacy-sensitive). */
  sessionReplay?: boolean;

  /** Let posthog-js autocapture clicks/inputs on its own. Default false. */
  autocapture?: boolean;

  /** Let posthog-js fire its own pageviews. Default false (Junction owns page:viewed). */
  capturePageview?: boolean;
}

export type WebPayload =
  | { type: "capture"; name: string; properties: Record<string, unknown> }
  | { type: "identify"; distinctId: string; traits?: Record<string, unknown> };

export function transformWebEvent(event: JctEvent, config: PostHogWebConfig): WebPayload | null {
  if (isSystemEvent(event)) return null;

  if (isIdentifyEvent(event)) {
    return { type: "identify", distinctId: resolveDistinctId(event), traits: event.user.traits };
  }

  return {
    type: "capture",
    name: getEventName(event, config.eventNameMap),
    properties: buildEventProperties(event, { $lib: "junction-web" }),
  };
}

interface PostHogJs {
  init: (apiKey: string, options: Record<string, unknown>) => void;
  capture: (name: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  opt_out_capturing: () => void;
  __loaded?: boolean;
}

function getPostHog(): PostHogJs | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { posthog?: PostHogJs }).posthog;
}

/** Inject the posthog-js snippet with an array stub that queues calls until the script loads. */
function loadSnippet(scriptUrl: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { posthog?: PostHogJs; document?: Document };
  if (w.posthog?.__loaded) return;

  const doc = w.document;
  if (!doc) return;
  if (doc.querySelector(`script[src="${scriptUrl}"]`)) return;

  const script = doc.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  const first = doc.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);
}

/**
 * Create a client-side (device-mode) PostHog destination.
 *
 * @example
 * ```ts
 * import { createPostHogWeb } from "@junctionjs/destination-posthog";
 * const dest = createPostHogWeb({ apiKey: "phc_...", sessionReplay: true });
 * ```
 */
export function createPostHogWeb(config: PostHogWebConfig): Destination<PostHogWebConfig> {
  const apiHost = resolveHost(config.host);
  const scriptUrl = config.scriptUrl ?? `${apiHost}/static/array.js`;

  return {
    name: "posthog-web",
    description: "PostHog (web / device-mode)",
    version: "0.1.0",
    consent: config.consent ?? ["analytics"],
    runtime: "client",

    init() {
      if (typeof window === "undefined") return; // SSR guard
      if (!config.apiKey) {
        throw new Error("[Junction:posthog-web] apiKey is required");
      }
      if (config.loadScript !== false) {
        loadSnippet(scriptUrl);
      }
      const posthog = getPostHog();
      posthog?.init(config.apiKey, {
        api_host: apiHost,
        autocapture: config.autocapture ?? false,
        capture_pageview: config.capturePageview ?? false,
        capture_pageleave: config.capturePageview ?? false,
        disable_session_recording: !(config.sessionReplay ?? false),
      });
    },

    transform(event: JctEvent) {
      return transformWebEvent(event, config);
    },

    async send(payload: unknown) {
      const posthog = getPostHog();
      if (!posthog) return; // script not loaded yet / SSR
      const p = payload as WebPayload;
      if (p.type === "identify") {
        posthog.identify(p.distinctId, p.traits ? { $set: p.traits } : undefined);
      } else {
        posthog.capture(p.name, p.properties);
      }
    },

    onConsent(state: ConsentState) {
      if (state.analytics === false) {
        getPostHog()?.opt_out_capturing();
      }
    },
  };
}
