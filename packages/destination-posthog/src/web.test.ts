import type { JctEvent } from "@junctionjs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPostHogWeb, transformWebEvent } from "./web.js";

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

interface FakePostHog {
  init: ReturnType<typeof vi.fn>;
  capture: ReturnType<typeof vi.fn>;
  identify: ReturnType<typeof vi.fn>;
  opt_out_capturing: ReturnType<typeof vi.fn>;
  opt_in_capturing: ReturnType<typeof vi.fn>;
  __loaded: boolean;
}

function installFakePostHog(): FakePostHog {
  const fake: FakePostHog = {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    __loaded: true,
  };
  vi.stubGlobal("window", { posthog: fake });
  return fake;
}

describe("web factory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has correct defaults", () => {
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    expect(dest.name).toBe("posthog-web");
    expect(dest.runtime).toBe("client");
    expect(dest.consent).toEqual(["analytics"]);
  });

  it("no-ops init in SSR (no window)", () => {
    vi.stubGlobal("window", undefined);
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    expect(() => dest.init({} as any)).not.toThrow();
  });

  it("inits posthog with autocapture and pageview off by default", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    expect(fake.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
      }),
    );
  });

  it("enables autocapture/pageview/replay when opted in", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({
      apiKey: "phc_test",
      autocapture: true,
      capturePageview: true,
      sessionReplay: true,
    });
    dest.init({} as any);
    const opts = fake.init.mock.calls[0][1];
    expect(opts.autocapture).toBe(true);
    expect(opts.capture_pageview).toBe(true);
    expect(opts.disable_session_recording).toBe(false);
  });
});

describe("web send", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes a capture payload to posthog.capture", async () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    const payload = dest.transform(makeEvent({ entity: "product", action: "added" }), {} as any);
    await dest.send(payload, {} as any);
    expect(fake.capture).toHaveBeenCalledWith("product_added", expect.objectContaining({ $lib: "junction-web" }));
  });

  it("routes an identify payload to posthog.identify", async () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    const event = makeEvent({
      entity: "user",
      action: "identified",
      user: { anonymousId: "anon-1", userId: "user-9", traits: { email: "a@b.co" } },
    });
    await dest.send(dest.transform(event, {} as any), {} as any);
    expect(fake.identify).toHaveBeenCalledWith("user-9", { $set: { email: "a@b.co" } });
  });
});

describe("web consent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opts out of capturing when analytics consent is revoked", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    dest.onConsent?.({ analytics: false } as any);
    expect(fake.opt_out_capturing).toHaveBeenCalled();
  });

  it("does not opt out while analytics consent is granted", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    dest.onConsent?.({ analytics: true } as any);
    expect(fake.opt_out_capturing).not.toHaveBeenCalled();
  });

  it("opts back in when analytics consent is re-granted", () => {
    const fake = installFakePostHog();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    dest.onConsent?.({ analytics: true } as any);
    expect(fake.opt_in_capturing).toHaveBeenCalled();
  });
});

describe("web loader (queue-before-load)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function installFakeDom() {
    const created: Array<Record<string, unknown>> = [];
    const firstScript = { parentNode: { insertBefore: vi.fn() } };
    const doc = {
      querySelector: vi.fn(() => null),
      createElement: vi.fn(() => {
        const el: Record<string, unknown> = {};
        created.push(el);
        return el;
      }),
      getElementsByTagName: vi.fn(() => [firstScript]),
    };
    vi.stubGlobal("window", { document: doc });
    return { doc, created };
  }

  it("installs a queuing stub and injects array.js when posthog isn't loaded", () => {
    const { created } = installFakeDom();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);

    const ph = (window as unknown as { posthog: any }).posthog;
    expect(ph).toBeDefined();
    expect(typeof ph.capture).toBe("function"); // stub method installed
    expect(ph._i).toHaveLength(1); // init call queued for replay
    expect(created[0].src).toContain("/static/array.js");
  });

  it("queues capture calls fired before array.js loads instead of dropping them", () => {
    installFakeDom();
    const dest = createPostHogWeb({ apiKey: "phc_test" });
    dest.init({} as any);
    dest.send({ type: "capture", name: "product_added", properties: { $lib: "junction-web" } } as any, {} as any);

    const ph = (window as unknown as { posthog: any }).posthog;
    const queued = (ph as unknown[]).find((e) => Array.isArray(e) && e[0] === "capture");
    expect(queued).toEqual(["capture", "product_added", { $lib: "junction-web" }]);
  });
});
