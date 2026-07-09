/**
 * @junctionjs/destination-posthog — server (cloud-mode)
 *
 * Forwards Junction events to PostHog's HTTP capture API. No browser
 * signals, no session replay, no feature flags, no client sessionization.
 * The "just get events into my PostHog dataset" path.
 */

import type { Destination, JctEvent } from "@junctionjs/core";
import {
  type PostHogBaseConfig,
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  resolveDistinctId,
  resolveHost,
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

const BACKOFF_BASE_MS = 100;

async function postWithRetry(
  url: string,
  apiKey: string,
  batch: PostHogCaptureEvent[],
  single: boolean,
  maxRetries: number,
): Promise<void> {
  const body = single ? JSON.stringify({ api_key: apiKey, ...batch[0] }) : JSON.stringify({ api_key: apiKey, batch });

  let attempt = 0;
  // total attempts = 1 + maxRetries
  while (true) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (response.ok) return;
      const text = await response.text();
      throw new Error(`[Junction:posthog-server] POST ${url} returned ${response.status}: ${text}`);
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      attempt += 1;
      // exponential backoff: 100ms, 200ms, 400ms, ...
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_BASE_MS * 2 ** (attempt - 1)));
    }
  }
}

/**
 * Create a server-side (cloud-mode) PostHog destination.
 *
 * @example
 * ```ts
 * import { createPostHogServer } from "@junctionjs/destination-posthog";
 * const dest = createPostHogServer({ apiKey: "phc_...", host: "https://eu.i.posthog.com" });
 * ```
 */
export function createPostHogServer(config: PostHogServerConfig): Destination<PostHogServerConfig> {
  const host = resolveHost(config.host);
  const batchSize = config.batchSize ?? 20;
  const flushIntervalMs = config.flushIntervalMs ?? 5000;
  const maxRetries = config.maxRetries ?? 3;

  let buffer: PostHogCaptureEvent[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const single = batchSize <= 1;
    const url = single ? `${host}/capture/` : `${host}/batch/`;
    await postWithRetry(url, config.apiKey, batch, single, maxRetries);
  }

  return {
    name: "posthog-server",
    description: "PostHog (server / cloud-mode)",
    version: "0.1.0",
    consent: config.consent ?? ["analytics"],
    runtime: "server",

    init() {
      if (!config.apiKey) {
        throw new Error("[Junction:posthog-server] apiKey is required");
      }
      if (batchSize > 1 && !timer) {
        timer = setInterval(() => {
          void flush().catch((err) => {
            if (config.debug) console.error("[Junction:posthog-server] scheduled flush failed:", err);
          });
        }, flushIntervalMs);
        // Do not keep the Node process alive solely for the flush timer.
        (timer as { unref?: () => void }).unref?.();
      }
    },

    transform(event: JctEvent) {
      return transformServerEvent(event, config);
    },

    async send(payload: unknown) {
      buffer.push(payload as PostHogCaptureEvent);
      if (buffer.length >= batchSize) {
        await flush();
      }
    },

    async teardown() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      await flush();
    },
  };
}
