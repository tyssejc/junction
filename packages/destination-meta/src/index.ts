/**
 * @junctionjs/destination-meta
 *
 * Meta (Facebook) destination for Junction.
 *
 * Client-side: Meta Pixel (fbq)
 * Server-side: Conversions API (CAPI)
 *
 * Design: Both modes can run simultaneously for "redundant" event
 * delivery (Meta recommends this for signal quality + dedup).
 * The event_id field is shared between pixel and CAPI for deduplication.
 */

import type { Destination, JctEvent, ConsentState } from "@junctionjs/core";

// ─── Configuration ───────────────────────────────────────────────

export interface MetaConfig {
  /** Meta Pixel ID */
  pixelId: string;

  /** Conversions API access token (server-side only) */
  accessToken?: string;

  /** Test event code (for CAPI testing) */
  testEventCode?: string;

  /** Whether to load the Meta Pixel script if not present (default: true) */
  loadScript?: boolean;

  /** Enable advanced matching (hashed email, phone, etc.) */
  advancedMatching?: boolean;

  /** Custom event name mapping */
  eventNameMap?: Record<string, string>;
}

// ─── Meta Standard Events ────────────────────────────────────────

const META_EVENT_MAP: Record<string, string> = {
  "page:viewed": "PageView",
  "product:viewed": "ViewContent",
  "product:added": "AddToCart",
  "product:list_viewed": "ViewContent",
  "checkout:started": "InitiateCheckout",
  "checkout:payment_added": "AddPaymentInfo",
  "order:completed": "Purchase",
  "search:performed": "Search",
  "user:signed_up": "CompleteRegistration",
  "user:subscribed": "Subscribe",
  "lead:created": "Lead",
  "content:viewed": "ViewContent",
  "wishlist:added": "AddToWishlist",
};

function getMetaEventName(event: JctEvent, config: MetaConfig): string {
  const key = `${event.entity}:${event.action}`;
  return config.eventNameMap?.[key] ?? META_EVENT_MAP[key] ?? `Custom_${event.entity}_${event.action}`;
}

// ─── Meta Parameter Mapping ──────────────────────────────────────

function mapToMetaParams(event: JctEvent): Record<string, unknown> {
  const props = event.properties;
  const params: Record<string, unknown> = {};

  // Standard Meta parameters
  if (props.total || props.revenue || props.price) {
    params.value = props.total ?? props.revenue ?? props.price;
  }
  if (props.currency) params.currency = props.currency;
  if (props.product_id || props.name) {
    params.content_ids = [props.product_id ?? props.name];
    params.content_name = props.name;
    params.content_type = "product";
  }
  if (props.category) params.content_category = props.category;
  if (props.search_term || props.query) params.search_string = props.search_term ?? props.query;
  if (props.order_id) params.order_id = props.order_id;
  if (props.quantity) params.num_items = props.quantity;

  return params;
}

// ─── CAPI Payload ────────────────────────────────────────────────

interface CAPIPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    event_id: string;
    event_source_url?: string;
    user_data: {
      client_ip_address?: string;
      client_user_agent?: string;
      fbc?: string;
      fbp?: string;
      external_id?: string;
      em?: string; // hashed email
      ph?: string; // hashed phone
    };
    custom_data: Record<string, unknown>;
    action_source: "website" | "email" | "app" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other";
  }>;
  test_event_code?: string;
}

function buildCAPIPayload(
  event: JctEvent,
  eventName: string,
  params: Record<string, unknown>,
  config: MetaConfig,
): CAPIPayload {
  return {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
        event_id: event.id, // shared with pixel for dedup
        event_source_url: event.context.page?.url,
        user_data: {
          client_user_agent: event.context.device?.userAgent,
          external_id: event.user.userId,
          // fbc/fbp cookies would be extracted from context
        },
        custom_data: params,
        action_source: "website",
      },
    ],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };
}

// ─── Pixel Loader ────────────────────────────────────────────────

function loadPixel(pixelId: string): void {
  if (typeof window === "undefined") return;
  if (typeof (window as any).fbq === "function") return;

  // Standard Meta Pixel initialization
  const n: any = ((window as any).fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!(window as any)._fbq) (window as any)._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  (window as any).fbq("init", pixelId);
}

// ─── Destination Export ──────────────────────────────────────────

interface MetaPayload {
  eventName: string;
  params: Record<string, unknown>;
  eventId: string;
  event: JctEvent;
}

export const meta: Destination<MetaConfig> = {
  name: "meta",
  description: "Meta Pixel + Conversions API",
  version: "0.1.0",
  consent: ["marketing"],
  runtime: "both",

  init(config: MetaConfig) {
    if (!config.pixelId) {
      throw new Error("[Junction:Meta] pixelId is required");
    }

    if (typeof window !== "undefined" && config.loadScript !== false) {
      loadPixel(config.pixelId);
    }
  },

  transform(event: JctEvent): MetaPayload | null {
    if (event.entity === "_system") return null;

    const eventName = getMetaEventName(event, {} as MetaConfig);
    const params = mapToMetaParams(event);

    return {
      eventName,
      params,
      eventId: event.id,
      event,
    };
  },

  async send(payload: unknown, config: MetaConfig) {
    const { eventName, params, eventId, event } = payload as MetaPayload;

    // Client-side: Meta Pixel
    if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
      const isStandard = Object.values(META_EVENT_MAP).includes(eventName);
      if (isStandard) {
        (window as any).fbq("track", eventName, params, { eventID: eventId });
      } else {
        (window as any).fbq("trackCustom", eventName, params, { eventID: eventId });
      }
    }

    // Server-side: Conversions API
    if (config.accessToken) {
      const capiPayload = buildCAPIPayload(event, eventName, params, config);

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${config.pixelId}/events?access_token=${config.accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(capiPayload),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Meta CAPI error (${response.status}): ${body}`);
      }
    }
  },

  onConsent(state: ConsentState) {
    // Meta doesn't have a formal consent mode like Google,
    // but we can revoke pixel if marketing consent is denied
    if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
      if (state.marketing === false) {
        (window as any).fbq("consent", "revoke");
      } else if (state.marketing === true) {
        (window as any).fbq("consent", "grant");
      }
    }
  },
};

export default meta;
