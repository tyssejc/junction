/**
 * @junctionjs/gateway - Edge Gateway (WinterCG-compatible)
 *
 * A forward proxy that runs on any edge runtime (Cloudflare Workers,
 * Deno Deploy, Vercel Edge, Bun, etc.). Receives events from clients
 * and routes them to server-side destinations.
 *
 * This replaces:
 * - GTM Server Containers (Java/Docker, expensive)
 * - Adobe Launch Event Forwarding (proprietary)
 * - Segment/RudderStack's hosted event pipeline
 *
 * Architecture:
 *   Client → POST /collect → Gateway → [Amplitude CAPI, Meta CAPI, BigQuery, etc.]
 *
 * The gateway adds server-side context (IP, geo, timestamp) and forwards
 * to destinations that should NEVER run client-side (warehouses, CAPIs, etc.).
 *
 * WinterCG compatibility means this runs on:
 * - Cloudflare Workers (+ KV for session state)
 * - Deno Deploy
 * - Vercel Edge Functions
 * - Bun
 * - Node.js 18+ (with --experimental-fetch)
 */

import {
  createCollector,
  type Collector,
  type CollectorConfig,
  type EventSource,
  type JctEvent,
  type Destination,
  type DestinationEntry,
} from "@junctionjs/core";

// ─── Gateway Configuration ───────────────────────────────────────

export interface GatewayConfig {
  /** Server-side destinations (these run ONLY on the gateway, never on client) */
  destinations: DestinationEntry[];

  /** Collector config */
  collector: Omit<CollectorConfig, "destinations">;

  /**
   * CORS configuration.
   * Set allowedOrigins to restrict which domains can send events.
   */
  cors?: {
    allowedOrigins: string[] | "*";
    allowCredentials?: boolean;
  };

  /**
   * Rate limiting (per IP).
   * Requires a KV/storage adapter for state.
   */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };

  /**
   * Request validation.
   * Require a shared secret or API key from clients.
   */
  auth?: {
    type: "header" | "bearer";
    key: string;
  };
}

// ─── Gateway Factory ─────────────────────────────────────────────

export interface Gateway {
  /** Handle an incoming request (the main entry point for your edge function) */
  handleRequest: (request: Request) => Promise<Response>;

  /** Get the underlying collector (for programmatic use) */
  collector: Collector;
}

export function createGateway(config: GatewayConfig): Gateway {
  const source: EventSource = {
    type: "server",
    name: "gateway",
    version: "0.1.0",
  };

  const collector = createCollector({
    config: {
      ...config.collector,
      destinations: config.destinations,
    },
    source,
  });

  // ── CORS Headers ──

  function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get("origin") ?? "";
    const allowed = config.cors?.allowedOrigins ?? "*";

    if (allowed === "*") {
      return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };
    }

    if (allowed.includes(origin)) {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        ...(config.cors?.allowCredentials
          ? { "Access-Control-Allow-Credentials": "true" }
          : {}),
      };
    }

    return {};
  }

  // ── Auth Check ──

  function checkAuth(request: Request): boolean {
    if (!config.auth) return true;

    if (config.auth.type === "bearer") {
      const authHeader = request.headers.get("authorization");
      return authHeader === `Bearer ${config.auth.key}`;
    }

    if (config.auth.type === "header") {
      const apiKey = request.headers.get("x-api-key");
      return apiKey === config.auth.key;
    }

    return false;
  }

  // ── Extract Server Context ──

  function extractServerContext(request: Request): Record<string, unknown> {
    return {
      ip:
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown",
      geo: {
        country: request.headers.get("cf-ipcountry"),
        region: request.headers.get("cf-region"),
        city: request.headers.get("cf-ipcity"),
      },
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
    };
  }

  // ── Request Handler ──

  async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    // Only accept POST to /collect (or root)
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" },
      });
    }

    // Auth check
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json() as { events?: JctEvent[] };
      const events = body.events;

      if (!Array.isArray(events) || events.length === 0) {
        return new Response(JSON.stringify({ error: "No events" }), {
          status: 400,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" },
        });
      }

      // Enrich with server context and forward to collector
      const serverContext = extractServerContext(request);

      for (const event of events) {
        collector.track(event.entity, event.action, {
          ...event.properties,
          _server: serverContext,
          _client: event.context,
          _user: event.user,
        });
      }

      // Flush immediately (edge functions are short-lived)
      await collector.flush();

      return new Response(
        JSON.stringify({ ok: true, received: events.length }),
        {
          status: 200,
          headers: { ...corsHeaders(request), "Content-Type": "application/json" },
        },
      );
    } catch (e) {
      console.error("[Junction:Gateway] Error:", e);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders(request), "Content-Type": "application/json" },
      });
    }
  }

  return { handleRequest, collector };
}

// ─── Edge Runtime Entry Points ───────────────────────────────────

/**
 * Cloudflare Workers entry point.
 *
 * Usage in wrangler:
 *   import { createGateway } from "@junctionjs/gateway";
 *   import { amplitude } from "@junctionjs/destination-amplitude";
 *
 *   const gateway = createGateway({
 *     destinations: [
 *       { destination: amplitude, config: { apiKey: "...", mode: "server", secretKey: "..." } },
 *     ],
 *     collector: { name: "my-gateway", environment: "production", consent: { ... } },
 *   });
 *
 *   export default { fetch: gateway.handleRequest };
 */

/**
 * Deno Deploy entry point.
 *
 * Usage:
 *   const gateway = createGateway({ ... });
 *   Deno.serve(gateway.handleRequest);
 */

/**
 * Bun entry point.
 *
 * Usage:
 *   const gateway = createGateway({ ... });
 *   Bun.serve({ fetch: gateway.handleRequest });
 */
