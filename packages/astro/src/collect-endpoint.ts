/**
 * @junctionjs/astro - Server-Side Collect Endpoint
 *
 * API endpoint that receives events from the client and forwards
 * them to server-side destinations. This is the "forward proxy"
 * pattern from the Tag Manager Evolved doc.
 *
 * Benefits:
 * - API keys for server-side destinations never touch the client
 * - Events can be enriched with server-side context (IP, geo)
 * - Acts as a first-party endpoint (no ad-blocker issues)
 * - Can batch and deduplicate before forwarding
 *
 * POST /api/collect
 * Body: { events: JctEvent[] }
 */

import type { JctEvent } from "@junctionjs/core";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
  try {
    const body = await context.request.json();
    const events: JctEvent[] = body.events;

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: "No events provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get server context from middleware
    const junctionLocals = (context.locals as any).junction;

    // Enrich events with server-side context
    const enrichedEvents = events.map((event) => ({
      ...event,
      context: {
        ...event.context,
        server: junctionLocals
          ? {
              ip: junctionLocals.serverContext.ip,
              geo: junctionLocals.serverContext.geo,
              sessionId: junctionLocals.sessionId,
            }
          : undefined,
      },
    }));

    // ── Forward to server-side destinations ──
    //
    // In a full implementation, this is where you'd have a server-side
    // collector instance with server-side destinations configured.
    // For now, we just acknowledge receipt.
    //
    // Example:
    //   const serverCollector = getServerCollector(); // singleton
    //   for (const event of enrichedEvents) {
    //     serverCollector.track(event.entity, event.action, event.properties);
    //   }

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Junction:Server] Received ${enrichedEvents.length} events`);
      for (const event of enrichedEvents) {
        console.log(`  → ${event.entity}:${event.action}`, event.properties);
      }
    }

    return new Response(JSON.stringify({ ok: true, received: events.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Junction:Server] Collect endpoint error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
