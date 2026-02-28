/**
 * @junctionjs/auto-collect
 *
 * Automatic event collection for Junction. Attaches browser event listeners
 * to track common user interactions without manual instrumentation.
 *
 * Design decisions:
 * - Separate package from @junctionjs/client: tree-shakeable, opt-in only.
 * - Takes a Collector (or any object with track()): dependency injection,
 *   works with both createClient() and createCollector().
 * - Each collector is independently toggleable and configurable.
 * - Returns a single destroy() function for clean teardown.
 * - No consent logic here — events flow through the collector, which already
 *   handles consent gating per destination.
 *
 * Usage:
 *   import { createClient } from "@junctionjs/client";
 *   import { createAutoCollect } from "@junctionjs/auto-collect";
 *
 *   const client = createClient({ ... });
 *   const autoCollect = createAutoCollect(client, {
 *     clicks: true,
 *     scrollDepth: { thresholds: [25, 50, 75, 100] },
 *     video: true,
 *     formSubmit: true,
 *     engagement: { heartbeatInterval: 15_000 },
 *     webVitals: true,
 *   });
 *
 *   // Later, to clean up:
 *   autoCollect.destroy();
 */

import { collectClicks } from "./collectors/clicks.js";
import { collectEngagement } from "./collectors/engagement.js";
import { collectFormSubmit } from "./collectors/form-submit.js";
import { collectScrollDepth } from "./collectors/scroll-depth.js";
import { collectVideo } from "./collectors/video.js";
import { collectWebVitals } from "./collectors/web-vitals.js";
import type { AutoCollect, AutoCollectConfig, TeardownFn, Trackable } from "./types.js";

export function createAutoCollect(collector: Trackable, config: AutoCollectConfig = {}): AutoCollect {
  const teardowns: TeardownFn[] = [];

  if (config.clicks) {
    const options = config.clicks === true ? {} : config.clicks;
    teardowns.push(collectClicks(collector, options));
  }

  if (config.scrollDepth) {
    const options = config.scrollDepth === true ? {} : config.scrollDepth;
    teardowns.push(collectScrollDepth(collector, options));
  }

  if (config.video) {
    const options = config.video === true ? {} : config.video;
    teardowns.push(collectVideo(collector, options));
  }

  if (config.formSubmit) {
    const options = config.formSubmit === true ? {} : config.formSubmit;
    teardowns.push(collectFormSubmit(collector, options));
  }

  if (config.engagement) {
    const options = config.engagement === true ? {} : config.engagement;
    teardowns.push(collectEngagement(collector, options));
  }

  if (config.webVitals) {
    const options = config.webVitals === true ? {} : config.webVitals;
    teardowns.push(collectWebVitals(collector, options));
  }

  return {
    destroy() {
      for (const teardown of teardowns) {
        teardown();
      }
      teardowns.length = 0;
    },
  };
}

// Re-export types for consumer convenience
export type {
  AutoCollect,
  AutoCollectConfig,
  ClickOptions,
  EngagementOptions,
  FormSubmitOptions,
  ScrollDepthOptions,
  TeardownFn,
  Trackable,
  VideoOptions,
  WebVitalsOptions,
} from "./types.js";

// Re-export individual collectors for advanced usage
export { collectClicks } from "./collectors/clicks.js";
export { collectEngagement } from "./collectors/engagement.js";
export { collectFormSubmit } from "./collectors/form-submit.js";
export { collectScrollDepth } from "./collectors/scroll-depth.js";
export { collectVideo } from "./collectors/video.js";
export { collectWebVitals } from "./collectors/web-vitals.js";
