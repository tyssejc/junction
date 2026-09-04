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

  /**
   * Cap on events held in memory while flushes are failing. A failed flush
   * requeues its batch rather than dropping it; once the buffer exceeds this,
   * the oldest events are dropped (and logged) to bound memory. Default 1000.
   */
  maxBufferSize?: number;
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

/**
 * Retry rate limits (429) and server errors (5xx); those are transient. A 4xx
 * like 401 (bad key) or 400/422 (malformed) will fail identically on every
 * retry, so surface it immediately instead of burning the retry budget.
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

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
    // Network/transport errors (fetch throws) are transient → retryable.
    // A non-ok response sets this from its status before we throw.
    let retryable = true;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (response.ok) return;
      retryable = isRetryableStatus(response.status);
      const text = await response.text();
      throw new Error(`[Junction:posthog-server] POST ${url} returned ${response.status}: ${text}`);
    } catch (err) {
      if (!retryable || attempt >= maxRetries) throw err;
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
  const maxBufferSize = config.maxBufferSize ?? 1000;

  let buffer: PostHogCaptureEvent[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    const single = batchSize <= 1;
    const url = single ? `${host}/capture/` : `${host}/batch/`;
    try {
      await postWithRetry(url, config.apiKey, batch, single, maxRetries);
    } catch (err) {
      // Don't drop the batch on an exhausted-retry failure — requeue it (ahead
      // of anything buffered while we were awaiting) so a later flush retries.
      buffer = [...batch, ...buffer];
      if (buffer.length > maxBufferSize) {
        const dropped = buffer.length - maxBufferSize;
        buffer = buffer.slice(dropped); // drop oldest to bound memory
        console.error(`[Junction:posthog-server] buffer exceeded ${maxBufferSize}; dropped ${dropped} oldest event(s)`);
      }
      throw err;
    }
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
          // Always surface timer-driven flush failures. This path runs outside
          // the collector's send() wrapper, so a swallowed error here would be
          // completely invisible to operators.
          void flush().catch((err) => {
            console.error("[Junction:posthog-server] scheduled flush failed:", err);
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
