/**
 * @junctionjs/core - CMP Bridge
 *
 * Generic factory that extracts the common CMP adapter pattern
 * (read state, subscribe to changes, map to ConsentState, sync on create)
 * into a reusable utility.
 *
 * CMP-specific adapters (OneTrust, Cookiebot, Usercentrics, etc.)
 * delegate to this bridge — they only need to provide readState,
 * subscribe, and mapState implementations.
 */

import type { ConsentState } from "./types.js";

export interface CmpBridgeConfig<TCmpState = unknown> {
  /** The collector (or any object with a `consent()` method). */
  collector: { consent: (state: ConsentState) => void };
  /** Read current CMP state. Return null/undefined if CMP hasn't loaded yet. */
  readState: () => TCmpState | null | undefined;
  /** Subscribe to CMP state changes. Returns an unsubscribe function. */
  subscribe: (callback: () => void) => () => void;
  /** Map CMP-native state into Junction ConsentState. */
  mapState: (cmpState: TCmpState) => ConsentState;
  /** Emit debug logs when true. */
  debug?: boolean;
}

export interface CmpBridge {
  /** Remove all subscriptions. */
  destroy: () => void;
  /** Force a re-read of the current CMP state and push it to the collector. */
  sync: () => void;
}

export function createCmpBridge<TCmpState = unknown>(config: CmpBridgeConfig<TCmpState>): CmpBridge {
  const { collector, readState, subscribe, mapState, debug } = config;

  function readAndSync(): void {
    const cmpState = readState();
    if (cmpState == null) {
      if (debug) {
        console.log("[Junction:CmpBridge] CMP state not available yet, staying pending");
      }
      return;
    }

    const state = mapState(cmpState);
    if (debug) {
      console.log("[Junction:CmpBridge] Syncing consent state:", state);
    }
    collector.consent(state);
  }

  const unsubscribe = subscribe(readAndSync);

  // Immediate sync: CMP may already have state (returning visitors).
  readAndSync();

  return {
    destroy() {
      unsubscribe();
    },
    sync() {
      readAndSync();
    },
  };
}
