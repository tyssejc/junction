import type { JctEvent } from "@junctionjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPostHogServer, transformServerEvent } from "./server.js";

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

describe("server factory", () => {
  it("has correct defaults", () => {
    const dest = createPostHogServer({ apiKey: "phc_test" });
    expect(dest.name).toBe("posthog-server");
    expect(dest.runtime).toBe("server");
    expect(dest.consent).toEqual(["analytics"]);
  });

  it("throws on init when apiKey missing", () => {
    const dest = createPostHogServer({ apiKey: "" });
    expect(() => dest.init({} as any)).toThrow("apiKey is required");
  });

  it("honors a custom consent config", () => {
    const dest = createPostHogServer({ apiKey: "k", consent: ["analytics", "marketing"] });
    expect(dest.consent).toEqual(["analytics", "marketing"]);
  });
});

describe("server send", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs a single event to /capture when batchSize is 1", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "phc_test", batchSize: 1 });
    dest.init({} as any);
    const payload = dest.transform(makeEvent({ entity: "product", action: "added" }), {} as any);
    await dest.send(payload, {} as any);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/capture/");
    const body = JSON.parse(options.body);
    expect(body.api_key).toBe("phc_test");
    expect(body.event).toBe("product_added");
  });

  it("buffers events and flushes to /batch when batchSize is reached", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "phc_test", batchSize: 2 });
    dest.init({} as any);

    await dest.send(dest.transform(makeEvent({ entity: "a", action: "x" }), {} as any), {} as any);
    expect(mockFetch).not.toHaveBeenCalled(); // buffered, not yet flushed

    await dest.send(dest.transform(makeEvent({ entity: "b", action: "y" }), {} as any), {} as any);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/batch/");
    const body = JSON.parse(options.body);
    expect(body.batch).toHaveLength(2);
  });

  it("teardown flushes a partial buffer", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "phc_test", batchSize: 10 });
    dest.init({} as any);
    await dest.send(dest.transform(makeEvent({ entity: "a", action: "x" }), {} as any), {} as any);
    expect(mockFetch).not.toHaveBeenCalled();

    await dest.teardown?.();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).batch).toHaveLength(1);
  });

  it("uses the EU host when configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", host: "https://eu.i.posthog.com", batchSize: 1 });
    dest.init({} as any);
    await dest.send(dest.transform(makeEvent(), {} as any), {} as any);
    expect(mockFetch.mock.calls[0][0]).toBe("https://eu.i.posthog.com/capture/");
  });

  it("retries on failure then throws after maxRetries", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("boom") });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", batchSize: 1, maxRetries: 2 });
    dest.init({} as any);
    await expect(dest.send(dest.transform(makeEvent(), {} as any), {} as any)).rejects.toThrow("500");
    // initial attempt + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe("server reliability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not retry non-retryable 4xx responses", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve("bad key") });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", batchSize: 1, maxRetries: 3 });
    dest.init({} as any);
    await expect(dest.send(dest.transform(makeEvent(), {} as any), {} as any)).rejects.toThrow("401");
    // 401 is terminal — one attempt, no retries
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 rate-limit response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve("slow down") });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", batchSize: 1, maxRetries: 2 });
    dest.init({} as any);
    await expect(dest.send(dest.transform(makeEvent(), {} as any), {} as any)).rejects.toThrow("429");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("requeues a failed batch instead of dropping it, and resends later", async () => {
    // First flush fails on every attempt; the event must survive in the buffer.
    const failing = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("down") });
    vi.stubGlobal("fetch", failing);

    const dest = createPostHogServer({ apiKey: "k", batchSize: 1, maxRetries: 0 });
    dest.init({} as any);
    await expect(dest.send(dest.transform(makeEvent({ id: "keep-me" }), {} as any), {} as any)).rejects.toThrow("500");

    // PostHog recovers — teardown's flush should resend the requeued event.
    const ok = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", ok);
    await dest.teardown?.();

    expect(ok).toHaveBeenCalledTimes(1);
    const body = JSON.parse(ok.mock.calls[0][1].body);
    expect(body.uuid).toBe("keep-me");
  });

  it("drops oldest events and logs once the buffer exceeds maxBufferSize", async () => {
    const failing = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("down") });
    vi.stubGlobal("fetch", failing);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const dest = createPostHogServer({ apiKey: "k", batchSize: 1, maxRetries: 0, maxBufferSize: 1 });
    dest.init({} as any);

    await expect(dest.send(dest.transform(makeEvent({ id: "e1" }), {} as any), {} as any)).rejects.toThrow();
    await expect(dest.send(dest.transform(makeEvent({ id: "e2" }), {} as any), {} as any)).rejects.toThrow();

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("buffer exceeded 1; dropped 1"));
  });

  it("auto-flushes on the interval timer", async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const dest = createPostHogServer({ apiKey: "k", batchSize: 5, flushIntervalMs: 1000 });
    dest.init({} as any);
    await dest.send(dest.transform(makeEvent(), {} as any), {} as any);
    expect(mockFetch).not.toHaveBeenCalled(); // buffered, below batchSize

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://us.i.posthog.com/batch/");

    vi.useRealTimers();
  });
});
