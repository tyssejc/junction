/**
 * @junctionjs/core - Consent Manager
 *
 * Reactive consent state machine with event queuing.
 *
 * Design philosophy: consent is not a boolean gate — it's a state machine
 * with queuing semantics. Events that arrive before consent is resolved
 * get queued, and when consent changes, the queue flushes to newly-permitted
 * destinations with updated user properties.
 *
 * This is one of the things walkerOS gets right. We keep the pattern
 * but simplify the API.
 */

import type { ConsentCategory, ConsentConfig, ConsentState, JctEvent } from "./types.js";

// ─── Types ───────────────────────────────────────────────────────

interface QueuedEvent {
  event: JctEvent;
  queuedAt: number;
}

type ConsentListener = (state: ConsentState, previous: ConsentState) => void;

export interface ConsentManager {
  /** Get current consent state */
  getState: () => ConsentState;

  /** Update consent state (merges with existing) */
  setState: (update: ConsentState) => void;

  /** Reset consent to default state */
  reset: () => void;

  /** Check if a set of required categories is satisfied */
  isAllowed: (required: ConsentCategory[]) => boolean;

  /** Check if consent is still pending (no explicit grant or deny) */
  isPending: (categories: ConsentCategory[]) => boolean;

  /** Queue an event for later dispatch when consent is resolved */
  enqueue: (event: JctEvent) => void;

  /** Get and clear queued events (called when consent changes) */
  drain: () => QueuedEvent[];

  /** Subscribe to consent changes */
  onChange: (listener: ConsentListener) => () => void;

  /** Number of queued events */
  queueSize: () => number;
}

// ─── Implementation ──────────────────────────────────────────────

export function createConsentManager(config: ConsentConfig): ConsentManager {
  let state: ConsentState = { ...config.defaultState };
  let queue: QueuedEvent[] = [];
  const listeners = new Set<ConsentListener>();

  // Check DNT/GPC on creation
  if (typeof globalThis.navigator !== "undefined") {
    if (config.respectDNT && (globalThis.navigator as any).doNotTrack === "1") {
      state = { ...state, analytics: false, marketing: false };
    }
    if (config.respectGPC && (globalThis.navigator as any).globalPrivacyControl === true) {
      state = { ...state, analytics: false, marketing: false, personalization: false };
    }
  }

  // Queue cleanup timer — expire old events
  let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

  if (config.queueTimeout > 0) {
    _cleanupTimer = setInterval(
      () => {
        const now = Date.now();
        queue = queue.filter((item) => now - item.queuedAt < config.queueTimeout);
      },
      Math.min(config.queueTimeout, 30_000),
    );
  }

  function notify(previous: ConsentState): void {
    for (const listener of listeners) {
      try {
        listener({ ...state }, previous);
      } catch (e) {
        console.error("[Junction] Consent listener error:", e);
      }
    }
  }

  const manager: ConsentManager = {
    getState() {
      return { ...state };
    },

    setState(update: ConsentState) {
      const previous = { ...state };

      // Merge — don't replace. This allows incremental consent updates
      // (e.g., user grants analytics first, marketing later).
      state = { ...state, ...update };

      notify(previous);
    },

    reset() {
      const previous = { ...state };
      state = { ...config.defaultState };
      queue = [];
      notify(previous);
    },

    isAllowed(required: ConsentCategory[]): boolean {
      // "necessary" is always allowed
      if (required.length === 0 || required.every((c) => c === "necessary")) {
        return true;
      }

      // OR logic: at least one required category must be explicitly true
      return required.some((category) => state[category] === true);
    },

    isPending(categories: ConsentCategory[]): boolean {
      // A category is "pending" if it hasn't been explicitly set to true or false
      return categories.some((cat) => state[cat] === undefined);
    },

    enqueue(event: JctEvent) {
      if (config.queueTimeout === 0) return; // queuing disabled
      queue.push({ event, queuedAt: Date.now() });
    },

    drain(): QueuedEvent[] {
      const drained = [...queue];
      queue = [];
      return drained;
    },

    onChange(listener: ConsentListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    queueSize() {
      return queue.length;
    },
  };

  return manager;
}
