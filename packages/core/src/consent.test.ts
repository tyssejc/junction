import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ConsentManager, createConsentManager } from "./consent.js";
import type { ConsentConfig, JctEvent } from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<ConsentConfig>): ConsentConfig {
  return {
    defaultState: {},
    queueTimeout: 30_000,
    respectDNT: false,
    respectGPC: false,
    ...overrides,
  };
}

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "test",
    action: "tracked",
    properties: {},
    context: {},
    user: { anonymousId: "anon-123" },
    timestamp: new Date().toISOString(),
    id: "evt-001",
    version: "1.0.0",
    source: { type: "client", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("ConsentManager", () => {
  let manager: ConsentManager;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("starts with the default state", () => {
      manager = createConsentManager(makeConfig({ defaultState: { necessary: true } }));
      expect(manager.getState()).toEqual({ necessary: true });
    });

    it("starts with empty state when no defaults provided", () => {
      manager = createConsentManager(makeConfig());
      expect(manager.getState()).toEqual({});
    });
  });

  describe("setState", () => {
    it("merges state incrementally", () => {
      manager = createConsentManager(makeConfig({ defaultState: { necessary: true } }));

      manager.setState({ analytics: true });
      expect(manager.getState()).toEqual({ necessary: true, analytics: true });

      manager.setState({ marketing: false });
      expect(manager.getState()).toEqual({ necessary: true, analytics: true, marketing: false });
    });

    it("can override existing values", () => {
      manager = createConsentManager(makeConfig({ defaultState: { analytics: false } }));

      manager.setState({ analytics: true });
      expect(manager.getState()).toEqual({ analytics: true });
    });

    it("notifies listeners on change", () => {
      manager = createConsentManager(makeConfig());
      const listener = vi.fn();
      manager.onChange(listener);

      manager.setState({ analytics: true });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ analytics: true }, {});
    });

    it("passes previous state to listeners", () => {
      manager = createConsentManager(makeConfig({ defaultState: { necessary: true } }));
      const listener = vi.fn();
      manager.onChange(listener);

      manager.setState({ analytics: true });

      expect(listener).toHaveBeenCalledWith({ necessary: true, analytics: true }, { necessary: true });
    });
  });

  describe("reset", () => {
    it("returns to the default state", () => {
      manager = createConsentManager(makeConfig({ defaultState: { necessary: true } }));
      manager.setState({ analytics: true, marketing: true });

      manager.reset();

      expect(manager.getState()).toEqual({ necessary: true });
    });

    it("clears the queue", () => {
      manager = createConsentManager(makeConfig());
      manager.enqueue(makeEvent());
      manager.enqueue(makeEvent());
      expect(manager.queueSize()).toBe(2);

      manager.reset();
      expect(manager.queueSize()).toBe(0);
    });

    it("notifies listeners", () => {
      manager = createConsentManager(makeConfig({ defaultState: { necessary: true } }));
      manager.setState({ analytics: true });

      const listener = vi.fn();
      manager.onChange(listener);
      manager.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("isAllowed", () => {
    it("allows empty requirements", () => {
      manager = createConsentManager(makeConfig());
      expect(manager.isAllowed([])).toBe(true);
    });

    it("always allows necessary-only requirements", () => {
      manager = createConsentManager(makeConfig());
      expect(manager.isAllowed(["necessary"])).toBe(true);
    });

    it("uses OR logic — any matching category grants access", () => {
      manager = createConsentManager(makeConfig());
      manager.setState({ analytics: true, marketing: false });

      expect(manager.isAllowed(["analytics", "marketing"])).toBe(true);
    });

    it("denies when no required categories are granted", () => {
      manager = createConsentManager(makeConfig());
      manager.setState({ analytics: false, marketing: false });

      expect(manager.isAllowed(["analytics", "marketing"])).toBe(false);
    });

    it("denies when required categories are undefined (pending)", () => {
      manager = createConsentManager(makeConfig());
      // analytics is undefined (not set)
      expect(manager.isAllowed(["analytics"])).toBe(false);
    });
  });

  describe("isPending", () => {
    it("returns true when categories are undefined", () => {
      manager = createConsentManager(makeConfig());
      expect(manager.isPending(["analytics"])).toBe(true);
    });

    it("returns false when all categories have been explicitly set", () => {
      manager = createConsentManager(makeConfig());
      manager.setState({ analytics: true, marketing: false });

      expect(manager.isPending(["analytics"])).toBe(false);
      expect(manager.isPending(["marketing"])).toBe(false);
    });

    it("returns true if any category is pending", () => {
      manager = createConsentManager(makeConfig());
      manager.setState({ analytics: true });

      expect(manager.isPending(["analytics", "marketing"])).toBe(true);
    });
  });

  describe("event queue", () => {
    it("enqueues and drains events", () => {
      manager = createConsentManager(makeConfig());
      const event1 = makeEvent({ id: "evt-1" });
      const event2 = makeEvent({ id: "evt-2" });

      manager.enqueue(event1);
      manager.enqueue(event2);
      expect(manager.queueSize()).toBe(2);

      const drained = manager.drain();
      expect(drained).toHaveLength(2);
      expect(drained[0].event.id).toBe("evt-1");
      expect(drained[1].event.id).toBe("evt-2");
      expect(manager.queueSize()).toBe(0);
    });

    it("does not enqueue when queueTimeout is 0", () => {
      manager = createConsentManager(makeConfig({ queueTimeout: 0 }));
      manager.enqueue(makeEvent());
      expect(manager.queueSize()).toBe(0);
    });

    it("expires old events from the queue", () => {
      manager = createConsentManager(makeConfig({ queueTimeout: 5_000 }));
      manager.enqueue(makeEvent());
      expect(manager.queueSize()).toBe(1);

      // Advance time past the timeout
      vi.advanceTimersByTime(6_000);
      expect(manager.queueSize()).toBe(0);
    });

    it("keeps recent events in the queue", () => {
      manager = createConsentManager(makeConfig({ queueTimeout: 10_000 }));
      manager.enqueue(makeEvent());

      // Advance time but not past the timeout
      vi.advanceTimersByTime(5_000);
      expect(manager.queueSize()).toBe(1);
    });
  });

  describe("onChange", () => {
    it("returns an unsubscribe function", () => {
      manager = createConsentManager(makeConfig());
      const listener = vi.fn();
      const unsubscribe = manager.onChange(listener);

      manager.setState({ analytics: true });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.setState({ marketing: true });
      expect(listener).toHaveBeenCalledTimes(1); // not called again
    });

    it("handles errors in listeners gracefully", () => {
      manager = createConsentManager(makeConfig());
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const badListener = vi.fn(() => {
        throw new Error("boom");
      });
      const goodListener = vi.fn();

      manager.onChange(badListener);
      manager.onChange(goodListener);

      manager.setState({ analytics: true });

      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe("DNT and GPC", () => {
    it("respects Do Not Track when configured", () => {
      // Mock navigator.doNotTrack
      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, "navigator", {
        value: { ...originalNavigator, doNotTrack: "1" },
        writable: true,
        configurable: true,
      });

      manager = createConsentManager(
        makeConfig({
          respectDNT: true,
          defaultState: { necessary: true },
        }),
      );

      const state = manager.getState();
      expect(state.analytics).toBe(false);
      expect(state.marketing).toBe(false);
      expect(state.necessary).toBe(true);

      // Restore
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it("respects Global Privacy Control when configured", () => {
      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, "navigator", {
        value: { ...originalNavigator, globalPrivacyControl: true },
        writable: true,
        configurable: true,
      });

      manager = createConsentManager(
        makeConfig({
          respectGPC: true,
          defaultState: { necessary: true },
        }),
      );

      const state = manager.getState();
      expect(state.analytics).toBe(false);
      expect(state.marketing).toBe(false);
      expect(state.personalization).toBe(false);
      expect(state.necessary).toBe(true);

      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });
  });
});
