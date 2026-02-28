/**
 * junction.config.ts — Example Configuration
 *
 * This is the "single source of truth" for your Junction setup.
 * It lives in your Git repo, gets versioned, reviewed via PRs,
 * and deployed via CI/CD.
 *
 * Design philosophy:
 * - Config-as-code, not config-as-UI-state (goodbye GTM JSON exports)
 * - TypeScript for type safety (autocomplete your destination configs)
 * - Environment-aware (different API keys for dev/staging/prod)
 * - Auditable (every change is a Git commit with a diff)
 *
 * This is what Adobe Launch's "Library" concept SHOULD have been,
 * and what GTM's "Container" would be if it were developer-friendly.
 */

import type { AutoCollectConfig } from "@junctionjs/auto-collect";
import type { CollectorConfig, EventContract } from "@junctionjs/core";
import { schemas } from "@junctionjs/core";
import { amplitude } from "@junctionjs/destination-amplitude";
import { ga4 } from "@junctionjs/destination-ga4";
import { meta } from "@junctionjs/destination-meta";
import { z } from "zod";

// ─── Environment ─────────────────────────────────────────────────

const env = process.env.NODE_ENV ?? "development";

const AMPLITUDE_KEYS: Record<string, string> = {
  development: "dev-api-key-here",
  staging: "staging-api-key-here",
  production: "prod-api-key-here",
};

const GA4_IDS: Record<string, string> = {
  development: "G-DEV000000",
  staging: "G-STG000000",
  production: "G-PROD00000",
};

const META_PIXELS: Record<string, string> = {
  development: "000000000000000",
  staging: "111111111111111",
  production: "222222222222222",
};

// ─── Event Contracts (Schema Validation) ─────────────────────────

/**
 * Define what events MUST look like. These are enforced at runtime.
 * If a developer pushes a malformed event, it gets caught BEFORE
 * it reaches any destination.
 *
 * This is what neither GTM nor Launch provides — and it's the thing
 * that prevents "someone typo'd the event name and broke the funnel"
 * disasters.
 */
const contracts: EventContract[] = [
  {
    entity: "product",
    action: "viewed",
    version: "1.0.0",
    description: "User viewed a product detail page",
    mode: "strict",
    schema: z.object({
      product_id: schemas.product.product_id,
      name: schemas.product.name,
      price: schemas.product.price,
      currency: schemas.product.currency,
      category: schemas.product.category,
      brand: schemas.product.brand,
    }),
  },
  {
    entity: "product",
    action: "added",
    version: "1.0.0",
    description: "User added a product to cart",
    mode: "strict",
    schema: z.object({
      product_id: schemas.product.product_id,
      name: schemas.product.name,
      price: schemas.product.price,
      currency: schemas.product.currency,
      quantity: z.number().int().positive(),
    }),
  },
  {
    entity: "order",
    action: "completed",
    version: "1.0.0",
    description: "User completed a purchase",
    mode: "strict",
    schema: z.object({
      order_id: schemas.order.order_id,
      total: schemas.order.total,
      revenue: schemas.order.revenue,
      tax: schemas.order.tax,
      shipping: schemas.order.shipping,
      currency: schemas.order.currency,
      coupon: schemas.order.coupon,
      products: z.array(
        z.object({
          product_id: z.string().min(1),
          name: z.string().min(1),
          price: z.number().nonnegative(),
          quantity: z.number().int().positive(),
        }),
      ),
    }),
  },
  {
    entity: "page",
    action: "viewed",
    version: "1.0.0",
    description: "User viewed a page",
    mode: "lenient", // lenient: warn but don't block (page views are auto-tracked)
    schema: z.object({
      title: z.string().optional(),
      path: z.string().optional(),
    }),
  },
  {
    entity: "search",
    action: "performed",
    version: "1.0.0",
    description: "User performed a search",
    mode: "strict",
    schema: z.object({
      query: z.string().min(1),
      results_count: z.number().int().nonnegative().optional(),
      category: z.string().optional(),
    }),
  },
];

// ─── Collector Configuration ─────────────────────────────────────

export const config: CollectorConfig = {
  name: "my-ecommerce-site",
  environment: env,

  // Global properties merged into every event
  globals: {
    site_version: "2.4.1",
    platform: "astro",
  },

  // Consent configuration
  consent: {
    defaultState: {
      necessary: true,
      // Everything else starts undefined (pending)
    },
    queueTimeout: 30_000, // Queue events for 30s while waiting for consent
    respectDNT: true,
    respectGPC: true,
  },

  // Destinations — all gated by consent
  destinations: [
    {
      destination: amplitude,
      config: {
        apiKey: AMPLITUDE_KEYS[env] ?? AMPLITUDE_KEYS.development,
        mode: "client" as const,
        eventNameFormat: "snake_case" as const,
      },
      consent: ["analytics"],
    },
    {
      destination: ga4,
      config: {
        measurementId: GA4_IDS[env] ?? GA4_IDS.development,
        consentMode: true,
        sendPageView: false, // Junction handles page views
      },
      consent: ["analytics"],
    },
    {
      destination: meta,
      config: {
        pixelId: META_PIXELS[env] ?? META_PIXELS.development,
        // CAPI access token only in production (server-side)
        ...(env === "production" ? { accessToken: process.env.META_CAPI_TOKEN } : {}),
      },
      consent: ["marketing"],
    },
  ],

  // Schema contracts
  contracts,

  // Buffer configuration
  buffer: {
    maxSize: 10,
    maxWait: 2000,
  },

  // Debug in non-production
  debug: env !== "production",
};

// ─── Auto-Collect Configuration ──────────────────────────────────

/**
 * Configure which browser events are automatically collected.
 * Each feature is individually opt-in. Set to `true` for defaults
 * or pass an options object for fine-grained control.
 *
 * Usage:
 *   import { createClient } from "@junctionjs/client";
 *   import { createAutoCollect } from "@junctionjs/auto-collect";
 *
 *   const client = createClient(config);
 *   const autoCollect = createAutoCollect(client, autoCollectConfig);
 */
export const autoCollectConfig: AutoCollectConfig = {
  // Track clicks on buttons, outbound links, and download links
  clicks: true,

  // Track scroll depth milestones
  scrollDepth: { thresholds: [25, 50, 75, 100] },

  // Track form submissions (captures form metadata, never field values)
  formSubmit: true,

  // Track page engagement (time on page, visibility, heartbeats)
  engagement: { heartbeatInterval: 15_000 },

  // Track Core Web Vitals (CLS, LCP, INP, TTFB, FCP)
  webVitals: true,

  // Video tracking disabled — enable with `video: true` if you have HTML5 videos
  // video: true,
};

export default config;
