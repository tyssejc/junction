/**
 * @junctionjs/destination-ga4
 *
 * Google Analytics 4 destination for Junction.
 *
 * Client-side: uses gtag.js (loaded lazily if not present)
 * Server-side: uses GA4 Measurement Protocol
 *
 * Handles Google's consent mode (v2) natively — when consent state
 * changes, we update gtag's consent settings automatically.
 */

import type { ConsentSignal, ConsentState, Destination, JctEvent } from "@junctionjs/core";

// ─── Configuration ───────────────────────────────────────────────

export interface GA4Config {
  /** GA4 Measurement ID (e.g., "G-XXXXXXXXXX") */
  measurementId: string;

  /** Server-side: GA4 Measurement Protocol API secret */
  apiSecret?: string;

  /** Whether to load gtag.js if not already present (default: true) */
  loadScript?: boolean;

  /** Custom gtag.js URL (for self-hosting or proxy) */
  gtagUrl?: string;

  /**
   * Enable Google Consent Mode v2.
   * When true, Junction's consent state maps to Google's consent categories.
   */
  consentMode?: boolean;

  /** Send page_view events automatically (default: false — Junction handles this) */
  sendPageView?: boolean;

  /** Custom event name mapping */
  eventNameMap?: Record<string, string>;

  /** Custom parameter mapping */
  parameterMap?: Record<string, string>;
}

// ─── Consent Mode Mapping ────────────────────────────────────────

/**
 * Maps Junction consent categories to Google's consent mode signals.
 * Google's categories:
 *   - ad_storage (marketing)
 *   - analytics_storage (analytics)
 *   - ad_user_data (marketing)
 *   - ad_personalization (personalization)
 *   - personalization_storage (personalization)
 *   - functionality_storage (necessary)
 *   - security_storage (necessary)
 */
function mapConsentToGoogle(state: ConsentState): Record<string, "granted" | "denied"> {
  return {
    ad_storage: state.marketing ? "granted" : "denied",
    analytics_storage: state.analytics ? "granted" : "denied",
    ad_user_data: state.marketing ? "granted" : "denied",
    ad_personalization: state.personalization ? "granted" : "denied",
    personalization_storage: state.personalization ? "granted" : "denied",
    functionality_storage: state.necessary !== false ? "granted" : "denied",
    security_storage: "granted", // always granted
  };
}

/**
 * Returns a ConsentSignal that integrates Google Consent Mode v2.
 *
 * Use this signal with Junction's consent manager instead of enabling
 * `consentMode: true` on the ga4 destination directly. The signal sets
 * default denied states via `gtag("consent", "default", ...)` during `init`,
 * then updates them via `gtag("consent", "update", ...)` when consent changes.
 *
 * @example
 * junction.consent.addSignal(googleConsentMode({ waitForUpdate: 500 }));
 */
export function googleConsentMode(options?: { waitForUpdate?: number }): ConsentSignal {
  return {
    name: "google-consent-mode-v2",
    init() {
      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        (window as any).gtag("consent", "default", {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          ...(options?.waitForUpdate ? { wait_for_update: options.waitForUpdate } : {}),
        });
      }
    },
    update(state: ConsentState) {
      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        (window as any).gtag("consent", "update", mapConsentToGoogle(state));
      }
    },
  };
}

// ─── GA4 Event Mapping ───────────────────────────────────────────

/**
 * Maps Junction entity:action to GA4 recommended events where possible.
 * Falls back to custom event naming for non-standard events.
 *
 * https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */
const GA4_EVENT_MAP: Record<string, string> = {
  "page:viewed": "page_view",
  "product:viewed": "view_item",
  "product:added": "add_to_cart",
  "product:removed": "remove_from_cart",
  "product:list_viewed": "view_item_list",
  "product:clicked": "select_item",
  "cart:viewed": "view_cart",
  "checkout:started": "begin_checkout",
  "checkout:shipping_added": "add_shipping_info",
  "checkout:payment_added": "add_payment_info",
  "order:completed": "purchase",
  "order:refunded": "refund",
  "promotion:viewed": "view_promotion",
  "promotion:clicked": "select_promotion",
  "search:performed": "search",
  "user:signed_up": "sign_up",
  "user:logged_in": "login",
  "content:shared": "share",
};

