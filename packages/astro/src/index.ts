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
 * - The integration injects at "before-hydration" stage so tracking is
 *   ready before any islands activate.
 */

import type { AstroIntegration } from "astro";
import type { CollectorConfig } from "@junctionjs/core";

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
   * Logs all events to the browser console.
   */
  debug?: boolean;
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

        // ── 1. Inject initialization script (before hydration) ──

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

        injectScript("before-hydration", initScript);

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

        // ── 3. Add server-side middleware ──

        if (options.collectEndpoint !== false) {
          addMiddleware({
            entrypoint: "@junctionjs/astro/middleware",
            order: "pre",
          });
        }

        // ── 4. Add collect API endpoint ──

        if (options.collectEndpoint !== false) {
          injectRoute({
            pattern: options.collectEndpoint ?? "/api/collect",
            entrypoint: "@junctionjs/astro/collect-endpoint",
          });
        }
      },
    },
  };
}

export default junction;
