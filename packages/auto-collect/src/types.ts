/**
 * @junctionjs/auto-collect - Type Definitions
 *
 * Configuration types for each auto-collect module.
 * Every collector can be enabled with `true` (defaults) or fine-tuned with options.
 */

import type { Collector } from "@junctionjs/core";

// ─── Per-Collector Options ──────────────────────────────────────

export interface ClickOptions {
  /**
   * CSS selector for elements to track. Defaults to all clickable elements.
   * Set to a specific selector to limit tracking (e.g., "[data-jct-track]").
   */
  selector?: string;

  /** Track outbound link clicks (links to external domains). Default: true */
  outbound?: boolean;

  /** Track file download clicks (links ending in common file extensions). Default: true */
  downloads?: boolean;

  /** File extensions considered as downloads. Default: common document/media extensions */
  downloadExtensions?: string[];
}

export interface ScrollDepthOptions {
  /** Scroll depth thresholds as percentages. Default: [25, 50, 75, 100] */
  thresholds?: number[];
}

export interface VideoOptions {
  /** CSS selector for videos to track. Default: "video" (all HTML5 videos) */
  selector?: string;

  /** Progress milestones as percentages. Default: [25, 50, 75] */
  milestones?: number[];
}

export interface FormSubmitOptions {
  /** CSS selector for forms to track. Default: "form" */
  selector?: string;
}

export interface EngagementOptions {
  /** How often (ms) to send engagement heartbeats. Default: 15000 (15s) */
  heartbeatInterval?: number;

  /** Send a final engagement event on page hide. Default: true */
  trackOnHide?: boolean;
}

export interface WebVitalsOptions {
  /**
   * Which metrics to collect. Default: all available.
   * Options: "CLS", "LCP", "INP", "TTFB", "FCP"
   */
  metrics?: Array<"CLS" | "LCP" | "INP" | "TTFB" | "FCP">;
}

// ─── Top-Level Config ───────────────────────────────────────────

export interface AutoCollectConfig {
  /** Track element clicks. Default: false */
  clicks?: boolean | ClickOptions;

  /** Track scroll depth milestones. Default: false */
  scrollDepth?: boolean | ScrollDepthOptions;

  /** Track HTML5 video interactions. Default: false */
  video?: boolean | VideoOptions;

  /** Track form submissions. Default: false */
  formSubmit?: boolean | FormSubmitOptions;

  /** Track page engagement (time on page, visibility). Default: false */
  engagement?: boolean | EngagementOptions;

  /** Track Core Web Vitals. Default: false */
  webVitals?: boolean | WebVitalsOptions;
}

// ─── Collector Interface ────────────────────────────────────────

/** A teardown function returned by each individual collector */
export type TeardownFn = () => void;

/**
 * Minimal interface for what auto-collect needs from a collector.
 * Accepts any object with a track() method — works with both
 * createClient() and createCollector() outputs.
 */
export type Trackable = Pick<Collector, "track">;

/** The auto-collect instance returned by createAutoCollect() */
export interface AutoCollect {
  /** Tear down all active collectors and remove all event listeners */
  destroy: () => void;
}
