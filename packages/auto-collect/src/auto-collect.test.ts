/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectClicks } from "./collectors/clicks.js";
import { collectEngagement } from "./collectors/engagement.js";
import { collectFormSubmit } from "./collectors/form-submit.js";
import { collectScrollDepth } from "./collectors/scroll-depth.js";
import { collectVideo } from "./collectors/video.js";
import { createAutoCollect } from "./index.js";
import type { Trackable } from "./types.js";

// ─── Test Helpers ────────────────────────────────────────────────

function mockCollector(): Trackable & { track: ReturnType<typeof vi.fn> } {
  return { track: vi.fn() };
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

// ─── createAutoCollect ──────────────────────────────────────────

describe("createAutoCollect", () => {
  it("returns a destroy function", () => {
    const collector = mockCollector();
    const ac = createAutoCollect(collector, {});
    expect(typeof ac.destroy).toBe("function");
    ac.destroy();
  });

  it("does nothing when no collectors are enabled", () => {
    const collector = mockCollector();
    const ac = createAutoCollect(collector, {});
    ac.destroy();
    expect(collector.track).not.toHaveBeenCalled();
  });

  it("enables collectors with boolean true", () => {
    const collector = mockCollector();
    const ac = createAutoCollect(collector, {
      clicks: true,
      formSubmit: true,
    });
    // Should not throw — collectors are active
    ac.destroy();
  });
});

// ─── Click Tracking ─────────────────────────────────────────────

describe("collectClicks", () => {
  let collector: ReturnType<typeof mockCollector>;
  let teardown: () => void;

  beforeEach(() => {
    collector = mockCollector();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    teardown?.();
    document.body.innerHTML = "";
  });

  it("tracks clicks on elements with data-jct-track", () => {
    document.body.innerHTML = '<button data-jct-track id="cta">Sign Up</button>';
    teardown = collectClicks(collector);

    click(document.getElementById("cta")!);

    expect(collector.track).toHaveBeenCalledTimes(1);
    expect(collector.track).toHaveBeenCalledWith(
      "element",
      "clicked",
      expect.objectContaining({
        tag: "button",
        text: "Sign Up",
        element_id: "cta",
      }),
    );
  });

  it("tracks clicks on buttons without data-jct-track", () => {
    document.body.innerHTML = '<button id="btn">Click Me</button>';
    teardown = collectClicks(collector);

    click(document.getElementById("btn")!);

    expect(collector.track).toHaveBeenCalledTimes(1);
    expect(collector.track).toHaveBeenCalledWith(
      "element",
      "clicked",
      expect.objectContaining({ tag: "button", text: "Click Me" }),
    );
  });

  it("uses custom entity/action from data attributes", () => {
    document.body.innerHTML = '<button data-jct-track data-jct-entity="cta" data-jct-action="pressed">Go</button>';
    teardown = collectClicks(collector);

    click(document.querySelector("button")!);

    expect(collector.track).toHaveBeenCalledWith("cta", "pressed", expect.any(Object));
  });

  it("ignores elements with data-jct-ignore", () => {
    document.body.innerHTML = "<div data-jct-ignore><button data-jct-track>Nope</button></div>";
    teardown = collectClicks(collector);

    click(document.querySelector("button")!);

    expect(collector.track).not.toHaveBeenCalled();
  });

  it("tracks outbound links", () => {
    document.body.innerHTML = '<a href="https://external.com/page">External</a>';
    teardown = collectClicks(collector);

    click(document.querySelector("a")!);

    expect(collector.track).toHaveBeenCalledWith(
      "link",
      "clicked",
      expect.objectContaining({
        href: "https://external.com/page",
        external: true,
      }),
    );
  });

  it("tracks download links", () => {
    document.body.innerHTML = '<a href="/files/report.pdf">Download PDF</a>';
    teardown = collectClicks(collector);

    click(document.querySelector("a")!);

    expect(collector.track).toHaveBeenCalledWith(
      "file",
      "downloaded",
      expect.objectContaining({
        extension: "pdf",
      }),
    );
  });

  it("does not track plain internal links", () => {
    document.body.innerHTML = '<a href="/about">About Us</a>';
    teardown = collectClicks(collector);

    click(document.querySelector("a")!);

    expect(collector.track).not.toHaveBeenCalled();
  });

  it("respects selector option", () => {
    document.body.innerHTML = `
      <button class="track-me" data-jct-track>Yes</button>
      <button data-jct-track>No</button>
    `;
    teardown = collectClicks(collector, { selector: ".track-me" });

    click(document.querySelector(".track-me")!);
    click(document.querySelectorAll("button")[1]);

    expect(collector.track).toHaveBeenCalledTimes(1);
  });

  it("passes data-jct-prop-* as properties", () => {
    document.body.innerHTML =
      '<button data-jct-track data-jct-prop-variant="blue" data-jct-prop-position="header">Click</button>';
    teardown = collectClicks(collector);

    click(document.querySelector("button")!);

    expect(collector.track).toHaveBeenCalledWith(
      "element",
      "clicked",
      expect.objectContaining({
        variant: "blue",
        position: "header",
      }),
    );
  });

  it("cleans up event listeners on teardown", () => {
    document.body.innerHTML = "<button data-jct-track>Click</button>";
    teardown = collectClicks(collector);
    teardown();

    click(document.querySelector("button")!);

    expect(collector.track).not.toHaveBeenCalled();
  });
});

// ─── Scroll Depth ───────────────────────────────────────────────

describe("collectScrollDepth", () => {
  let collector: ReturnType<typeof mockCollector>;
  let teardown: () => void;

  beforeEach(() => {
    collector = mockCollector();
  });

  afterEach(() => {
    teardown?.();
  });

  it("fires page:scrolled events at thresholds", () => {
    // In happy-dom, scrollHeight and clientHeight may be 0 or equal,
    // meaning scroll percent is 100% immediately
    teardown = collectScrollDepth(collector, { thresholds: [25, 50, 75, 100] });

    // When page fits in viewport, all thresholds fire immediately
    // (getScrollPercent returns 100 because scrollHeight <= clientHeight)
    expect(collector.track).toHaveBeenCalledWith(
      "page",
      "scrolled",
      expect.objectContaining({ depth_percent: expect.any(Number) }),
    );
  });

  it("fires each threshold only once", () => {
    teardown = collectScrollDepth(collector, { thresholds: [100] });

    // Fire scroll event multiple times
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));

    // Should only have fired once (from initial check or first scroll)
    const scrollCalls = collector.track.mock.calls.filter(
      (call: any[]) => call[0] === "page" && call[1] === "scrolled",
    );
    expect(scrollCalls.length).toBe(1);
  });

  it("cleans up on teardown", () => {
    teardown = collectScrollDepth(collector, { thresholds: [] }); // no thresholds
    teardown();
    // No assertions needed — just verifying no errors on cleanup
  });
});

