import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type CreateCollectorOptions, createCollector } from "./collector.js";
import type { Destination, JctEvent } from "./types.js";

// ─── Mock Destination ───────────────────────────────────────────

function mockDestination(overrides?: Partial<Destination>): Destination {
  return {
    name: "test-destination",
    version: "0.1.0",
    consent: ["analytics"],
    runtime: "both",
    init: vi.fn().mockResolvedValue(undefined),
    transform: vi.fn((event: JctEvent) => ({ transformed: true, event })),
    send: vi.fn().mockResolvedValue(undefined),
    onConsent: vi.fn(),
    teardown: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeOptions(overrides?: Partial<CreateCollectorOptions>): CreateCollectorOptions {
  return {
    config: {
      name: "test-collector",
      environment: "test",
      consent: {
        defaultState: { analytics: true },
        queueTimeout: 30_000,
        respectDNT: false,
        respectGPC: false,
      },
      destinations: [],
      debug: false,
      buffer: { maxSize: 10, maxWait: 2000 },
    },
    source: { type: "client", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("Collector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("track", () => {
    it("creates events with correct structure", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed", { path: "/home" });

      // Flush to dispatch
      vi.advanceTimersByTime(2500);

      expect(dest.transform).toHaveBeenCalledTimes(1);
      const event = (dest.transform as any).mock.calls[0][0] as JctEvent;

      expect(event.entity).toBe("page");
      expect(event.action).toBe("viewed");
      expect(event.properties).toEqual({ path: "/home" });
      expect(event.source).toEqual({ type: "client", name: "test", version: "0.0.0" });
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.user.anonymousId).toBeDefined();
    });

    it("handles empty properties", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(2500);

      const event = (dest.transform as any).mock.calls[0][0] as JctEvent;
      expect(event.properties).toEqual({});
    });

    it("uses resolveContext for event context", () => {
      const dest = mockDestination();
      const options = makeOptions({
        resolveContext: () => ({
          page: { url: "https://test.com", path: "/test", title: "Test", referrer: "", search: "", hash: "" },
        }),
      });
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(2500);

      const event = (dest.transform as any).mock.calls[0][0] as JctEvent;
      expect(event.context.page?.url).toBe("https://test.com");
    });
  });

  describe("buffering", () => {
    it("flushes when buffer reaches maxSize", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.buffer = { maxSize: 3, maxWait: 60_000 };
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);

      collector.track("a", "1");
      collector.track("a", "2");
      expect(dest.transform).not.toHaveBeenCalled();

      collector.track("a", "3"); // hits maxSize
      expect(dest.transform).toHaveBeenCalledTimes(3);
    });

    it("flushes on maxWait timer", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.buffer = { maxSize: 100, maxWait: 1000 };
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("a", "1");

      expect(dest.transform).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1100);
      expect(dest.transform).toHaveBeenCalledTimes(1);
    });

    it("manual flush dispatches buffered events", async () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("a", "1");
      collector.track("a", "2");

      await collector.flush();
      expect(dest.transform).toHaveBeenCalledTimes(2);
    });
  });

  describe("validation", () => {
    it("drops invalid events in strict mode", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.contracts = [
        {
          entity: "product",
          action: "viewed",
          version: "1.0.0",
          mode: "strict",
          schema: z.object({
            product_id: z.string().min(1),
            price: z.number().nonnegative(),
          }),
        },
      ];
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);

      // Invalid: missing required fields
      collector.track("product", "viewed", { product_id: "", price: -1 });

      vi.advanceTimersByTime(3000);
      expect(dest.transform).not.toHaveBeenCalled();
    });

    it("passes uncontracted events through", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.contracts = [
        {
          entity: "product",
          action: "viewed",
          version: "1.0.0",
          mode: "strict",
          schema: z.object({ product_id: z.string() }),
        },
      ];
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);

      // No contract for page:viewed, should pass through
      collector.track("page", "viewed", { path: "/test" });

      vi.advanceTimersByTime(3000);
      expect(dest.transform).toHaveBeenCalledTimes(1);
    });

    it("emits event:invalid for failed validation", () => {
      const options = makeOptions();
      options.config.contracts = [
        {
          entity: "product",
          action: "viewed",
          version: "1.0.0",
          mode: "strict",
          schema: z.object({ product_id: z.string().min(1) }),
        },
      ];

      const collector = createCollector(options);
      const handler = vi.fn();
      collector.on("event:invalid", handler);

      collector.track("product", "viewed", { product_id: "" });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("consent gating", () => {
    it("dispatches to destinations when consent is granted", () => {
      const dest = mockDestination({ consent: ["analytics"] });
      const options = makeOptions();
      options.config.consent.defaultState = { analytics: true };
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(3000);
      expect(dest.transform).toHaveBeenCalledTimes(1);
    });

    it("blocks destinations when consent is denied", () => {
      const dest = mockDestination({ consent: ["marketing"] });
      const options = makeOptions();
      options.config.consent.defaultState = { marketing: false };
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(3000);
      expect(dest.transform).not.toHaveBeenCalled();
    });

    it("queues events when consent is pending, dispatches after grant", () => {
      const dest = mockDestination({ consent: ["analytics"] });
      const options = makeOptions();
      options.config.consent.defaultState = {}; // analytics is undefined = pending
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(3000);
      expect(dest.transform).not.toHaveBeenCalled();

      // Grant consent
      collector.consent({ analytics: true });

      // The consent change handler should drain the queue and dispatch
      expect(dest.transform).toHaveBeenCalledTimes(1);
    });

    it("drops queued events when consent is denied", () => {
      const dest = mockDestination({ consent: ["marketing"] });
      const options = makeOptions();
      options.config.consent.defaultState = {}; // pending
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("ad", "clicked");

      vi.advanceTimersByTime(3000);

      // Deny consent
      collector.consent({ marketing: false });

      // The queue drains, but the destination should still not receive
      // because marketing is now false. Queue drains and re-dispatches,
      // but isAllowed returns false.
      // Note: the current implementation drains unconditionally and re-dispatches.
      // dispatchToDestinations will check consent again.
      expect(dest.send).not.toHaveBeenCalled();
    });
  });

  describe("identify", () => {
    it("updates user identity", async () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.identify("user-42", { email: "test@test.com" });

      // identify triggers a track("user", "identified") call
      vi.advanceTimersByTime(3000);

      expect(dest.transform).toHaveBeenCalled();
      const event = (dest.transform as any).mock.calls[0][0] as JctEvent;
      expect(event.entity).toBe("user");
      expect(event.action).toBe("identified");
      expect(event.user.userId).toBe("user-42");
      expect(event.user.traits).toEqual({ email: "test@test.com" });
    });

    it("merges traits incrementally", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.identify("user-42", { email: "test@test.com" });
      collector.identify("user-42", { name: "Test User" });

      vi.advanceTimersByTime(3000);

      // Second identify event should have both traits
      const calls = (dest.transform as any).mock.calls;
      const lastEvent = calls[calls.length - 1][0] as JctEvent;
      expect(lastEvent.user.traits).toEqual({ email: "test@test.com", name: "Test User" });
    });
  });

  describe("event listeners", () => {
    it("fires 'event' on every tracked event", () => {
      const collector = createCollector(makeOptions());
      const handler = vi.fn();
      collector.on("event", handler);

      collector.track("page", "viewed");
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("fires 'event:valid' for valid events", () => {
      const collector = createCollector(makeOptions());
      const handler = vi.fn();
      collector.on("event:valid", handler);

      collector.track("page", "viewed");
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("returns an unsubscribe function", () => {
      const collector = createCollector(makeOptions());
      const handler = vi.fn();
      const unsub = collector.on("event", handler);

      collector.track("a", "1");
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      collector.track("a", "2");
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("destination management", () => {
    it("initializes destinations on creation", async () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: { key: "value" } }];

      createCollector(options);

      // Wait for async init
      await vi.advanceTimersByTimeAsync(0);

      expect(dest.init).toHaveBeenCalledWith({ key: "value" });
    });

    it("skips disabled destinations", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {}, enabled: false }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(3000);
      expect(dest.transform).not.toHaveBeenCalled();
    });

    it("addDestination registers and initializes at runtime", async () => {
      const collector = createCollector(makeOptions());
      const dest = mockDestination({ name: "late-addition", consent: ["analytics"] });

      collector.addDestination({ destination: dest, config: { apiKey: "test" } });

      await vi.advanceTimersByTimeAsync(0);
      expect(dest.init).toHaveBeenCalledWith({ apiKey: "test" });
    });

    it("removeDestination tears down and removes", () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.removeDestination("test-destination");

      expect(dest.teardown).toHaveBeenCalled();

      // Track should no longer hit removed destination
      collector.track("page", "viewed");
      vi.advanceTimersByTime(3000);
      expect(dest.transform).not.toHaveBeenCalled();
    });

    it("skips events when transform returns null", () => {
      const dest = mockDestination({
        transform: vi.fn(() => null), // skip all events
      });
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("internal", "event");

      vi.advanceTimersByTime(3000);
      expect(dest.transform).toHaveBeenCalled();
      expect(dest.send).not.toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("flushes buffer and tears down destinations", async () => {
      const dest = mockDestination();
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      await collector.shutdown();

      expect(dest.transform).toHaveBeenCalled();
      expect(dest.teardown).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("emits destination:error when send fails", async () => {
      const dest = mockDestination({
        send: vi.fn().mockRejectedValue(new Error("Network error")),
      });
      const options = makeOptions();
      options.config.destinations = [{ destination: dest, config: {} }];

      const collector = createCollector(options);
      const errorHandler = vi.fn();
      collector.on("destination:error", errorHandler);

      collector.track("page", "viewed");
      vi.advanceTimersByTime(3000);

      // Allow the rejected promise to propagate
      await vi.advanceTimersByTimeAsync(0);

      expect(errorHandler).toHaveBeenCalled();
    });

    it("continues dispatching to other destinations when one fails", () => {
      const failDest = mockDestination({
        name: "fail-dest",
        transform: vi.fn(() => {
          throw new Error("Transform failed");
        }),
      });
      const goodDest = mockDestination({ name: "good-dest" });

      const options = makeOptions();
      options.config.destinations = [
        { destination: failDest, config: {} },
        { destination: goodDest, config: {} },
      ];

      const collector = createCollector(options);
      collector.track("page", "viewed");

      vi.advanceTimersByTime(3000);

      expect(failDest.transform).toHaveBeenCalled();
      expect(failDest.send).not.toHaveBeenCalled();
      expect(goodDest.transform).toHaveBeenCalled();
      expect(goodDest.send).toHaveBeenCalled();
    });
  });
});
