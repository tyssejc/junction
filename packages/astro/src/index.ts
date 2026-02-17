/**
 * @junctionjs/astro - Astro v5+ Integration
 *
 * Provides:
 * 1. An Astro integration (auto-injects client script, handles View Transitions)
 * 2. A middleware factory (server-side event collection)
 * 3. Helper components for declarative tracking
 *
 * Design decisions:
 * - View Transitions are first-class. We hook into astro:page-load and
 *   astro:before-preparation to track navigations correctly.
 * - Middleware collects server-side context (IP, UA, geo) and makes it
 *   available to the client via a serialized data attribute.
 * - The integration injects at "page" stage so tracking runs on every
 *   page as a module script, including those with no client islands.
 */

import type { CollectorConfig } from "@junctionjs/core";
import type { AstroIntegration } from "astro";

// ─── Astro Integration ───────────────────────────────────────────

export interface JunctionAstroConfig {
  /**
   * Junction collector config — destinations, consent, contracts, etc.
   * This will be serialized and injected into the client.
   * IMPORTANT: don't put server-side secrets here! Use the middleware
   * for server-side destinations.
   */
  config: Omit<CollectorConfig, "destinations"> & {
    /**
     * Client-side destination configs.
     * Destinations are referenced by package name and resolved at build time.
     */
    destinations: Array<{
      /** Package name (e.g., "@junctionjs/destination-amplitude") */
      package: string;
      /** Export name (default: "default") */
      export?: string;
      /** Destination-specific config */
      config: Record<string, unknown>;
      /** Consent overrides */
      consent?: string[];
      /** Enable/disable */
      enabled?: boolean;
    }>;
  };

  /**
   * Window global name (default: "jct").
   * Set to false to disable.
   */
  globalName?: string | false;

  /**
   * Auto-track page views (default: true).
   * Handles both initial load and View Transitions.
   */
  autoPageView?: boolean;

  /**
   * Server-side collect endpoint path (default: "/api/collect").
   * Set to false to disable server-side collection.
   */
  collectEndpoint?: string | false;

  /**
   * Enable debug mode (default: false).
   * When true, injects the @junctionjs/debug panel into the page.
   * Tip: use `debug: import.meta.env.DEV` to auto-enable in dev only.
   */
  debug?: boolean;