function getGA4EventName(event: JctEvent, config: GA4Config): string {
  const key = `${event.entity}:${event.action}`;

  // Check custom mapping first, then default mapping, then generate
  return config.eventNameMap?.[key] ?? GA4_EVENT_MAP[key] ?? `${event.entity}_${event.action}`;
}

// ─── Parameter Mapping ───────────────────────────────────────────

/**
 * Maps Junction properties to GA4 parameters.
 * GA4 has specific parameter names for e-commerce events.
 */
const GA4_PARAM_MAP: Record<string, string> = {
  product_id: "item_id",
  name: "item_name",
  category: "item_category",
  brand: "item_brand",
  variant: "item_variant",
  price: "price",
  quantity: "quantity",
  order_id: "transaction_id",
  total: "value",
  revenue: "value",
  tax: "tax",
  shipping: "shipping",
  currency: "currency",
  coupon: "coupon",
  search_term: "search_term",
};

function mapParameters(properties: Record<string, unknown>, config: GA4Config): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    const mappedKey = config.parameterMap?.[key] ?? GA4_PARAM_MAP[key] ?? key;
    mapped[mappedKey] = value;
  }

  return mapped;
}

// ─── Transform ───────────────────────────────────────────────────

interface GA4Payload {
  eventName: string;
  parameters: Record<string, unknown>;
  clientId: string;
  userId?: string;
}

function transformEvent(event: JctEvent, config: GA4Config): GA4Payload {
  return {
    eventName: getGA4EventName(event, config),
    parameters: mapParameters(event.properties, config),
    clientId: event.user.anonymousId,
    userId: event.user.userId,
  };
}

// ─── gtag.js Loader ──────────────────────────────────────────────

function loadGtag(measurementId: string, gtagUrl?: string): void {
  if (typeof window === "undefined") return;
  if (typeof (window as any).gtag === "function") return;

  // Initialize dataLayer
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = (...args: any[]) => {
    (window as any).dataLayer.push(args);
  };
  (window as any).gtag("js", new Date());

  // Load script
  const script = document.createElement("script");
  script.async = true;
  script.src = gtagUrl ?? `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

// ─── Destination Factory ─────────────────────────────────────────

/**
 * Create a GA4 destination instance.
 * Each instance has its own consent mode state, avoiding shared module-level flags.
 */
export function createGA4(): Destination<GA4Config> {
  let consentModeEnabled = false;

  return {
    name: "ga4",
    description: "Google Analytics 4",
    version: "0.1.0",
    consent: ["analytics"],
    runtime: "both",

    init(config: GA4Config) {
      if (!config.measurementId) {
        throw new Error("[Junction:GA4] measurementId is required");
      }

      // Client-side: load gtag.js if needed
      if (typeof window !== "undefined" && config.loadScript !== false) {
        loadGtag(config.measurementId, config.gtagUrl);

        // Configure GA4
        const gtagConfig: Record<string, unknown> = {
          send_page_view: config.sendPageView ?? false,
        };

        (window as any).gtag?.("config", config.measurementId, gtagConfig);
      }

      consentModeEnabled = config.consentMode === true;
    },

    transform(event: JctEvent, config: GA4Config) {
      if (event.entity === "_system") return null;
      return transformEvent(event, config);
    },

    async send(payload: unknown, config: GA4Config) {
      const ga4Payload = payload as GA4Payload;

      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        // Client-side: use gtag
        (window as any).gtag("event", ga4Payload.eventName, ga4Payload.parameters);
      } else if (config.apiSecret) {
        // Server-side: Measurement Protocol
        const url = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

        await fetch(url, {
          method: "POST",
          body: JSON.stringify({
            client_id: ga4Payload.clientId,
            ...(ga4Payload.userId ? { user_id: ga4Payload.userId } : {}),
            events: [
              {
                name: ga4Payload.eventName,
                params: ga4Payload.parameters,
              },
            ],
          }),
        });
      }
    },

    onConsent(state: ConsentState) {
      if (!consentModeEnabled) return;

      // Update Google Consent Mode
      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        (window as any).gtag("consent", "update", mapConsentToGoogle(state));
      }
    },
  };
}

/** Default GA4 destination instance for convenience */
export const ga4: Destination<GA4Config> = createGA4();

export default ga4;
