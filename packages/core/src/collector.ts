/**
 * @junctionjs/core - Collector
 *
 * The core runtime. Isomorphic — runs in browser, Node, Deno, Workers, Bun.
 * Accepts events, validates them, checks consent, buffers, and dispatches
 * to destinations.
 *
 * Design decisions:
 * - ONE instance, ONE API. No separate push functions or dual globals.
 * - Events are buffered and flushed in batches for performance.
 * - Consent-gated destinations queue events until consent is resolved.
 * - All operations are synchronous from the caller's perspective
 *   (track() returns void, not a Promise). Async work happens in the background.
 */

import type {
  JctEvent,
  EventContext,
  EventSource,
  UserIdentity,
  ConsentState,
  ConsentCategory,
  Collector,
  CollectorConfig,
  CollectorEvent,
  CollectorEventHandler,
  DestinationEntry,
} from "./types.js";
import { createConsentManager, type ConsentManager } from "./consent.js";
import { createValidator, type Validator } from "./validation.js";

// ─── Utilities ───────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function timestamp(): string {
  return new Date().toISOString();
}

// ─── Collector Factory ───────────────────────────────────────────

export interface CreateCollectorOptions {
  config: CollectorConfig;
  source: EventSource;

  /**
   * Context resolver — called on each event to get current context.
   * Different on client (reads from DOM/navigator) vs server (reads from request).
   */
  resolveContext?: () => Partial<EventContext>;
}