  /**
   * Debug panel options (only used when debug: true).
   */
  debugOptions?: {
    /** Keyboard shortcut to toggle (default: "ctrl+shift+j") */
    shortcut?: string;
    /** Max events in ring buffer (default: 500) */
    maxEvents?: number;
    /** Start with panel open (default: false) */
    startOpen?: boolean;
    /** Panel position (default: "bottom-right") */
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
}

/**
 * Creates the Astro integration for Junction.
 *
 * Usage in astro.config.mjs:
 *
 *   import { junction } from "@junctionjs/astro";
 *   import { amplitude } from "@junctionjs/destination-amplitude";
 *
 *   export default defineConfig({
 *     integrations: [
 *       junction({
 *         config: {
 *           name: "my-site",
 *           environment: import.meta.env.MODE,
 *           consent: {
 *             defaultState: {},
 *             queueTimeout: 30000,
 *             respectDNT: true,
 *             respectGPC: true,
 *           },
 *           destinations: [
 *             {
 *               package: "@junctionjs/destination-amplitude",
 *               config: { apiKey: import.meta.env.AMPLITUDE_KEY, mode: "client" },
 *             },
 *             {
 *               package: "@junctionjs/destination-ga4",
 *               config: { measurementId: "G-XXXXXXXXXX" },
 *             },
 *           ],
 *         },
 *         debug: import.meta.env.DEV,
 *       }),
 *     ],
 *   });
 */
export function junction(options: JunctionAstroConfig): AstroIntegration {
  return {
    name: "junction",
    hooks: {
      "astro:config:setup": ({ injectScript, addMiddleware, injectRoute }) => {
        const globalName = options.globalName ?? "jct";
        const debug = options.debug ?? false;

        // ── 1. Inject initialization script ──
        //
        // We use "page" rather than "before-hydration" because
        // before-hydration only runs on pages with client islands.
        // We can't use "head-inline" because it's not a module context
        // and our init script uses ES imports.
        // "page" runs as a module on every page — exactly what we need.

        // Build destination imports
        const destinationImports = options.config.destinations
          .filter((d) => d.enabled !== false)
          .map((d, i) => {
            const exportName = d.export ?? "default";
            return `import { ${exportName} as dest_${i} } from "${d.package}";`;
          })
          .join("\n");

        const destinationArray = options.config.destinations
          .filter((d) => d.enabled !== false)
          .map((d, i) => {
            return `{
              destination: dest_${i},
              config: ${JSON.stringify(d.config)},
              ${d.consent ? `consent: ${JSON.stringify(d.consent)},` : ""}
            }`;
          })
          .join(",\n");

        const initScript = `
          ${destinationImports}
          import { createClient } from "@junctionjs/client";

          const client = createClient({
            name: ${JSON.stringify(options.config.name)},
            environment: ${JSON.stringify(options.config.environment)},
            consent: ${JSON.stringify(options.config.consent)},
            destinations: [${destinationArray}],
            debug: ${debug},
            globalName: ${JSON.stringify(globalName)},
            autoPageView: ${options.autoPageView !== false},
            ${options.collectEndpoint !== false ? `beaconUrl: ${JSON.stringify(options.collectEndpoint ?? "/api/collect")},` : ""}
          });
        `;

        injectScript("page", initScript);

        // ── 2. Inject View Transitions handler ──

        if (options.autoPageView !== false) {
          injectScript(
            "page",
            `
            // Junction: View Transitions page tracking
            // astro:page-load fires on both initial load and View Transition navigations.
            // The client already tracks initial page view, so we only track subsequent ones here.
            let isFirstLoad = true;
            document.addEventListener("astro:page-load", () => {
              if (isFirstLoad) {
                isFirstLoad = false;
                return; // skip — client already tracked initial page view
              }
              if (window.${globalName}) {
                window.${globalName}.track("page", "viewed");
              }
            });

            // Track navigation timing for performance monitoring
            let navStart = 0;
            document.addEventListener("astro:before-preparation", () => {
              navStart = performance.now();
            });
            document.addEventListener("astro:page-load", () => {
              if (navStart > 0 && window.${globalName}) {
                const duration = Math.round(performance.now() - navStart);
                window.${globalName}.track("navigation", "completed", {
                  duration_ms: duration,
                  from: document.referrer,
                  to: window.location.pathname,
                });
                navStart = 0;
              }
            });
            `,
          );
        }

        // ── 3. Inject debug panel (when debug: true) ──

        if (debug) {
          const dbgOpts = options.debugOptions ?? {};
          const debugScript = `
            import { createDebugPanel } from "@junctionjs/debug";

            // Junction: Debug panel with View Transitions support.
            // Uses astro:page-load which fires on every page (with or without
            // View Transitions). The panel's host lives in <body>, which Astro
            // swaps on navigations. We guard against duplicate creation and
            // re-create only when the host has been removed by a swap.

            function initDebugPanel() {
              const collector = window.${globalName};
              if (!collector) return;

              // Guard: if a host element already exists in the DOM, skip.
              if (document.querySelector("junction-debug")) return;

              // If there's a previous instance whose host was removed by a
              // View Transition swap, destroy it (store is lost, but that's
              // expected across navigations).
              if (window.__jct_debug) {
                window.__jct_debug.destroy();
              }

              window.__jct_debug = createDebugPanel(collector, {
                shortcut: ${JSON.stringify(dbgOpts.shortcut ?? "ctrl+shift+j")},
                maxEvents: ${dbgOpts.maxEvents ?? 500},
                startOpen: ${dbgOpts.startOpen ?? false},
                position: ${JSON.stringify(dbgOpts.position ?? "bottom-right")},
              });
            }

            // astro:page-load fires on initial load and every View Transition
            // navigation — no fallback needed.
            document.addEventListener("astro:page-load", initDebugPanel);
          `;

          injectScript("page", debugScript);
        }

        // ── 4. Add server-side middleware ──

        if (options.collectEndpoint !== false) {
          addMiddleware({
            entrypoint: "@junctionjs/astro/middleware",
            order: "pre",
          });
        }

        // ── 5. Add collect API endpoint ──

        if (options.collectEndpoint !== false) {
          injectRoute({
            pattern: options.collectEndpoint ?? "/api/collect",
            entrypoint: new URL("./collect-endpoint.js", import.meta.url).href,
          });
        }
      },
    },
  };
}

export default junction;
