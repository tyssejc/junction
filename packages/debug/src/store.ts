/**
 * @junctionjs/debug - Event Store
 *
 * Ring buffer that captures all collector events for the debug panel.
 * Subscribes to the collector's event system and maintains an in-memory
 * log with aggregate counters.
 */

import type { Collector, CollectorEvent, CollectorEventHandler } from "@junctionjs/core";

// ─── Types ──────────────────────────────────────────────────────

export interface DebugEntry {
  /** Auto-incrementing ID */
  id: number;
  /** ISO timestamp from the collector event */
  timestamp: string;
  /** Collector event type */
  type: CollectorEvent;
  /** Raw payload from the event */
  payload: unknown;
}

export interface DebugCounters {
  total: number;
  valid: number;
  invalid: number;
  sent: Record<string, number>;
  errors: Record<string, number>;
  consentChanges: number;
  queueFlushes: number;
}

export interface DebugStore {
  /** Get all stored entries (newest last) */
  getEntries: () => DebugEntry[];
  /** Get entries filtered by type */
  getByType: (type: CollectorEvent) => DebugEntry[];
  /** Get aggregate counters */
  getCounters: () => DebugCounters;
  /** Clear all entries and reset counters */
  clear: () => void;
  /** Subscribe to updates (called on every new entry) */
  onUpdate: (callback: () => void) => () => void;
  /** Unsubscribe from all collector events and clean up */
  destroy: () => void;
}

// ─── Implementation ─────────────────────────────────────────────

export function createDebugStore(collector: Collector, maxEvents = 500): DebugStore {
  let entries: DebugEntry[] = [];
  let nextId = 1;
  const listeners = new Set<() => void>();
  const unsubscribers: Array<() => void> = [];

  const counters: DebugCounters = {
    total: 0,
    valid: 0,
    invalid: 0,
    sent: {},
    errors: {},
    consentChanges: 0,
    queueFlushes: 0,
  };

  function addEntry(type: CollectorEvent, payload: unknown, timestamp: string): void {
    const entry: DebugEntry = { id: nextId++, timestamp, type, payload };

    entries.push(entry);

    // Ring buffer: drop oldest when full
    if (entries.length > maxEvents) {
      entries = entries.slice(entries.length - maxEvents);
    }

    // Update counters
    switch (type) {
      case "event":
        counters.total++;
        break;
      case "event:valid":
        counters.valid++;
        break;
      case "event:invalid":
        counters.invalid++;
        break;
      case "destination:send": {
        const dest = (payload as { destination?: string })?.destination ?? "unknown";
        counters.sent[dest] = (counters.sent[dest] ?? 0) + 1;
        break;
      }
      case "destination:error": {
        const errDest = (payload as { destination?: string })?.destination ?? "unknown";
        counters.errors[errDest] = (counters.errors[errDest] ?? 0) + 1;
        break;
      }
      case "consent":
        counters.consentChanges++;
        break;
      case "queue:flush":
        counters.queueFlushes++;
        break;
    }

    // Notify listeners
    for (const cb of listeners) {
      try {
        cb();
      } catch {
        /* swallow */
      }
    }
  }

  // Subscribe to all collector event types
  const eventTypes: CollectorEvent[] = [
    "event",
    "event:valid",
    "event:invalid",
    "consent",
    "destination:send",
    "destination:error",
    "destination:init",
    "queue:flush",
    "error",
  ];

  for (const type of eventTypes) {
    const handler: CollectorEventHandler = (data) => {
      addEntry(type, data.payload, data.timestamp);
    };
    unsubscribers.push(collector.on(type, handler));
  }

  return {
    getEntries() {
      return [...entries];
    },

    getByType(type: CollectorEvent) {
      return entries.filter((e) => e.type === type);
    },

    getCounters() {
      return { ...counters, sent: { ...counters.sent }, errors: { ...counters.errors } };
    },

    clear() {
      entries = [];
      counters.total = 0;
      counters.valid = 0;
      counters.invalid = 0;
      counters.sent = {};
      counters.errors = {};
      counters.consentChanges = 0;
      counters.queueFlushes = 0;
      for (const cb of listeners) {
        try {
          cb();
        } catch {
          /* swallow */
        }
      }
    },

    onUpdate(callback: () => void) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    destroy() {
      for (const unsub of unsubscribers) {
        unsub();
      }
      unsubscribers.length = 0;
      listeners.clear();
    },
  };
}
