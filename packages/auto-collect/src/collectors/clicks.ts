/**
 * Click Tracking Collector
 *
 * Automatically tracks clicks on elements, with special handling for:
 * - Outbound links (links to external domains)
 * - File downloads (links to files with common extensions)
 * - Elements with data-jct-track attribute (explicit opt-in)
 *
 * Uses event delegation on document.body for performance.
 * Respects data-jct-ignore on elements and ancestors.
 */

import type { ClickOptions, TeardownFn, Trackable } from "../types.js";
import {
  DEFAULT_DOWNLOAD_EXTENSIONS,
  getElementText,
  isDownloadUrl,
  isExternalUrl,
  isIgnored,
  readDataAttributes,
} from "../utils/dom.js";

export function collectClicks(collector: Trackable, options: ClickOptions = {}): TeardownFn {
  const { selector, outbound = true, downloads = true, downloadExtensions = DEFAULT_DOWNLOAD_EXTENSIONS } = options;

  function handleClick(e: MouseEvent): void {
    const target = e.target as Element | null;
    if (!target) return;

    // Find the closest meaningful element (link, button, or data-jct-track element)
    const tracked = target.closest("a, button, [data-jct-track]");
    if (!tracked) {
      // If a selector is specified, check if the target matches
      if (selector) {
        const selectorMatch = target.closest(selector);
        if (selectorMatch && !isIgnored(selectorMatch)) {
          trackElement(collector, selectorMatch);
        }
      }
      return;
    }

    if (isIgnored(tracked)) return;

    // If a selector is specified, only track matching elements
    if (selector && !tracked.matches(selector) && !tracked.closest(selector)) return;

    const jctData = readDataAttributes(tracked);

    // Handle links specifically
    if (tracked instanceof HTMLAnchorElement && tracked.href) {
      const href = tracked.href;

      // Outbound links
      if (outbound && isExternalUrl(href)) {
        collector.track(jctData.entity ?? "link", jctData.action ?? "clicked", {
          href,
          text: getElementText(tracked),
          external: true,
          ...extractElementProps(tracked),
          ...propsFromDataAttributes(jctData),
        });
        return;
      }

      // Download links
      if (downloads && isDownloadUrl(href, downloadExtensions)) {
        const extension = href.split(".").pop()?.toLowerCase() ?? "";
        collector.track(jctData.entity ?? "file", jctData.action ?? "downloaded", {
          href,
          text: getElementText(tracked),
          extension,
          ...extractElementProps(tracked),
          ...propsFromDataAttributes(jctData),
        });
        return;
      }
    }

    // General element click — only if explicitly opted in or is interactive
    if (tracked.hasAttribute("data-jct-track") || tracked instanceof HTMLButtonElement) {
      trackElement(collector, tracked);
    }
  }

  document.addEventListener("click", handleClick, { capture: true });

  return () => {
    document.removeEventListener("click", handleClick, { capture: true });
  };
}

function trackElement(collector: Trackable, el: Element): void {
  const jctData = readDataAttributes(el);
  collector.track(jctData.entity ?? "element", jctData.action ?? "clicked", {
    tag: el.tagName.toLowerCase(),
    text: getElementText(el),
    ...extractElementProps(el),
    ...propsFromDataAttributes(jctData),
  });
}

function extractElementProps(el: Element): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (el.id) props.element_id = el.id;
  if (el.className && typeof el.className === "string") {
    props.classes = el.className;
  }
  if (el instanceof HTMLAnchorElement) {
    props.href = el.href;
  }
  return props;
}

/** Convert data-jct-prop-* attributes into event properties */
function propsFromDataAttributes(data: Record<string, string>): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("prop-")) {
      props[key.slice("prop-".length)] = value;
    }
  }
  if (data.name) props.name = data.name;
  return props;
}
