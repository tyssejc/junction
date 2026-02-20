import type { ConsentState, Destination, JctEvent } from "@junctionjs/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGateway } from "./index.js";

// ─── Helpers ────────────────────────────────────────────────────

function mockDestination(overrides?: Partial<Destination>): Destination {
  return {
    name: "test-server-dest",
    version: "0.1.0",
    consent: ["analytics"],
    runtime: "server",
    init: vi.fn().mockResolvedValue(undefined),
    transform: vi.fn((event: JctEvent) => ({ transformed: true, event })),
    send: vi.fn().mockResolvedValue(undefined),
    onConsent: vi.fn(),
    teardown: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>, opts?: RequestInit): Request {
  return new Request("https://gateway.test/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...opts,
  });
}

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "page",
    action: "viewed",
    properties: { path: "/home" },
    context: {},
    user: { anonymousId: "anon-123" },
    timestamp: new Date().toISOString(),
    id: "evt-001",
    version: "1.0.0",
    source: { type: "client", name: "browser", version: "0.1.0" },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("Gateway", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("consent forwarding", () => {
    it("applies client consent state from request body", async () => {
      const dest = mockDestination({ consent: ["marketing"] });
      const gateway = createGateway({
        destinations: [{ destination: dest, config: {} }],
        collector: {
          name: "test-gw",
          environment: "test",
          consent: {
            defaultState: {},
            queueTimeout: 30_000,
            respectDNT: false,
            respectGPC: false,
          },
        },
      });

      const response = await gateway.handleRequest(
        makeRequest({
          events: [makeEvent()],
          consent: { marketing: true } as ConsentState,
        }),
      );

      // Allow async init + flush
      await vi.advanceTimersByTimeAsync(3000);

      expect(response.status).toBe(200);
      // The destination should have received the consent update
      expect(dest.onConsent).toHaveBeenCalledWith(expect.objectContaining({ marketing: true }));
    });

    it("works without consent in body (backward compat)", async () => {
      const dest = mockDestination({ consent: ["analytics"] });
      const gateway = createGateway({
        destinations: [{ destination: dest, config: {} }],
        collector: {
          name: "test-gw",
          environment: "test",
          consent: {
            defaultState: { analytics: true },
            queueTimeout: 30_000,
            respectDNT: false,
            respectGPC: false,
          },
        },
      });

      const response = await gateway.handleRequest(makeRequest({ events: [makeEvent()] }));

      await vi.advanceTimersByTimeAsync(3000);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { ok: boolean; received: number };
      expect(body.ok).toBe(true);
      expect(body.received).toBe(1);
    });

    it("events gated by forwarded consent state", async () => {
      const dest = mockDestination({ consent: ["marketing"] });
      const gateway = createGateway({
        destinations: [{ destination: dest, config: {} }],
        collector: {
          name: "test-gw",
          environment: "test",
          consent: {
            defaultState: {},
            queueTimeout: 0, // don't queue
            respectDNT: false,
            respectGPC: false,
          },
        },
      });

      // Send events with marketing denied
      await gateway.handleRequest(
        makeRequest({
          events: [makeEvent()],
          consent: { marketing: false } as ConsentState,
        }),
      );

      await vi.advanceTimersByTimeAsync(3000);

      // Destination should not have received events (marketing denied, no queuing)
      expect(dest.send).not.toHaveBeenCalled();
    });

    it("logs consent state in debug mode", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const dest = mockDestination();
      const gateway = createGateway({
        destinations: [{ destination: dest, config: {} }],
        collector: {
          name: "test-gw",
          environment: "test",
          consent: {
            defaultState: { analytics: true },
            queueTimeout: 30_000,
            respectDNT: false,
            respectGPC: false,
          },
          debug: true,
        },
      });

      await gateway.handleRequest(
        makeRequest({
          events: [makeEvent()],
          consent: { analytics: true } as ConsentState,
        }),
      );

      await vi.advanceTimersByTimeAsync(3000);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Junction:Gateway] Applied client consent state:",
        expect.objectContaining({ analytics: true }),
      );

      consoleSpy.mockRestore();
    });
  });
});
