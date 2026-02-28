/**
 * Engagement Collector
 *
 * Tracks user engagement with the page:
 * - Total time on page
 * - Visible time vs hidden time (via visibilitychange)
 * - Periodic heartbeats (configurable interval)
 * - Final engagement event on page hide
 *
 * Engagement time only accumulates while the page is visible.
 */

import type { EngagementOptions, TeardownFn, Trackable } from "../types.js";

export function collectEngagement(collector: Trackable, options: EngagementOptions = {}): TeardownFn {
  const { heartbeatInterval = 15_000, trackOnHide = true } = options;

  const startTime = Date.now();
  let visibleTime = 0;
  let hiddenTime = 0;
  let lastTransition = Date.now();
  let isVisible = !document.hidden;
  let heartbeatCount = 0;

  function accumulateTime(): void {
    const now = Date.now();
    const elapsed = now - lastTransition;
    if (isVisible) {
      visibleTime += elapsed;
    } else {
      hiddenTime += elapsed;
    }
    lastTransition = now;
  }

  function getEngagementProps(): Record<string, unknown> {
    accumulateTime();
    return {
      duration_ms: Date.now() - startTime,
      visible_ms: visibleTime,
      hidden_ms: hiddenTime,
      heartbeat_count: heartbeatCount,
    };
  }

  function handleVisibilityChange(): void {
    accumulateTime();
    const wasVisible = isVisible;
    isVisible = !document.hidden;

    if (wasVisible && !isVisible && trackOnHide) {
      // Page going hidden — send final engagement snapshot
      collector.track("page", "engaged", getEngagementProps());
    }
  }

  // Periodic heartbeat
  const intervalId = setInterval(() => {
    if (isVisible) {
      heartbeatCount++;
      collector.track("page", "heartbeat", getEngagementProps());
    }
  }, heartbeatInterval);

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
