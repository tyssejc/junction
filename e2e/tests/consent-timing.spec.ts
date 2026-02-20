import { expect, test } from "@playwright/test";

// Helper: wait for events to appear in the test sink
async function getEvents(page: any): Promise<any[]> {
  return page.evaluate(() => (window as any).__TEST__.events);
}

// Helper: wait until N events are captured (with timeout)
async function waitForEvents(page: any, count: number, timeoutMs = 5000): Promise<any[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const events = await getEvents(page);
    if (events.length >= count) return events;
    await page.waitForTimeout(50);
  }
  return getEvents(page);
}

test.describe("Consent timing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the IIFE bundle to load
    await page.waitForFunction(() => typeof (window as any).Junction !== "undefined");
  });

  test("CMP loads before Junction — events dispatch immediately, was_queued absent", async ({ page }) => {
    // Initialize with consent pre-granted (simulates CMP already loaded)
    await page.evaluate(() => {
      (window as any).initJunction({
        consent: {
          defaultState: { analytics: true },
        },
      });
    });

    // Track an event
    await page.evaluate(() => {
      (window as any).__TEST__.collector.track("page", "viewed", { path: "/home" });
    });

    // Wait for the event to be dispatched (buffer maxWait is 100ms)
    const events = await waitForEvents(page, 1);

    expect(events.length).toBe(1);
    expect(events[0].entity).toBe("page");
    expect(events[0].action).toBe("viewed");
    // Consent snapshot should be present
    expect(events[0].context.consent).toBeDefined();
    expect(events[0].context.consent.analytics).toBe(true);
    // was_queued should be absent (not false) — event dispatched immediately
    expect(events[0].context.was_queued).toBeUndefined();
  });

  test("Junction loads before CMP — events queue while pending, flush after consent, was_queued: true", async ({
    page,
  }) => {
    // Initialize with consent pending (empty defaultState)
    await page.evaluate(() => {
      (window as any).initJunction({
        consent: {
          defaultState: {}, // analytics is undefined = pending
        },
      });
    });

    // Track an event while consent is pending
    await page.evaluate(() => {
      (window as any).__TEST__.collector.track("page", "viewed", { path: "/pending" });
    });

    // Wait briefly — event should NOT be dispatched
    await page.waitForTimeout(300);
    let events = await getEvents(page);
    expect(events.length).toBe(0);

    // Simulate CMP granting consent
    await page.evaluate(() => {
      (window as any).__TEST__.collector.consent({ analytics: true });
    });

    // Wait for queue flush (async via queueMicrotask)
    events = await waitForEvents(page, 1);

    expect(events.length).toBe(1);
    expect(events[0].entity).toBe("page");
    expect(events[0].context.was_queued).toBe(true);
    // Consent snapshot should reflect the resolved state
    expect(events[0].context.consent.analytics).toBe(true);
  });

  test("CMP blocked (never loads) — consentFallback fires after timeout, events drop if fallback denies", async ({
    page,
  }) => {
    // Initialize with consent pending + fallback that denies analytics after 500ms
    await page.evaluate(() => {
      (window as any).initJunction({
        consent: {
          defaultState: {}, // pending
          consentFallback: {
            timeout: 500,
            state: { analytics: false }, // fallback denies
          },
        },
      });
    });

    // Track an event while consent is pending
    await page.evaluate(() => {
      (window as any).__TEST__.collector.track("ad", "clicked", { adId: "123" });
    });

    // Wait for fallback to fire (500ms + buffer)
    await page.waitForTimeout(800);

    // Events should have been flushed from queue, but since fallback denies analytics,
    // the event should not have been dispatched to the test-sink (which requires analytics consent)
    const events = await getEvents(page);
    expect(events.length).toBe(0);
  });

  test("Returning visitor — consent pre-granted via defaultState, events dispatch immediately with correct snapshot", async ({
    page,
  }) => {
    // Simulate a returning visitor who previously granted all categories
    await page.evaluate(() => {
      (window as any).initJunction({
        consent: {
          defaultState: {
            analytics: true,
            marketing: true,
            personalization: true,
          },
        },
      });
    });

    // Track multiple events
    await page.evaluate(() => {
      const c = (window as any).__TEST__.collector;
      c.track("page", "viewed", { path: "/" });
      c.track("product", "viewed", { id: "sku-1" });
    });

    // Wait for dispatch
    const events = await waitForEvents(page, 2);

    expect(events.length).toBe(2);

    // All events should have correct consent snapshot
    for (const event of events) {
      expect(event.context.consent).toBeDefined();
      expect(event.context.consent.analytics).toBe(true);
      expect(event.context.consent.marketing).toBe(true);
      expect(event.context.consent.personalization).toBe(true);
      // No was_queued — events dispatched immediately
      expect(event.context.was_queued).toBeUndefined();
    }
  });
});