export function createCollector(options: CreateCollectorOptions): Collector {
  const { config, source, resolveContext } = options;

  // ── State ──────────────────────────────────────────────

  let user: UserIdentity = {
    anonymousId: uuid(), // will be overridden by persistent storage in client package
  };

  const destinations = new Map<string, DestinationEntry>();
  const eventListeners = new Map<CollectorEvent, Set<CollectorEventHandler>>();
  const consent: ConsentManager = createConsentManager(config.consent);
  const validator: Validator = createValidator();

  // Event buffer for batching
  let buffer: JctEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const bufferConfig = {
    maxSize: config.buffer?.maxSize ?? 10,
    maxWait: config.buffer?.maxWait ?? 2000,
  };

  // ── Initialization ─────────────────────────────────────

  // Register contracts
  if (config.contracts) {
    for (const contract of config.contracts) {
      validator.register(contract);
    }
  }

  // Register and initialize destinations
  for (const entry of config.destinations) {
    if (entry.enabled === false) continue;
    destinations.set(entry.destination.name, entry);
  }

  // Initialize destinations asynchronously
  async function initDestinations(): Promise<void> {
    for (const [name, entry] of destinations) {
      try {
        await entry.destination.init(entry.config);
        emit("destination:init", { destination: name });
        if (config.debug) {
          console.log(`[Junction] Destination initialized: ${name}`);
        }
      } catch (e) {
        emit("destination:error", { destination: name, error: e });
        console.error(`[Junction] Failed to initialize destination ${name}:`, e);
      }
    }
  }

  // Start initialization (fire and forget — destinations buffer until ready)
  const initPromise = initDestinations();

  // ── Consent change handler ─────────────────────────────

  consent.onChange((state, _previous) => {
    emit("consent", { state });

    // Notify destinations of consent change
    for (const [, entry] of destinations) {
      entry.destination.onConsent?.(state);
    }

    // Drain queued events and re-dispatch
    const queued = consent.drain();
    if (queued.length > 0 && config.debug) {
      console.log(`[Junction] Flushing ${queued.length} queued events after consent change`);
    }

    for (const { event } of queued) {
      // Update user properties on queued events (may have changed since queuing)
      const updatedEvent = { ...event, user: { ...user } };
      dispatchToDestinations(updatedEvent);
    }

    emit("queue:flush", { count: queued.length });
  });

  // ── Internal helpers ───────────────────────────────────

  function emit(type: CollectorEvent, payload: unknown): void {
    const handlers = eventListeners.get(type);
    if (!handlers) return;

    const data = { type, payload, timestamp: timestamp() };
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (e) {
        console.error(`[Junction] Event handler error:`, e);
      }
    }
  }

  function buildContext(): EventContext {
    const base: EventContext = {};
    const resolved = resolveContext?.() ?? {};

    // Merge globals from config
    return {
      ...base,
      ...config.globals,
      ...resolved,
    };
  }

  function buildEvent<T extends Record<string, unknown>>(
    entity: string,
    action: string,
    properties?: T,
  ): JctEvent<T> {
    return {
      entity,
      action,
      properties: (properties ?? {}) as T,
      context: buildContext(),
      user: { ...user },
      timestamp: timestamp(),
      id: uuid(),
      version: "1.0.0",
      source,
    };
  }

  function dispatchToDestinations(event: JctEvent): void {
    for (const [name, entry] of destinations) {
      const requiredConsent = entry.consent ?? entry.destination.consent;

      // Check consent
      if (!consent.isAllowed(requiredConsent)) {
        // If consent is pending (not explicitly denied), queue the event
        if (consent.isPending(requiredConsent)) {
          consent.enqueue(event);
        }
        continue;
      }

      // Transform
      try {
        const payload = entry.destination.transform(event);
        if (payload == null) continue; // destination chose to skip this event

        // Send asynchronously
        entry.destination.send(payload, entry.config).catch((e) => {
          emit("destination:error", { destination: name, error: e, event });
          if (config.debug) {
            console.error(`[Junction] Send failed for ${name}:`, e);
          }
        });

        emit("destination:send", { destination: name, event });
      } catch (e) {
        emit("destination:error", { destination: name, error: e, event });
      }
    }
  }

  function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushBuffer();
    }, bufferConfig.maxWait);
  }

  function flushBuffer(): void {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (buffer.length === 0) return;

    const events = [...buffer];
    buffer = [];

    for (const event of events) {
      dispatchToDestinations(event);
    }
  }

  // ── Public API ─────────────────────────────────────────

  const collector: Collector = {
    track<T extends Record<string, unknown>>(
      entity: string,
      action: string,
      properties?: T,
    ): void {
      const event = buildEvent(entity, action, properties);

      // Validate
      const result = validator.validate(event);
      if (!result.valid) {
        emit("event:invalid", { event, errors: result.errors });
        if (config.debug) {
          console.warn(`[Junction] Event validation failed:`, result.errors?.flatten());
        }
        return; // drop invalid events in strict mode
      }

      emit("event", event);
      emit("event:valid", event);

      if (config.debug) {
        console.log(`[Junction] ${event.entity}:${event.action}`, event.properties);
      }

      // Buffer the event
      buffer.push(result.event);
      if (buffer.length >= bufferConfig.maxSize) {
        flushBuffer();
      } else {
        scheduleFlush();
      }
    },

    identify(userId: string, traits?: Record<string, unknown>): void {
      user = {
        ...user,
        userId,
        traits: { ...user.traits, ...traits },
      };

      if (config.debug) {
        console.log(`[Junction] Identified user: ${userId}`, traits);
      }

      // Track identify as an event (destinations may want to sync user profiles)
      collector.track("user", "identified", { userId, ...traits });
    },

    consent(state: ConsentState): void {
      consent.setState(state);
    },

    getConsent(): ConsentState {
      return consent.getState();
    },

    addDestination(entry: DestinationEntry): void {
      destinations.set(entry.destination.name, entry);

      // Initialize asynchronously
      Promise.resolve(entry.destination.init(entry.config)).then(() => {
        emit("destination:init", { destination: entry.destination.name });
      }).catch((e: unknown) => {
        emit("destination:error", { destination: entry.destination.name, error: e });
      });
    },

    removeDestination(name: string): void {
      const entry = destinations.get(name);
      if (entry) {
        entry.destination.teardown?.();
        destinations.delete(name);
      }
    },

    on(event: CollectorEvent, handler: CollectorEventHandler): () => void {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(handler);
      return () => {
        eventListeners.get(event)?.delete(handler);
      };
    },

    async flush(): Promise<void> {
      await initPromise; // ensure destinations are ready
      flushBuffer();
    },

    async shutdown(): Promise<void> {
      await collector.flush();
      for (const [, entry] of destinations) {
        await entry.destination.teardown?.();
      }
      if (flushTimer) clearTimeout(flushTimer);
    },
  };

  return collector;
}
