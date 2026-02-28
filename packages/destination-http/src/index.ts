/**
 * @junctionjs/destination-http
 *
 * Generic HTTP destination for Junction. POST events to any HTTP
 * endpoint — Plausible, Fathom, Umami, Slack webhooks, or custom APIs.
 *
 * Uses a factory function so that `transform` has access to user config
 * via closure, which the Destination interface doesn't provide natively.
 */

import type { ConsentCategory, Destination, JctEvent } from "@junctionjs/core";

// ─── Configuration ───────────────────────────────────────────────

export interface HttpConfig {
  /** Target endpoint URL (required) */
  url: string;

  /** HTTP method (default: "POST") */
  method?: "POST" | "PUT" | "PATCH";

  /** Static headers merged into every request */
  headers?: Record<string, string>;

  /** Dynamic headers derived from the event (e.g., User-Agent forwarding) */
  headersFn?: (event: JctEvent) => Record<string, string>;

  /** Custom event transform; return null to skip the event */
  transform?: (event: JctEvent) => unknown | null;

  /** Custom body serializer (default: JSON.stringify) */
  serialize?: (payload: unknown) => string;

  /** Destination name override (default: "http") — useful when registering multiple instances */
  name?: string;

  /** Consent categories (default: ["analytics"]) */
  consent?: ConsentCategory[];

  /** Runtime constraint (default: "both") */
  runtime?: "client" | "server" | "both";

  /** Called when the endpoint returns a non-2xx response */
  onError?: (response: Response, payload: unknown) => void | Promise<void>;
}

// ─── Internal Payload ────────────────────────────────────────────

interface HttpPayload {
  event: JctEvent;
  body: unknown;
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * Create a generic HTTP destination.
 *
 * @example
 * ```ts
 * import { http } from "@junctionjs/destination-http";
 *
 * const plausible = http({
 *   name: "plausible",
 *   url: "https://plausible.io/api/event",
 *   runtime: "server",
 *   headersFn: (event) => ({
 *     "User-Agent": event.context.device?.userAgent ?? "",
 *   }),
 *   transform: (event) => ({
 *     domain: "example.com",
 *     name: event.entity === "page" && event.action === "viewed"
 *       ? "pageview"
 *       : `${event.entity}:${event.action}`,
 *     url: event.context.page?.url ?? "/",
 *   }),
 * });
 * ```
 */
export function http(config: HttpConfig): Destination<HttpConfig> {
  return {
    name: config.name ?? "http",
    version: "0.1.0",
    consent: config.consent ?? ["analytics"],
    runtime: config.runtime ?? "both",

    init() {
      if (!config.url) {
        throw new Error(`[Junction:${config.name ?? "http"}] url is required`);
      }
    },

    transform(event: JctEvent, _config: HttpConfig): HttpPayload | null {
      const body = config.transform ? config.transform(event) : event;
      if (body == null) return null;
      return { event, body };
    },

    async send(payload: unknown) {
      const { event, body } = payload as HttpPayload;

      const serialize = config.serialize ?? JSON.stringify;
      const method = config.method ?? "POST";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...config.headers,
        ...config.headersFn?.(event),
      };

      const response = await fetch(config.url, {
        method,
        headers,
        body: serialize(body),
      });

      if (!response.ok) {
        if (config.onError) {
          await config.onError(response, body);
        } else {
          const text = await response.text();
          throw new Error(
            `[Junction:${config.name ?? "http"}] ${method} ${config.url} returned ${response.status}: ${text}`,
          );
        }
      }
    },
  };
}

export default http;
