// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOneTrustAdapter } from "./index.js";

describe("OneTrust Adapter", () => {
  let mockCollector: { consent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCollector = { consent: vi.fn() };
    // Clean up globals between tests
    (window as any).OnetrustActiveGroups = undefined;
    (window as any).OptanonWrapper = undefined;
  });

  afterEach(() => {
    (window as any).OnetrustActiveGroups = undefined;
    (window as any).OptanonWrapper = undefined;
  });

  // ─── 1. Standard group mapping ──────────────────────────────────

  it("maps standard OneTrust groups to Junction categories", () => {
    // C0001 (necessary) + C0002 (analytics) + C0004 (marketing) active;
    // C0003 (personalization) and C0005 (social) are absent.
    (window as any).OnetrustActiveGroups = ",C0001,C0002,C0004,";

    createOneTrustAdapter(mockCollector);

    expect(mockCollector.consent).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenCalledWith({
      necessary: true,
      analytics: true,
      personalization: false,
      marketing: true,
      social: false,
    });
  });

  // ─── 2. Custom category map ─────────────────────────────────────

  it("handles a custom category map", () => {
    (window as any).OnetrustActiveGroups = ",C0001,CUSTOM1,";

    createOneTrustAdapter(mockCollector, {
      categoryMap: {
        analytics: "CUSTOM1", // override analytics to a custom group ID
      },
    });

    expect(mockCollector.consent).toHaveBeenCalledOnce();
    const state = mockCollector.consent.mock.calls[0][0];
    expect(state.analytics).toBe(true);
    // personalization, marketing, social use their defaults and are absent from activeGroups
    expect(state.personalization).toBe(false);
    expect(state.marketing).toBe(false);
    expect(state.social).toBe(false);
    expect(state.necessary).toBe(true);
  });

  // ─── 3. Immediate sync for returning visitors ──────────────────

  it("syncs immediately when OnetrustActiveGroups is already set", () => {
    (window as any).OnetrustActiveGroups = ",C0001,C0002,";

    createOneTrustAdapter(mockCollector);

    // Should have been called exactly once during construction
    expect(mockCollector.consent).toHaveBeenCalledOnce();
  });

  // ─── 4. Fires on OneTrustGroupsUpdated event ───────────────────

  it("fires on OneTrustGroupsUpdated window event", () => {
    createOneTrustAdapter(mockCollector);

    // No active groups yet — initial sync is a no-op
    expect(mockCollector.consent).not.toHaveBeenCalled();

    // Simulate OneTrust firing its consent-updated event
    (window as any).OnetrustActiveGroups = ",C0001,C0002,C0003,C0004,C0005,";
    window.dispatchEvent(new Event("OneTrustGroupsUpdated"));

    expect(mockCollector.consent).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenCalledWith({
      necessary: true,
      analytics: true,
      personalization: true,
      marketing: true,
      social: true,
    });
  });

  // ─── 5. Chains existing OptanonWrapper ─────────────────────────

  it("chains onto an existing OptanonWrapper", () => {
    const originalWrapper = vi.fn();
    (window as any).OptanonWrapper = originalWrapper;

    (window as any).OnetrustActiveGroups = ",C0001,C0002,";
    createOneTrustAdapter(mockCollector);

    // Reset call counts after construction
    mockCollector.consent.mockClear();
    originalWrapper.mockClear();

    // Simulate OneTrust calling OptanonWrapper
    (window as any).OnetrustActiveGroups = ",C0001,C0002,C0004,";
    (window as any).OptanonWrapper();

    expect(originalWrapper).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenCalledWith(expect.objectContaining({ analytics: true, marketing: true }));
  });

  // ─── 6. destroy() removes listeners ────────────────────────────

  it("destroy() removes the OneTrustGroupsUpdated listener", () => {
    const adapter = createOneTrustAdapter(mockCollector);

    // Initial sync with no groups — no call
    expect(mockCollector.consent).not.toHaveBeenCalled();

    adapter.destroy();

    // Dispatching the event after destroy should not trigger the collector
    (window as any).OnetrustActiveGroups = ",C0001,C0002,";
    window.dispatchEvent(new Event("OneTrustGroupsUpdated"));

    expect(mockCollector.consent).not.toHaveBeenCalled();
  });

  it("destroy() restores the original OptanonWrapper", () => {
    const originalWrapper = vi.fn();
    (window as any).OptanonWrapper = originalWrapper;

    const adapter = createOneTrustAdapter(mockCollector);
    expect((window as any).OptanonWrapper).not.toBe(originalWrapper);

    adapter.destroy();
    expect((window as any).OptanonWrapper).toBe(originalWrapper);
  });

  it("destroy() removes OptanonWrapper when none existed before", () => {
    // No pre-existing OptanonWrapper
    const adapter = createOneTrustAdapter(mockCollector);
    expect((window as any).OptanonWrapper).toBeDefined();

    adapter.destroy();
    expect((window as any).OptanonWrapper).toBeUndefined();
  });

  // ─── 7. sync() re-reads current state ─────────────────────────

  it("sync() re-reads and pushes updated consent state", () => {
    (window as any).OnetrustActiveGroups = ",C0001,C0002,";
    const adapter = createOneTrustAdapter(mockCollector);

    expect(mockCollector.consent).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenLastCalledWith(
      expect.objectContaining({ analytics: true, marketing: false }),
    );

    // User updates their choices; OneTrust updates the global
    (window as any).OnetrustActiveGroups = ",C0001,C0002,C0004,";
    adapter.sync();

    expect(mockCollector.consent).toHaveBeenCalledTimes(2);
    expect(mockCollector.consent).toHaveBeenLastCalledWith(
      expect.objectContaining({ analytics: true, marketing: true }),
    );
  });

  // ─── 8. Missing OnetrustActiveGroups is handled gracefully ─────

  it("does not call collector.consent when OnetrustActiveGroups is absent", () => {
    // No OnetrustActiveGroups set
    expect(() => createOneTrustAdapter(mockCollector)).not.toThrow();
    expect(mockCollector.consent).not.toHaveBeenCalled();
  });

  it("does not call collector.consent when OnetrustActiveGroups is an empty string", () => {
    (window as any).OnetrustActiveGroups = "";
    expect(() => createOneTrustAdapter(mockCollector)).not.toThrow();
    expect(mockCollector.consent).not.toHaveBeenCalled();
  });

  // ─── 9. Non-browser environment guard ──────────────────────────

  it("throws when window is undefined", () => {
    // Temporarily hide window to simulate a non-browser environment
    const originalWindow = global.window;
    // @ts-expect-error assigning undefined to simulate non-browser
    global.window = undefined;

    try {
      expect(() => createOneTrustAdapter(mockCollector)).toThrow(
        "[Junction:OneTrust] OneTrust adapter requires a browser environment",
      );
    } finally {
      // Always restore window so subsequent tests are not broken
      global.window = originalWindow;
    }
  });
});
