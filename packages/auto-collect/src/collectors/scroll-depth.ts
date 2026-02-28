/**
 * Scroll Depth Collector
 *
 * Tracks scroll depth milestones (25%, 50%, 75%, 100%).
 * Each threshold fires exactly once per page load.
 * Uses a throttled scroll listener for performance.
 */

import type { ScrollDepthOptions, TeardownFn, Trackable } from "../types.js";
import { throttle } from "../utils/dom.js";

const DEFAULT_THRESHOLDS = [25, 50, 75, 100];

export function collectScrollDepth(collector: Trackable, options: ScrollDepthOptions = {}): TeardownFn {
  const thresholds = (options.thresholds ?? DEFAULT_THRESHOLDS).sort((a, b) => a - b);
  const fired = new Set<number>();

  function getScrollPercent(): number {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    if (scrollHeight <= 0) return 100; // Page fits in viewport
    return Math.round((scrollTop / scrollHeight) * 100);
  }

  function checkThresholds(): void {
    const percent = getScrollPercent();
    for (const threshold of thresholds) {
      if (percent >= threshold && !fired.has(threshold)) {
        fired.add(threshold);
        collector.track("page", "scrolled", {
          depth_percent: threshold,
          depth_pixels: Math.round(window.scrollY),
          page_height: document.documentElement.scrollHeight,
        });
      }
    }
  }

  const throttledCheck = throttle(checkThresholds, 200);

  window.addEventListener("scroll", throttledCheck, { passive: true });

  // Check immediately in case the page is already scrolled (e.g., anchor links)
  checkThresholds();

  return () => {
    window.removeEventListener("scroll", throttledCheck);
  };
}
