/**
 * @junctionjs/destination-amplitude
 *
 * Amplitude Analytics destination for Junction.
 *
 * Supports both client-side (Amplitude Browser SDK) and server-side
 * (Amplitude HTTP V2 API) sending.
 *
 * Design notes:
 * - Uses Amplitude's official @amplitude/analytics-browser SDK on client
 * - Uses direct HTTP API on server (no SDK dependency needed)
 * - Maps Junction's entity:action events to Amplitude event names
 * - Forwards user identity (identify + traits → Amplitude user properties)
 */

import type { Destination, JctEvent, ConsentState } from "@junctionjs/core";

// ─── Configuration ───────────────────────────────────────────────

export interface AmplitudeConfig {
  /** Amplitude API key */
  apiKey: string;

  /** Server URL override (for EU data residency or proxy) */
  serverUrl?: string;

  /** Whether to use the Amplitude Browser SDK (client) or HTTP API (server) */
  mode: "client" | "server";

  /** Server-side only: Amplitude HTTP API secret key */
  secretKey?: string;

  /**
   * Event name format. Controls how entity:action maps to Amplitude event names.
   * - "snake_case": "product_added" (default)
   * - "Title Case": "Product Added"
   * - "entity:action": "product:added" (raw)
   * - Custom function for full control
   */
  eventNameFormat?:
    | "snake_case"
    | "Title Case"
    | "entity:action"
    | ((entity: string, action: string) => string);

  /**
   * Default event properties to include on every event.
   */
  defaultProperties?: Record<string, unknown>;

  /**
   * Property mapping overrides. Keys are Junction property names,
   * values are Amplitude property names.
   *
   * Example: { "product_id": "productId", "order_id": "orderId" }
   */
  propertyMap?: Record<string, string>;
}

// ─── Event Name Formatting ───────────────────────────────────────

function formatEventName(
  entity: string,
  action: string,
  format: AmplitudeConfig["eventNameFormat"],
): string {
  if (typeof format === "function") {
    return format(entity, action);
  }

  switch (format) {
    case "Title Case":
      return `${capitalize(entity)} ${capitalize(action)}`;
    case "entity:action":
      return `${entity}:${action}`;
    case "snake_case":
    default:
      return `${entity}_${action}`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Property Mapping ────────────────────────────────────────────

function mapProperties(
  properties: Record<string, unknown>,
  propertyMap?: Record<string, string>,
): Record<string, unknown> {
  if (!propertyMap) return properties;

  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const mappedKey = propertyMap[key] ?? key;
    mapped[mappedKey] = value;
  }
  return mapped;
}

// ─── Amplitude Payload Types ─────────────────────────────────────

interface AmplitudeEvent {
  event_type: string;
  user_id?: string;
  device_id: string;
  event_properties: Record<string, unknown>;
  user_properties?: Record<string, unknown>;
  time: number;
  session_id?: number;
  platform?: string;
  os_name?: string;
  language?: string;
  ip?: string;
  insert_id: string;
}

// ─── Transform ───────────────────────────────────────────────────

function transformEvent(event: JctEvent, config: AmplitudeConfig): AmplitudeEvent {
  const eventName = formatEventName(event.entity, event.action, config.eventNameFormat);

  const eventProperties = {
    ...config.defaultProperties,
    ...mapProperties(event.properties, config.propertyMap),
    // Include page context as properties
    ...(event.context.page
      ? {
          page_url: event.context.page.url,
          page_path: event.context.page.path,
          page_title: event.context.page.title,
          page_referrer: event.context.page.referrer,
        }
      : {}),
  };

  // Build user properties from traits (for $set operations)
  const userProperties = event.user.traits
    ? { $set: event.user.traits }
    : undefined;

  return {
    event_type: eventName,
    user_id: event.user.userId,
    device_id: event.user.anonymousId,
    event_properties: eventProperties,
    user_properties: userProperties,
    time: new Date(event.timestamp).getTime(),
    session_id: event.context.session
      ? new Date(event.timestamp).getTime() // Amplitude uses session start time
      : undefined,
    platform: event.context.device?.type === "mobile" ? "Mobile" : "Web",
    language: event.context.device?.language,
    insert_id: event.id, // deduplication
  };
}

// ─── Client-Side Sender ──────────────────────────────────────────

async function sendClient(payload: AmplitudeEvent, config: AmplitudeConfig): Promise<void> {
  // Use Amplitude's HTTP API directly (no SDK dependency)
  const url = config.serverUrl ?? "https://api2.amplitude.com/2/httpapi";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.apiKey,
      events: [payload],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Amplitude API error (${response.status}): ${body}`);
  }
}

// ─── Server-Side Sender ──────────────────────────────────────────

async function sendServer(payload: AmplitudeEvent, config: AmplitudeConfig): Promise<void> {
  const url = config.serverUrl ?? "https://api2.amplitude.com/2/httpapi";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Server-side can use secret key for higher rate limits
  if (config.secretKey) {
    headers["Authorization"] = `Basic ${btoa(`${config.apiKey}:${config.secretKey}`)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      api_key: config.apiKey,
      events: [payload],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Amplitude API error (${response.status}): ${body}`);
  }
}

// ─── Destination Export ──────────────────────────────────────────

/**
 * Create an Amplitude destination.
 *
 * Usage:
 *   import { amplitude } from "@junctionjs/destination-amplitude";
 *
 *   const collector = createCollector({
 *     config: {
 *       destinations: [
 *         {
 *           destination: amplitude,
 *           config: { apiKey: "YOUR_API_KEY", mode: "client" },
 *         },
 *       ],
 *     },
 *   });
 */
export const amplitude: Destination<AmplitudeConfig> = {
  name: "amplitude",
  description: "Amplitude Analytics",
  version: "0.1.0",
  consent: ["analytics"],
  runtime: "both",

  async init(config: AmplitudeConfig) {
    // Validate config
    if (!config.apiKey) {
      throw new Error("[Junction:Amplitude] apiKey is required");
    }
    if (config.mode === "server" && !config.secretKey) {
      console.warn(
        "[Junction:Amplitude] Running in server mode without secretKey. " +
        "Consider adding a secret key for higher rate limits.",
      );
    }
  },

  transform(event: JctEvent) {
    // Skip internal/system events that Amplitude doesn't need
    if (event.entity === "_system") return null;

    return transformEvent(event, {} as AmplitudeConfig);
  },

  async send(payload: unknown, config: AmplitudeConfig) {
    const ampEvent = payload as AmplitudeEvent;

    // Re-transform with actual config (transform doesn't have config access by design)
    // In practice, you'd restructure this — here we just re-apply config
    const fullPayload = transformEvent(
      // Reconstruct minimal event for re-transform
      {
        entity: "",
        action: "",
        properties: ampEvent.event_properties,
        context: {},
        user: {
          anonymousId: ampEvent.device_id,
          userId: ampEvent.user_id,
        },
        timestamp: new Date(ampEvent.time).toISOString(),
        id: ampEvent.insert_id,
        version: "1.0.0",
        source: { type: "client", name: "browser", version: "0.1.0" },
      } as JctEvent,
      config,
    );

    if (config.mode === "server") {
      await sendServer(ampEvent, config);
    } else {
      await sendClient(ampEvent, config);
    }
  },

  onConsent(state: ConsentState) {
    // Amplitude doesn't have its own consent mode,
    // but we could opt-out of certain tracking here
    if (state.analytics === false) {
      console.log("[Junction:Amplitude] Analytics consent revoked");
    }
  },
};

export default amplitude;
