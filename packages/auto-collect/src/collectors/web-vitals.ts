/**
 * Web Vitals Collector
 *
 * Tracks Core Web Vitals using the PerformanceObserver API:
 * - CLS (Cumulative Layout Shift)
 * - LCP (Largest Contentful Paint)
 * - INP (Interaction to Next Paint)
 * - TTFB (Time to First Byte)
 * - FCP (First Contentful Paint)
 *
 * Each metric fires exactly once per page load.
 * No external dependencies — uses raw PerformanceObserver.
 */

import type { TeardownFn, Trackable, WebVitalsOptions } from "../types.js";

type MetricName = "CLS" | "LCP" | "INP" | "TTFB" | "FCP";

const ALL_METRICS: MetricName[] = ["CLS", "LCP", "INP", "TTFB", "FCP"];

function rateMetric(name: MetricName, value: number): "good" | "needs-improvement" | "poor" {
  // Thresholds per https://web.dev/articles/vitals
  const thresholds: Record<MetricName, [number, number]> = {
    CLS: [0.1, 0.25],
    LCP: [2500, 4000],
    INP: [200, 500],
    TTFB: [800, 1800],
    FCP: [1800, 3000],
  };
  const [good, poor] = thresholds[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function collectWebVitals(collector: Trackable, options: WebVitalsOptions = {}): TeardownFn {
  const metrics = options.metrics ?? ALL_METRICS;
  const observers: PerformanceObserver[] = [];
  const cleanups: (() => void)[] = [];

  function report(name: MetricName, value: number): void {
    collector.track("performance", "measured", {
      metric: name,
      value: Math.round(value * 1000) / 1000, // 3 decimal places
      rating: rateMetric(name, value),
    });
  }

  // ── CLS ───────────────────────────────────────────────
  if (metrics.includes("CLS")) {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count entries without recent input (avoid user-initiated shifts)
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value ?? 0;
          }
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
      observers.push(observer);

      // Report CLS on page hide (it accumulates over time)
      const reportCLS = () => report("CLS", clsValue);
      function onCLSHide() {
        if (document.visibilityState === "hidden") {
          reportCLS();
          document.removeEventListener("visibilitychange", onCLSHide);
        }
      }
      document.addEventListener("visibilitychange", onCLSHide);
      cleanups.push(() => document.removeEventListener("visibilitychange", onCLSHide));
    } catch {
      // PerformanceObserver or layout-shift not supported
    }
  }

  // ── LCP ───────────────────────────────────────────────
  if (metrics.includes("LCP")) {
    try {
      let lcpValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcpValue = (last as any).startTime;
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(observer);

      // LCP is finalized on first input or page hide
      const reportLCP = () => {
        if (lcpValue > 0) report("LCP", lcpValue);
      };
      function onLCPHide() {
        if (document.visibilityState === "hidden") {
          reportLCP();
          document.removeEventListener("visibilitychange", onLCPHide);
        }
      }
      document.addEventListener("visibilitychange", onLCPHide);
      cleanups.push(() => document.removeEventListener("visibilitychange", onLCPHide));
    } catch {
      // Not supported
    }
  }

  // ── INP ───────────────────────────────────────────────
  if (metrics.includes("INP")) {
    try {
      const interactions: number[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).interactionId) {
            interactions.push((entry as PerformanceEventTiming).duration);
          }
        }
      });
      observer.observe({ type: "event", buffered: true });
      observers.push(observer);

      // INP is the highest interaction duration (98th percentile)
      function onINPHide() {
        if (document.visibilityState === "hidden" && interactions.length > 0) {
          interactions.sort((a, b) => b - a);
          const idx = Math.min(Math.floor(interactions.length * 0.02), interactions.length - 1);
          report("INP", interactions[idx]);
          document.removeEventListener("visibilitychange", onINPHide);
        }
      }
      document.addEventListener("visibilitychange", onINPHide);
      cleanups.push(() => document.removeEventListener("visibilitychange", onINPHide));
    } catch {
      // Not supported
    }
  }

  // ── TTFB ──────────────────────────────────────────────
  if (metrics.includes("TTFB")) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0] as PerformanceNavigationTiming | undefined;
        if (entry) {
          report("TTFB", entry.responseStart - entry.startTime);
          observer.disconnect();
        }
      });
      observer.observe({ type: "navigation", buffered: true });
      observers.push(observer);
    } catch {
      // Not supported
    }
  }

  // ── FCP ───────────────────────────────────────────────
  if (metrics.includes("FCP")) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            report("FCP", entry.startTime);
            observer.disconnect();
            break;
          }
        }
      });
      observer.observe({ type: "paint", buffered: true });
      observers.push(observer);
    } catch {
      // Not supported
    }
  }

  return () => {
    for (const observer of observers) {
      observer.disconnect();
    }
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
