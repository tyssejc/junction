import type { JctEvent } from "@junctionjs/core";
import { describe, expect, it } from "vitest";
import {
  POSTHOG_DEFAULT_HOST,
  buildEventProperties,
  getEventName,
  isIdentifyEvent,
  isSystemEvent,
  resolveDistinctId,
  resolveHost,
} from "./shared.js";

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
      device: { type: "desktop", userAgent: "Mozilla/5.0 TestAgent", language: "en-US" },
    },
    user: { anonymousId: "anon-123" },
    timestamp: "2026-06-16T12:00:00.000Z",
    id: "evt-001",
    version: "1.0.0",
    source: { type: "server", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

describe("shared", () => {
  describe("getEventName (3-tier)", () => {
    it("uses config override first", () => {
      const name = getEventName(makeEvent({ entity: "product", action: "viewed" }), {
        "product:viewed": "Custom Name",
      });
      expect(name).toBe("Custom Name");
    });

    it("falls back to DEFAULT_MAP ($pageview for page:viewed)", () => {
      expect(getEventName(makeEvent(), undefined)).toBe("$pageview");
    });

    it("generates entity_action when no map matches", () => {
      expect(getEventName(makeEvent({ entity: "product", action: "added" }), undefined)).toBe("product_added");
    });
  });

  describe("resolveDistinctId", () => {
    it("prefers userId when present", () => {
      expect(resolveDistinctId(makeEvent({ user: { anonymousId: "anon-1", userId: "user-9" } }))).toBe("user-9");
    });

    it("falls back to anonymousId", () => {
      expect(resolveDistinctId(makeEvent())).toBe("anon-123");
    });
  });

  describe("isSystemEvent / isIdentifyEvent", () => {
    it("detects _system entity", () => {
      expect(isSystemEvent(makeEvent({ entity: "_system", action: "init" }))).toBe(true);
      expect(isSystemEvent(makeEvent())).toBe(false);
    });

    it("detects user:identified", () => {
      expect(isIdentifyEvent(makeEvent({ entity: "user", action: "identified" }))).toBe(true);
      expect(isIdentifyEvent(makeEvent())).toBe(false);
    });
  });

  describe("resolveHost", () => {
    it("defaults to PostHog US cloud", () => {
      expect(resolveHost(undefined)).toBe(POSTHOG_DEFAULT_HOST);
    });

    it("strips trailing slash", () => {
      expect(resolveHost("https://eu.i.posthog.com/")).toBe("https://eu.i.posthog.com");
    });
  });

  describe("buildEventProperties", () => {
    it("merges event properties with $current_url and $referrer from page context", () => {
      const props = buildEventProperties(makeEvent({ properties: { plan: "pro" } }));
      expect(props.plan).toBe("pro");
      expect(props.$current_url).toBe("https://example.com/blog");
      expect(props.$referrer).toBe("https://google.com");
    });

    it("merges extra properties", () => {
      const props = buildEventProperties(makeEvent(), { $lib: "junction-server" });
      expect(props.$lib).toBe("junction-server");
    });
  });
});
