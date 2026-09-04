/**
 * @junctionjs/destination-posthog — shared helpers
 *
 * Pure functions shared by the web (device-mode) and server (cloud-mode)
 * PostHog destinations. No side effects, no network, no DOM.
 */

import type { ConsentCategory, JctEvent } from "@junctionjs/core";

export const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

export interface PostHogBaseConfig {
  /** PostHog project API key */
  apiKey: string;

  /** PostHog host. Default US cloud; use https://eu.i.posthog.com or a self-hosted/proxy URL. */
  host?: string;

  /** Consent categories required (AND logic). Default ["analytics"]. */
  consent?: ConsentCategory[];

  /** Override entity:action → PostHog event name. */
  eventNameMap?: Record<string, string>;

  /** Verbose logging. */
  debug?: boolean;
}

/** PostHog accepts arbitrary event names, so the default map is deliberately thin. */
const POSTHOG_DEFAULT_MAP: Record<string, string> = {
  "page:viewed": "$pageview",
};

/** 3-tier event name resolution: config override → default map → generated entity_action. */
export function getEventName(event: JctEvent, eventNameMap?: Record<string, string>): string {
  const key = `${event.entity}:${event.action}`;
  return eventNameMap?.[key] ?? POSTHOG_DEFAULT_MAP[key] ?? `${event.entity}_${event.action}`;
}

/** PostHog uses a single distinct_id that flips from anonymous to known on identify. */
export function resolveDistinctId(event: JctEvent): string {
  return event.user.userId ?? event.user.anonymousId;
}

export function isSystemEvent(event: JctEvent): boolean {
  return event.entity === "_system";
}

export function isIdentifyEvent(event: JctEvent): boolean {
  return event.entity === "user" && event.action === "identified";
}

export function resolveHost(host?: string): string {
  return (host ?? POSTHOG_DEFAULT_HOST).replace(/\/$/, "");
}

/** Build PostHog event properties from a Junction event, adding $-prefixed browser context. */
export function buildEventProperties(event: JctEvent, extra?: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = { ...event.properties, ...extra };
  if (event.context.page) {
    props.$current_url = event.context.page.url;
    if (event.context.page.referrer) props.$referrer = event.context.page.referrer;
  }
  return props;
}
