/**
 * Shared DOM utilities for auto-collect modules.
 */

/** Check if an element or its ancestors have the data-jct-ignore attribute */
export function isIgnored(el: Element): boolean {
  return el.closest("[data-jct-ignore]") !== null;
}

/** Read data-jct-* attributes from an element as a record */
export function readDataAttributes(el: Element): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith("data-jct-")) {
      const key = attr.name.slice("data-jct-".length);
      result[key] = attr.value;
    }
  }
  return result;
}

/** Get a human-readable text for an element (trimmed, truncated) */
export function getElementText(el: Element, maxLength = 200): string {
  const text = (el as HTMLElement).innerText?.trim() ?? el.textContent?.trim() ?? "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

/** Get the hostname of the current page */
export function getCurrentHostname(): string {
  return window.location.hostname;
}

/** Check if a URL points to an external domain */
export function isExternalUrl(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    return url.hostname !== getCurrentHostname();
  } catch {
    return false;
  }
}

/** Common download file extensions */
export const DEFAULT_DOWNLOAD_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "csv",
  "txt",
  "rtf",
  "mp3",
  "mp4",
  "avi",
  "mov",
  "wmv",
  "flv",
  "dmg",
  "exe",
  "msi",
  "pkg",
  "deb",
  "rpm",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
];

/** Check if a URL points to a downloadable file */
export function isDownloadUrl(href: string, extensions: string[]): boolean {
  try {
    const url = new URL(href, window.location.origin);
    const path = url.pathname.toLowerCase();
    return extensions.some((ext) => path.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

/** Throttle with leading and trailing edge execution */
export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let trailingArgs: any[] | null = null;

  return ((...args: any[]) => {
    const now = Date.now();

    if (now - last >= ms) {
      // Leading edge: execute immediately
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      last = now;
      fn(...args);
    } else {
      // Schedule trailing edge: fire after the throttle window expires
      trailingArgs = args;
      if (!trailingTimer) {
        trailingTimer = setTimeout(
          () => {
            last = Date.now();
            trailingTimer = null;
            if (trailingArgs) {
              fn(...trailingArgs);
              trailingArgs = null;
            }
          },
          ms - (now - last),
        );
      }
    }
  }) as T;
}
