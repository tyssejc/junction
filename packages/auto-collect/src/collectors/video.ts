/**
 * Video Tracking Collector
 *
 * Automatically tracks HTML5 <video> element events:
 * - video:played — playback started
 * - video:paused — playback paused
 * - video:completed — playback reached the end
 * - video:milestone — playback passed a percentage threshold (25%, 50%, 75%)
 *
 * Observes the DOM for dynamically added videos using MutationObserver.
 * Respects data-jct-ignore.
 */

import type { TeardownFn, Trackable, VideoOptions } from "../types.js";
import { isIgnored, readDataAttributes } from "../utils/dom.js";

const DEFAULT_MILESTONES = [25, 50, 75];

interface TrackedVideo {
  el: HTMLVideoElement;
  firedMilestones: Set<number>;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onTimeUpdate: () => void;
}

export function collectVideo(collector: Trackable, options: VideoOptions = {}): TeardownFn {
  const selector = options.selector ?? "video";
  const milestones = (options.milestones ?? DEFAULT_MILESTONES).sort((a, b) => a - b);
  const tracked = new Map<HTMLVideoElement, TrackedVideo>();

  function getVideoProps(el: HTMLVideoElement): Record<string, unknown> {
    const jctData = readDataAttributes(el);
    return {
      src: el.currentSrc || el.src,
      title: jctData.name ?? el.title ?? el.getAttribute("aria-label") ?? "",
      duration: Number.isFinite(el.duration) ? Math.round(el.duration) : undefined,
      current_time: Math.round(el.currentTime),
    };
  }

  function attachVideo(el: HTMLVideoElement): void {
    if (tracked.has(el)) return;
    if (isIgnored(el)) return;

    const firedMilestones = new Set<number>();

    const onPlay = () => {
      collector.track("video", "played", getVideoProps(el));
    };

    const onPause = () => {
      if (el.ended) return; // ended fires separately
      const percentComplete = el.duration > 0 ? Math.round((el.currentTime / el.duration) * 100) : 0;
      collector.track("video", "paused", {
        ...getVideoProps(el),
        percent_complete: percentComplete,
      });
    };

    const onEnded = () => {
      collector.track("video", "completed", getVideoProps(el));
    };

    const onTimeUpdate = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      const percent = Math.round((el.currentTime / el.duration) * 100);
      for (const milestone of milestones) {
        if (percent >= milestone && !firedMilestones.has(milestone)) {
          firedMilestones.add(milestone);
          collector.track("video", "milestone", {
            ...getVideoProps(el),
            percent: milestone,
          });
        }
      }
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);

    tracked.set(el, { el, firedMilestones, onPlay, onPause, onEnded, onTimeUpdate });
  }

  function detachVideo(el: HTMLVideoElement): void {
    const entry = tracked.get(el);
    if (!entry) return;
    el.removeEventListener("play", entry.onPlay);
    el.removeEventListener("pause", entry.onPause);
    el.removeEventListener("ended", entry.onEnded);
    el.removeEventListener("timeupdate", entry.onTimeUpdate);
    tracked.delete(el);
  }

  // Attach to all existing videos
  for (const el of document.querySelectorAll<HTMLVideoElement>(selector)) {
    attachVideo(el);
  }

  // Watch for dynamically added/removed videos
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLVideoElement && node.matches(selector)) {
          attachVideo(node);
        } else if (node instanceof Element) {
          for (const el of node.querySelectorAll<HTMLVideoElement>(selector)) {
            attachVideo(el);
          }
        }
      }
      for (const node of mutation.removedNodes) {
        if (node instanceof HTMLVideoElement) {
          detachVideo(node);
        } else if (node instanceof Element) {
          for (const el of node.querySelectorAll<HTMLVideoElement>(selector)) {
            detachVideo(el);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    for (const [el] of tracked) {
      detachVideo(el);
    }
  };
}
