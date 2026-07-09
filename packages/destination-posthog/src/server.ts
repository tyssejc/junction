/**
 * @junctionjs/destination-posthog — server (cloud-mode)
 *
 * Forwards Junction events to PostHog's HTTP capture API. No browser
 * signals, no session replay, no feature flags, no client sessionization.
 * The "just get events into my PostHog dataset" path.
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

export interface PostHogServerConfig extends PostHogBaseConfig {
  /** Buffer up to this many events, then POST to /batch. 1 = send each event to /capture. Default 20. */
  batchSize?: number;

  /** Flush the buffer at least this often (ms). Default 5000. */
  flushIntervalMs?: number;

  /** Retry a failed flush this many times with exponential backoff. Default 3. */
  maxRetries?: number;
}

export interface PostHogCaptureEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
  uuid: string;
}

export function transformServerEvent(event: JctEvent, config: PostHogServerConfig): PostHogCaptureEvent | null {
  if (isSystemEvent(event)) return null;

  const distinctId = resolveDistinctId(event);

  if (isIdentifyEvent(event)) {
    return {
      event: "$identify",
      distinct_id: distinctId,
      properties: {
        $anon_distinct_id: event.user.anonymousId,
        ...(event.user.traits ? { $set: event.user.traits } : {}),
      },
      timestamp: event.timestamp,
      uuid: event.id,
    };
  }

  return {
    event: getEventName(event, config.eventNameMap),
    distinct_id: distinctId,
    properties: buildEventProperties(event, { $lib: "junction-server" }),
    timestamp: event.timestamp,
    uuid: event.id,
  };
}
