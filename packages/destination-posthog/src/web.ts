/**
 * @junctionjs/destination-posthog — web (device-mode)
 *
 * Loads posthog-js on the page and routes Junction's tracked events
 * through posthog.capture(). Junction stays the event source of truth:
 * posthog-js autocapture / capture_pageview are OFF by default.
 */

import type { JctEvent } from "@junctionjs/core";
import {
  type PostHogBaseConfig,
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  resolveDistinctId,
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
