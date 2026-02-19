/**
 * @junctionjs/destination-plausible
 *
 * Privacy-first Plausible Analytics destination for Junction.
 * Uses consent: "exempt" — no cookies, no PII, no consent required.
 *
 * Plausible Events API reference:
 *   https://plausible.io/docs/events-api
 *
 * Designed for server-side use so the required User-Agent and
 * X-Forwarded-For headers can be set from the original request.
 */

import type { Destination, JctEvent } from "@junctionjs/core";

// ─── Configuration ───────────────────────────────────────────────

export interface PlausibleConfig {
  /** Your site domain as registered in Plausible (e.g. "example.com") */
  domain: string;

  /** Plausible API host (default: "https://plausible.io") — set for self-hosted */
  apiHost?: string;

  /** Map Junction event → Plausible event name. Return null to skip. */
  eventName?: (event: JctEvent) => string | null;

  /** Map Junction event → Plausible custom props (max 30) */
  props?: (event: JctEvent) => Record<string, string | number | boolean> | undefined;

  /** Map Junction event → Plausible revenue data */
  revenue?: (event: JctEvent) => { currency: string; amount: number } | undefined;
}

// ─── Internal Payload ────────────────────────────────────────────

interface PlausiblePayload {
  event: JctEvent;
  body: PlausibleEventBody;
}

interface PlausibleEventBody {
  domain: string;
  name: string;
  url: string;
  referrer?: string;
  props?: Record<string, string | number | boolean>;
  revenue?: { currency: string; amount: number };
}

// ─── Defaults ────────────────────────────────────────────────────

function defaultEventName(event: JctEvent): string {
  if (event.entity === "page" && event.action === "viewed") return "pageview";
  return `${event.entity}:${event.action}`;
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * Create a Plausible Analytics destination.
 *
 * @example
 * ```ts
 * import { plausible } from "@junctionjs/destination-plausible";
 *
 * const dest = plausible({ domain: "example.com" });
 * ```
 *
 * @example Self-hosted with custom props
 * ```ts
 * const dest = plausible({
 *   domain: "example.com",
 *   apiHost: "https://analytics.example.com",
 *   props: (event) => ({
 *     path: event.context.page?.path ?? "/",
 *   }),
 * });
 * ```
 */
export function plausible(config: PlausibleConfig): Destination<PlausibleConfig> {
  const apiHost = (config.apiHost ?? "https://plausible.io").replace(/\/$/, "");

  return {
    name: "plausible",
    version: "0.1.0",
    consent: ["exempt"],
    runtime: "server",

    init() {
      if (!config.domain) {
        throw new Error("[Junction:plausible] domain is required");
      }
    },

    transform(event: JctEvent): PlausiblePayload | null {
      const nameMapper = config.eventName ?? defaultEventName;
      const name = nameMapper(event);
      if (name == null) return null;

      const body: PlausibleEventBody = {
        domain: config.domain,
        name,
        url: event.context.page?.url ?? "/",
      };

      if (event.context.page?.referrer) {
        body.referrer = event.context.page.referrer;
      }

      const props = config.props?.(event);
      if (props) body.props = props;

      const revenue = config.revenue?.(event);
      if (revenue) body.revenue = revenue;

      return { event, body };
    },

    async send(payload: unknown) {
      const { event, body } = payload as PlausiblePayload;

      const userAgent = event.context.device?.userAgent ?? "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      };

      const response = await fetch(`${apiHost}/api/event`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`[Junction:plausible] POST ${apiHost}/api/event returned ${response.status}: ${text}`);
      }
    },
  };
}

export default plausible;