// ─── Video Tracking ──────────────────────────────────────────────

describe("collectVideo", () => {
  let collector: ReturnType<typeof mockCollector>;
  let teardown: () => void;

  beforeEach(() => {
    collector = mockCollector();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    teardown?.();
    document.body.innerHTML = "";
  });

  it("tracks video play events", () => {
    document.body.innerHTML = '<video src="test.mp4" title="Test Video"></video>';
    teardown = collectVideo(collector);

    const video = document.querySelector("video")!;
    video.dispatchEvent(new Event("play"));

    expect(collector.track).toHaveBeenCalledWith("video", "played", expect.objectContaining({ title: "Test Video" }));
  });

  it("tracks video pause events", () => {
    document.body.innerHTML = '<video src="test.mp4"></video>';
    teardown = collectVideo(collector);

    const video = document.querySelector("video")!;
    video.dispatchEvent(new Event("pause"));

    expect(collector.track).toHaveBeenCalledWith("video", "paused", expect.any(Object));
  });

  it("tracks video ended events", () => {
    document.body.innerHTML = '<video src="test.mp4"></video>';
    teardown = collectVideo(collector);

    const video = document.querySelector("video")!;
    video.dispatchEvent(new Event("ended"));

    expect(collector.track).toHaveBeenCalledWith("video", "completed", expect.any(Object));
  });

  it("ignores videos with data-jct-ignore", () => {
    document.body.innerHTML = '<div data-jct-ignore><video src="test.mp4"></video></div>';
    teardown = collectVideo(collector);

    const video = document.querySelector("video")!;
    video.dispatchEvent(new Event("play"));

    expect(collector.track).not.toHaveBeenCalled();
  });

  it("uses data-jct-name as title", () => {
    document.body.innerHTML = '<video src="test.mp4" data-jct-name="Hero Video"></video>';
    teardown = collectVideo(collector);

    const video = document.querySelector("video")!;
    video.dispatchEvent(new Event("play"));

    expect(collector.track).toHaveBeenCalledWith("video", "played", expect.objectContaining({ title: "Hero Video" }));
  });

  it("cleans up on teardown", () => {
    document.body.innerHTML = '<video src="test.mp4"></video>';
    teardown = collectVideo(collector);
    teardown();

    const video = document.querySelector("video")!;
    video.dispatchEvent(new Event("play"));

    expect(collector.track).not.toHaveBeenCalled();
  });
});

