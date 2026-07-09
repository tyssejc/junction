import type { JctEvent } from "@junctionjs/core";
import { describe, expect, it } from "vitest";
import { transformServerEvent } from "./server.js";

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
    source: { type: "server", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

describe("server transform", () => {
  it("returns null for _system events", () => {
    expect(transformServerEvent(makeEvent({ entity: "_system", action: "init" }), { apiKey: "k" })).toBeNull();
  });

  it("maps a capture event with distinct_id, uuid, timestamp", () => {
    const result = transformServerEvent(makeEvent({ entity: "product", action: "added" }), { apiKey: "k" });
    expect(result).toEqual({
      event: "product_added",
      distinct_id: "anon-123",
      properties: expect.objectContaining({ $current_url: "https://example.com/blog" }),
      timestamp: "2026-06-16T12:00:00.000Z",
      uuid: "evt-001",
    });
  });

  it("prefers userId as distinct_id", () => {
    const result = transformServerEvent(makeEvent({ user: { anonymousId: "a", userId: "u" } }), { apiKey: "k" });
    expect(result?.distinct_id).toBe("u");
  });

  it("maps user:identified to a $identify event with $anon_distinct_id and $set", () => {
    const event = makeEvent({
      entity: "user",
      action: "identified",
      user: { anonymousId: "anon-123", userId: "user-9", traits: { email: "a@b.co" } },
    });
    const result = transformServerEvent(event, { apiKey: "k" });
    expect(result?.event).toBe("$identify");
    expect(result?.distinct_id).toBe("user-9");
    expect(result?.properties.$anon_distinct_id).toBe("anon-123");
    expect(result?.properties.$set).toEqual({ email: "a@b.co" });
  });

  it("applies eventNameMap override", () => {
    const result = transformServerEvent(makeEvent({ entity: "order", action: "completed" }), {
      apiKey: "k",
      eventNameMap: { "order:completed": "purchase" },
    });
    expect(result?.event).toBe("purchase");
  });
});
