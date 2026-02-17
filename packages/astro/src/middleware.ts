/**
 * @junctionjs/astro - Server-Side Middleware
 *
 * Runs on every SSR request. Collects server-side context
 * (IP, user agent, geo, session) and makes it available to:
 * 1. The rendered page (via Astro.locals)
 * 2. Server-side destinations (via the gateway)
 * 3. The client (via a serialized cookie/header)
 *
 * This is the Astro equivalent of GTM server containers or
 * Launch event forwarding — but it runs in your own infrastructure.
 */

import { defineMiddleware } from "astro:middleware";

// ─── Session Cookie Management ───────────────────────────────────

const SESSION_COOKIE = "_jct_sid";
const SESSION_TTL = 30 * 60; // 30 minutes in seconds

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

// ─── Middleware ───────────────────────────────────────────────────

export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);

  // Skip non-page requests (assets, API routes, etc.)
  const isPage =
    request.method === "GET" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.match(/\.(js|css|ico|png|jpg|svg|woff2?|ttf)$/);

  // ── Extract server-side context ──

  const serverContext = {
    ip:
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown",

    userAgent: request.headers.get("user-agent") ?? "unknown",

    // Cloudflare-specific geo headers (available on Workers/Pages)
    geo: {
      country: request.headers.get("cf-ipcountry") ?? undefined,
      region: request.headers.get("cf-region") ?? undefined,
      city: request.headers.get("cf-ipcity") ?? undefined,
      // Vercel-specific
      ...(request.headers.get("x-vercel-ip-country") ? { country: request.headers.get("x-vercel-ip-country") } : {}),
    },

    // Referer
    referrer: request.headers.get("referer") ?? undefined,

    // Accept-Language (first preference)
    language: request.headers.get("accept-language")?.split(",")[0]?.split(";")[0] ?? undefined,

    // Request timing
    requestTime: new Date().toISOString(),
  };

  // ── Session management ──

  const existingSessionId = parseSessionCookie(request.headers.get("cookie"));
  const sessionId = existingSessionId ?? crypto.randomUUID();
  const isNewSession = !existingSessionId;

  // ── Attach to Astro.locals ──

  (context.locals as any).junction = {
    serverContext,
    sessionId,
    isNewSession,
    requestPath: url.pathname,
    requestSearch: url.search,
  };

  // ── Continue to route handler ──

  const response = await next();

  // ── Set session cookie if new ──

  if (isNewSession && isPage) {
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; SameSite=Lax; Secure`,
    );
  } else if (!isNewSession && isPage) {
    // Refresh session TTL
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; SameSite=Lax; Secure`,
    );
  }

  return response;
});
