/**
 * @junctionjs/client - Browser Client
 *
 * Browser-specific wrapper around @junctionjs/core collector.
 * Handles: DOM context resolution, persistent anonymous ID,
 * auto page tracking, visibility/unload handling, and
 * the single window global.
 *
 * Design decision: ONE global. `window.jct` (or configurable).
 * Not two like walkerOS. The collector IS the public API.
 */

import {
  type Collector,
  type CollectorConfig,
  type EventContext,
  type EventSource,
  type JctEvent,
  createCollector,
} from "@junctionjs/core";

// ─── Browser Context Resolver ────────────────────────────────────

function resolveBrowserContext(): Partial<EventContext> {
  const ctx: Partial<EventContext> = {};

  // Page info
  if (typeof document !== "undefined") {
    const loc = window.location;
    ctx.page = {
      url: loc.href,
      path: loc.pathname,
      title: document.title,
      referrer: document.referrer,
      search: loc.search,
      hash: loc.hash,
    };
  }

  // Device info
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    ctx.device = {
      type: /mobile/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop",
      userAgent: ua,
      language: navigator.language,
      viewport: typeof window !== "undefined" ? { width: window.innerWidth, height: window.innerHeight } : undefined,
      screenResolution: typeof screen !== "undefined" ? { width: screen.width, height: screen.height } : undefined,
    };
  }

  // Campaign (UTM) parameters
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      term: params.get("utm_term") ?? undefined,
      content: params.get("utm_content") ?? undefined,
    };
    // Only include if at least one param exists
    if (Object.values(utm).some(Boolean)) {
      ctx.campaign = utm;
    }
  }

  return ctx;
}

// ─── Persistent Anonymous ID ─────────────────────────────────────

const ANON_ID_KEY = "_jct_anon_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;

    const id = uuid();
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    // localStorage not available (private browsing, etc.)
    return uuid();
  }
}

// ─── Session Management ──────────────────────────────────────────

const SESSION_KEY = "_jct_session";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  id: string;
  count: number;
  lastActivity: number;
}

function getOrCreateSession(): { id: string; isNew: boolean; count: number } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const now = Date.now();

    if (raw) {
      const data: SessionData = JSON.parse(raw);
      if (now - data.lastActivity < SESSION_TIMEOUT) {
        // Existing session — update last activity
        data.lastActivity = now;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return { id: data.id, isNew: false, count: data.count };
      }
    }

    // New session
    const session: SessionData = {
      id: uuid(),
      count: raw ? (JSON.parse(raw).count ?? 0) + 1 : 1,
      lastActivity: now,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { id: session.id, isNew: true, count: session.count };
  } catch {
    return { id: uuid(), isNew: true, count: 1 };
  }
}

// ─── Client Factory ──────────────────────────────────────────────

export interface ClientConfig extends CollectorConfig {
  /**
   * Name of the window global (default: "jct").
   * Set to false to disable the global entirely.
   */
  globalName?: string | false;

  /**
   * Auto-track page views on initialization and navigation (default: true).
   */
  autoPageView?: boolean;

  /**
   * Use sendBeacon on page unload to flush remaining events (default: true).
   * Only relevant if you have a server-side /collect endpoint.
   */
  useBeacon?: boolean;

  /** Beacon endpoint URL (e.g., "/api/collect" or "https://collect.example.com/v1/events") */
  beaconUrl?: string;
}

export interface JunctionClient extends Collector {
  /** The anonymous ID for this browser */
  anonymousId: string;

  /** Current session info */
  session: { id: string; isNew: boolean; count: number };
}

export function createClient(config: ClientConfig): JunctionClient {
  const anonymousId = getOrCreateAnonymousId();
  const session = getOrCreateSession();

  const source: EventSource = {
    type: "client",
    name: "browser",
    version: "0.1.0",
  };

  // Create the core collector with browser context
  const collector = createCollector({
    config,
    source,
    resolveContext: () => {
      const ctx = resolveBrowserContext();
      ctx.session = session;
      return ctx;
    },
  });

  // Track cleanup functions for teardown
  const cleanupFns: Array<() => void> = [];

  // Wrap collector to inject anonymous ID
  const originalTrack = collector.track;
  const originalShutdown = collector.shutdown;
  const client: JunctionClient = {
    ...collector,
    anonymousId,
    session,
    track(entity, action, properties) {
      originalTrack(entity, action, properties);
    },
    async shutdown() {
      // Run all cleanup functions
      for (const cleanup of cleanupFns) {
        cleanup();
      }
      cleanupFns.length = 0;

      // Remove global
      if (config.globalName !== false && typeof window !== "undefined") {
        const name = config.globalName ?? "jct";
        delete (window as any)[name];
      }

      await originalShutdown();
    },
  };

  // ── Auto page view tracking ────────────────────────────

  if (config.autoPageView !== false) {
    // Initial page view
    client.track("page", "viewed");

    // SPA navigation: listen for popstate and pushState/replaceState
    if (typeof window !== "undefined") {
      // Handle Astro View Transitions
      const astroHandler = () => {
        client.track("page", "viewed");
      };
      document.addEventListener("astro:page-load", astroHandler);
      cleanupFns.push(() => document.removeEventListener("astro:page-load", astroHandler));

      // Handle generic SPA navigation (History API)
      const originalPushState = history.pushState.bind(history);
      const originalReplaceState = history.replaceState.bind(history);

      history.pushState = (...args) => {
        originalPushState(...args);
        client.track("page", "viewed");
      };

      history.replaceState = (...args) => {
        originalReplaceState(...args);
        // Don't track replaceState as page view — it's usually for URL cleanup
      };

      cleanupFns.push(() => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      });

      const popstateHandler = () => {
        client.track("page", "viewed");
      };
      window.addEventListener("popstate", popstateHandler);
      cleanupFns.push(() => window.removeEventListener("popstate", popstateHandler));
    }
  }

  // ── Beacon on unload ───────────────────────────────────

  if (config.useBeacon !== false && config.beaconUrl) {
    const beaconUrl = config.beaconUrl;

    // Track events for sendBeacon on unload
    const beaconQueue: JctEvent[] = [];
    const unsubscribeBeacon = collector.on("event", ({ payload }) => {
      beaconQueue.push(payload as JctEvent);
    });
    const unsubscribeBeaconSend = collector.on("destination:send", () => {
      beaconQueue.length = 0;
    });
    cleanupFns.push(unsubscribeBeacon);
    cleanupFns.push(unsubscribeBeaconSend);

    if (typeof document !== "undefined") {
      const visibilityHandler = () => {
        if (document.visibilityState === "hidden") {
          // Use sendBeacon for reliable delivery on page unload
          if (typeof navigator.sendBeacon === "function" && beaconQueue.length > 0) {
            const blob = new Blob([JSON.stringify({ events: beaconQueue })], { type: "application/json" });
            navigator.sendBeacon(beaconUrl, blob);
            beaconQueue.length = 0;
          }
          collector.flush();
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);
      cleanupFns.push(() => document.removeEventListener("visibilitychange", visibilityHandler));
    }
  }

  // ── Register global ────────────────────────────────────

  if (config.globalName !== false && typeof window !== "undefined") {
    const name = config.globalName ?? "jct";
    (window as any)[name] = client;

    if (config.debug) {
      console.log(`[Junction] Client available as window.${name}`);
    }
  }

  return client;
}
