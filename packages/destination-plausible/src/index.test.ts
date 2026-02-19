import type { JctEvent } from "@junctionjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { plausible } from "./index.js";

// ─── Helpers ────────────────────────────────────────────────────

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "page",
    action: "viewed",
    properties: {},
    context: {
      page: {
        url: "https://example.com/blog",
        path: "/blog",
        title: "Blog",
        referrer: "https://google.com",
        search: "",
        hash: "",
      },
      device: {
        type: "desktop",
        userAgent: "Mozilla/5.0 TestAgent",
        language: "en-US",
      },
    },
    user: { anonymousId: "anon-123" },
    timestamp: new Date().toISOString(),
    id: "evt-001",
    version: "1.0.0",
    source: { type: "server", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("destination-plausible", () => {
  describe("factory", () => {
    it("creates a destination with correct defaults", () => {
      const dest = plausible({ domain: "example.com" });

      expect(dest.name).toBe("plausible");
      expect(dest.consent).toEqual(["exempt"]);
      expect(dest.runtime).toBe("server");
    });

    it("throws on init if domain is missing", () => {
      const dest = plausible({ domain: "" });
      expect(() => dest.init({} as any)).toThrow("domain is required");
    });
  });

  describe("transform", () => {
    it("maps page:viewed to 'pageview'", () => {
      const dest = plausible({ domain: "example.com" });
      const result = dest.transform(makeEvent()) as any;

      expect(result.body.name).toBe("pageview");
      expect(result.body.domain).toBe("example.com");
      expect(result.body.url).toBe("https://example.com/blog");
      expect(result.body.referrer).toBe("https://google.com");
    });

    it("maps custom events to entity:action format", () => {
      const dest = plausible({ domain: "example.com" });
      const result = dest.transform(makeEvent({ entity: "signup", action: "completed" })) as any;

      expect(result.body.name).toBe("signup:completed");
    });

    it("supports custom eventName mapping", () => {
      const dest = plausible({
        domain: "example.com",
        eventName: (e) => (e.entity === "page" ? "pageview" : null),
      });

      expect(dest.transform(makeEvent())).not.toBeNull();
      expect(dest.transform(makeEvent({ entity: "signup", action: "completed" }))).toBeNull();
    });

    it("includes custom props when provided", () => {
      const dest = plausible({
        domain: "example.com",
        props: (e) => ({ path: e.context.page?.path ?? "/" }),
      });
      const result = dest.transform(makeEvent()) as any;

      expect(result.body.props).toEqual({ path: "/blog" });
    });

    it("includes revenue data when provided", () => {
      const dest = plausible({
        domain: "example.com",
        revenue: () => ({ currency: "USD", amount: 29.99 }),
      });
      const result = dest.transform(makeEvent({ entity: "order", action: "completed" })) as any;

      expect(result.body.revenue).toEqual({ currency: "USD", amount: 29.99 });
    });

    it("omits referrer when empty", () => {
      const dest = plausible({ domain: "example.com" });
      const event = makeEvent();
      event.context.page!.referrer = "";
      const result = dest.transform(event) as any;

      expect(result.body.referrer).toBeUndefined();
    });

    it("falls back to '/' when page context is missing", () => {
      const dest = plausible({ domain: "example.com" });
      const result = dest.transform(makeEvent({ context: {} })) as any;

      expect(result.body.url).toBe("/");
    });
  });

  describe("send", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    it("POSTs to the Plausible API", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const dest = plausible({ domain: "example.com" });
      const payload = dest.transform(makeEvent());
      await dest.send(payload, {} as any);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://plausible.io/api/event",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 TestAgent",
          }),
        }),
      );
    });

    it("uses custom apiHost for self-hosted", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const dest = plausible({
        domain: "example.com",
        apiHost: "https://analytics.example.com",
      });
      const payload = dest.transform(makeEvent());
      await dest.send(payload, {} as any);

      expect(mockFetch).toHaveBeenCalledWith("https://analytics.example.com/api/event", expect.anything());
    });

    it("strips trailing slash from apiHost", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const dest = plausible({
        domain: "example.com",
        apiHost: "https://analytics.example.com/",
      });
      const payload = dest.transform(makeEvent());
      await dest.send(payload, {} as any);

      expect(mockFetch).toHaveBeenCalledWith("https://analytics.example.com/api/event", expect.anything());
    });

    it("throws on non-2xx response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          text: () => Promise.resolve("Invalid domain"),
        }),
      );

      const dest = plausible({ domain: "bad.example.com" });
      const payload = dest.transform(makeEvent());

      await expect(dest.send(payload, {} as any)).rejects.toThrow("returned 422: Invalid domain");
    });
  });
});
