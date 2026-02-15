/**
 * @junctionjs/debug
 *
 * In-page debug overlay for Junction. Shows real-time event flow,
 * consent state, destination status, and context snapshot.
 *
 * Zero dependencies. Vanilla DOM in a shadow root. ~5KB gzipped.
 *
 * Usage:
 *   import { createDebugPanel } from "@junctionjs/debug";
 *
 *   const panel = createDebugPanel(window.jct, {
 *     shortcut: "ctrl+shift+j",
 *     startOpen: false,
 *     position: "bottom-right",
 *   });
 *
 *   // Or for Astro integration:
 *   // The panel auto-injects when debug: true in your junction config.
 */

import type { Collector } from "@junctionjs/core";
import { createDebugStore, type DebugStore } from "./store.js";
import { createPanel, type Panel, type PanelPosition } from "./panel.js";

// ─── Public Types ───────────────────────────────────────────────

export interface DebugPanelOptions {
  /**
   * Keyboard shortcut to toggle the panel (default: "ctrl+shift+j").
   * Format: modifier keys joined with "+" followed by a key.
   * Examples: "ctrl+shift+j", "meta+shift+d", "ctrl+shift+."
   */
  shortcut?: string;

  /** Maximum events to retain in the ring buffer (default: 500) */
  maxEvents?: number;

  /** Start with the panel open (default: false) */
  startOpen?: boolean;

  /** Panel position on screen (default: "bottom-right") */
  position?: PanelPosition;
}

export interface DebugPanelInstance {
  /** Open the debug panel */
  open: () => void;
  /** Close the debug panel */
  close: () => void;
  /** Toggle open/close */
  toggle: () => void;
  /** Remove the panel from the DOM and unsubscribe from all events */
  destroy: () => void;
  /** Access the underlying event store (for programmatic use) */
  store: DebugStore;
}

// ─── Keyboard Shortcut Parser ───────────────────────────────────

interface ShortcutDef {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

function parseShortcut(shortcut: string): ShortcutDef {
  const parts = shortcut.toLowerCase().split("+").map((s) => s.trim());
  const key = parts.pop() ?? "";

  return {
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    meta: parts.includes("meta") || parts.includes("cmd") || parts.includes("command"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt") || parts.includes("option"),
    key,
  };
}

function matchesShortcut(event: KeyboardEvent, def: ShortcutDef): boolean {
  return (
    event.ctrlKey === def.ctrl &&
    event.metaKey === def.meta &&
    event.shiftKey === def.shift &&
    event.altKey === def.alt &&
    event.key.toLowerCase() === def.key
  );
}

// ─── Factory ────────────────────────────────────────────────────

export function createDebugPanel(
  collector: Collector,
  options?: DebugPanelOptions,
): DebugPanelInstance {
  if (typeof window === "undefined" || typeof document === "undefined") {
    // SSR / non-browser: return a noop instance
    const noopStore: DebugStore = {
      getEntries: () => [],
      getByType: () => [],
      getCounters: () => ({
        total: 0, valid: 0, invalid: 0, sent: {}, errors: {},
        consentChanges: 0, queueFlushes: 0,
      }),
      clear: () => {},
      onUpdate: () => () => {},
      destroy: () => {},
    };
    return {
      open: () => {},
      close: () => {},
      toggle: () => {},
      destroy: () => {},
      store: noopStore,
    };
  }

  const maxEvents = options?.maxEvents ?? 500;
  const position = options?.position ?? "bottom-right";
  const startOpen = options?.startOpen ?? false;
  const shortcut = options?.shortcut ?? "ctrl+shift+j";

  // Create store
  const store = createDebugStore(collector, maxEvents);

  // Create panel
  const panel = createPanel(collector, store, { position, startOpen });

  // Keyboard shortcut
  const shortcutDef = parseShortcut(shortcut);
  function onKeyDown(e: KeyboardEvent) {
    if (matchesShortcut(e, shortcutDef)) {
      e.preventDefault();
      panel.toggle();
    }
  }
  document.addEventListener("keydown", onKeyDown);

  return {
    open: panel.open,
    close: panel.close,
    toggle: panel.toggle,
    destroy() {
      document.removeEventListener("keydown", onKeyDown);
      store.destroy();
      panel.destroy();
    },
    store,
  };
}

// Re-export types
export type { DebugStore, DebugEntry, DebugCounters } from "./store.js";
export type { PanelPosition } from "./panel.js";
