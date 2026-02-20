import type { ConsentState } from "@junctionjs/core";

// ─── Types ───────────────────────────────────────────────────────

/**
 * Maps Junction consent category names to OneTrust group IDs.
 *
 * OneTrust ships with five default groups:
 *   C0001 — Strictly Necessary (always active, never mapped here)
 *   C0002 — Performance / Analytics
 *   C0003 — Functional / Personalization
 *   C0004 — Targeting / Marketing
 *   C0005 — Social Media
 *
 * Override individual keys to match a custom OneTrust configuration,
 * or add arbitrary string keys for custom Junction categories.
 */
export interface OneTrustCategoryMap {
  analytics?: string; // default: "C0002"
  personalization?: string; // default: "C0003"
  marketing?: string; // default: "C0004"
  social?: string; // default: "C0005"
  [junctionCategory: string]: string | undefined;
}

/** Options passed to {@link createOneTrustAdapter}. */
export interface OneTrustAdapterOptions {
  /**
   * Override or extend the default OneTrust → Junction category mapping.
   * Entries are merged with the defaults; omitted keys keep their defaults.
   */
  categoryMap?: OneTrustCategoryMap;
  /** Emit debug logs to the console when `true`. Defaults to `false`. */
  debug?: boolean;
}

/** Handle returned by {@link createOneTrustAdapter}. */
export interface OneTrustAdapter {
  /** Remove all event listeners and restore the original `OptanonWrapper`. */
  destroy: () => void;
  /** Force a re-read of the current OneTrust state and push it to the collector. */
  sync: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────

const DEFAULT_CATEGORY_MAP: Required<
  Pick<OneTrustCategoryMap, "analytics" | "personalization" | "marketing" | "social">
> = {
  analytics: "C0002",
  personalization: "C0003",
  marketing: "C0004",
  social: "C0005",
};

// ─── Internal helpers ─────────────────────────────────────────────

/**
 * Converts a comma-separated `OnetrustActiveGroups` string into a
 * Junction {@link ConsentState} object using the provided category map.
 *
 * `necessary` is always `true` — OneTrust's C0001 group is non-negotiable.
 */
function mapOneTrustGroups(activeGroups: string, categoryMap: OneTrustCategoryMap): ConsentState {
  const state: ConsentState = {
    necessary: true, // C0001 is always active in OneTrust
  };

  const resolvedMap = { ...DEFAULT_CATEGORY_MAP, ...categoryMap };

  for (const [junctionCategory, oneTrustGroup] of Object.entries(resolvedMap)) {
    if (oneTrustGroup) {
      state[junctionCategory] = activeGroups.includes(oneTrustGroup);
    }
  }

  return state;
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * Creates an OneTrust CMP adapter that pushes consent state into a Junction
 * collector whenever OneTrust fires a consent update.
 *
 * The adapter:
 * - Reads `window.OnetrustActiveGroups` immediately (for returning visitors
 *   whose consent is already stored in a cookie).
 * - Listens for the `OneTrustGroupsUpdated` window event fired after the
 *   banner is interacted with.
 * - Chains onto `window.OptanonWrapper` (OneTrust's legacy callback) so
 *   existing wrapper functions are preserved.
 *
 * @example
 * ```ts
 * import { createCollector } from "@junctionjs/core";
 * import { createOneTrustAdapter } from "@junctionjs/cmp-onetrust";
 *
 * const collector = createCollector({ ... });
 * const onetrust = createOneTrustAdapter(collector);
 *
 * // Later, on navigation away / SPA teardown:
 * onetrust.destroy();
 * ```
 *
 * @param collector - Any object exposing a `consent(state)` method, typically
 *   the Junction collector instance.
 * @param options - Optional configuration.
 * @returns An {@link OneTrustAdapter} handle with `destroy` and `sync` methods.
 * @throws {Error} When called outside a browser environment (`window` is undefined).
 */
export function createOneTrustAdapter(
  collector: { consent: (state: ConsentState) => void },
  options?: OneTrustAdapterOptions,
): OneTrustAdapter {
  if (typeof window === "undefined") {
    throw new Error("[Junction:OneTrust] OneTrust adapter requires a browser environment");
  }

  const categoryMap = options?.categoryMap ?? {};
  const debug = options?.debug ?? false;

  function readAndSync(): void {
    const activeGroups = (window as any).OnetrustActiveGroups as string | undefined;
    if (!activeGroups) {
      if (debug) {
        console.log("[Junction:OneTrust] No OnetrustActiveGroups found, staying pending");
      }
      return;
    }

    const state = mapOneTrustGroups(activeGroups, categoryMap);
    if (debug) {
      console.log("[Junction:OneTrust] Syncing consent state:", state);
    }
    collector.consent(state);
  }

  function handleConsentUpdate(): void {
    readAndSync();
  }

  window.addEventListener("OneTrustGroupsUpdated", handleConsentUpdate);

  // Preserve any existing OptanonWrapper set before the adapter was created.
  const existingWrapper = (window as any).OptanonWrapper as ((...args: unknown[]) => void) | undefined;
  (window as any).OptanonWrapper = (...args: unknown[]) => {
    existingWrapper?.(...args);
    handleConsentUpdate();
  };

  // Immediate sync: returning visitors already have OnetrustActiveGroups set.
  readAndSync();

  return {
    destroy() {
      window.removeEventListener("OneTrustGroupsUpdated", handleConsentUpdate);
      // Restore the original OptanonWrapper (or delete it if there was none).
      if (existingWrapper !== undefined) {
        (window as any).OptanonWrapper = existingWrapper;
      } else {
        (window as any).OptanonWrapper = undefined;
      }
    },
    sync() {
      readAndSync();
    },
  };
}
