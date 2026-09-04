import type { JctEvent } from "@junctionjs/core";
import { describe, expect, it } from "vitest";
import { transformWebEvent } from "./web.js";

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
    },
    user: { anonymousId: "anon-123" },
    timestamp: "2026-06-16T12:00:00.000Z",
    id: "evt-001",
    version: "1.0.0",
    source: { type: "client", name: "browser", version: "0.0.0" },
    ...overrides,
  };
}

describe("web transform", () => {
  it("returns null for _system events", () => {
    expect(transformWebEvent(makeEvent({ entity: "_system", action: "init" }), { apiKey: "k" })).toBeNull();
  });

  it("maps a capture event", () => {
    const result = transformWebEvent(makeEvent({ entity: "product", action: "added" }), { apiKey: "k" });
    expect(result).toEqual({
      type: "capture",
      name: "product_added",
      properties: expect.objectContaining({ $current_url: "https://example.com/blog" }),
    });
  });

  it("maps user:identified to an identify payload", () => {
    const event = makeEvent({
      entity: "user",
      action: "identified",
      user: { anonymousId: "anon-123", userId: "user-9", traits: { email: "a@b.co" } },
    });
    const result = transformWebEvent(event, { apiKey: "k" });
    expect(result).toEqual({ type: "identify", distinctId: "user-9", traits: { email: "a@b.co" } });
  });
});