// ─── Form Submit ────────────────────────────────────────────────

describe("collectFormSubmit", () => {
  let collector: ReturnType<typeof mockCollector>;
  let teardown: () => void;

  beforeEach(() => {
    collector = mockCollector();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    teardown?.();
    document.body.innerHTML = "";
  });

  it("tracks form submissions", () => {
    document.body.innerHTML = `
      <form id="signup" name="signup-form" method="post" action="/api/signup">
        <input type="email" />
        <input type="password" />
        <button type="submit">Submit</button>
      </form>
    `;
    teardown = collectFormSubmit(collector);

    const form = document.querySelector("form")!;
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true }));

    expect(collector.track).toHaveBeenCalledWith(
      "form",
      "submitted",
      expect.objectContaining({
        form_id: "signup",
        form_name: "signup-form",
        method: "POST",
      }),
    );
  });

  it("counts field types without capturing values", () => {
    document.body.innerHTML = `
      <form>
        <input type="text" />
        <input type="email" />
        <textarea></textarea>
        <select><option>A</option></select>
      </form>
    `;
    teardown = collectFormSubmit(collector);

    const form = document.querySelector("form")!;
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true }));

    expect(collector.track).toHaveBeenCalledWith(
      "form",
      "submitted",
      expect.objectContaining({
        field_count: 4,
        field_types: expect.objectContaining({
          text: 1,
          email: 1,
          textarea: 1,
          select: 1,
        }),
      }),
    );
  });

  it("ignores forms with data-jct-ignore", () => {
    document.body.innerHTML = '<form data-jct-ignore><input /><button type="submit">Go</button></form>';
    teardown = collectFormSubmit(collector);

    const form = document.querySelector("form")!;
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true }));

    expect(collector.track).not.toHaveBeenCalled();
  });

  it("respects selector option", () => {
    document.body.innerHTML = `
      <form class="track-me"><input /></form>
      <form><input /></form>
    `;
    teardown = collectFormSubmit(collector, { selector: ".track-me" });

    const forms = document.querySelectorAll("form");
    forms[0].dispatchEvent(new SubmitEvent("submit", { bubbles: true }));
    forms[1].dispatchEvent(new SubmitEvent("submit", { bubbles: true }));

    expect(collector.track).toHaveBeenCalledTimes(1);
  });

  it("cleans up on teardown", () => {
    document.body.innerHTML = "<form><input /></form>";
    teardown = collectFormSubmit(collector);
    teardown();

    const form = document.querySelector("form")!;
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true }));

    expect(collector.track).not.toHaveBeenCalled();
  });
});

// ─── Engagement ─────────────────────────────────────────────────

describe("collectEngagement", () => {
  let collector: ReturnType<typeof mockCollector>;
  let teardown: () => void;

  beforeEach(() => {
    collector = mockCollector();
    vi.useFakeTimers();
  });

  afterEach(() => {
    teardown?.();
    vi.useRealTimers();
  });

  it("sends heartbeat events at configured interval", () => {
    teardown = collectEngagement(collector, { heartbeatInterval: 5000 });

    vi.advanceTimersByTime(5000);
    expect(collector.track).toHaveBeenCalledWith(
      "page",
      "heartbeat",
      expect.objectContaining({
        duration_ms: expect.any(Number),
        visible_ms: expect.any(Number),
        heartbeat_count: 1,
      }),
    );

    vi.advanceTimersByTime(5000);
    const calls = collector.track.mock.calls.filter((c: any[]) => c[1] === "heartbeat");
    expect(calls.length).toBe(2);
  });

  it("cleans up interval on teardown", () => {
    teardown = collectEngagement(collector, { heartbeatInterval: 5000 });
    teardown();

    vi.advanceTimersByTime(10000);
    expect(collector.track).not.toHaveBeenCalled();
  });
});

// ─── DOM Utilities ──────────────────────────────────────────────

describe("DOM utilities", () => {
  it("isIgnored checks ancestors", () => {
    document.body.innerHTML = '<div data-jct-ignore><span id="child">Text</span></div>';
    // We test this indirectly through collector behavior above
    const child = document.getElementById("child")!;
    expect(child.closest("[data-jct-ignore]")).not.toBeNull();
  });
});
