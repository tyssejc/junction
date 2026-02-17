/**
 * @junctionjs/debug - Panel
 *
 * DOM construction for the debug overlay. All rendering uses vanilla DOM
 * inside a shadow root for complete style isolation.
 *
 * 4 tabs: Events | Consent | Destinations | Context
 */

import type { Collector, CollectorEvent, JctEvent } from "@junctionjs/core";
import type { DebugEntry, DebugStore } from "./store.js";
import { PANEL_STYLES } from "./styles.js";

// ─── Types ──────────────────────────────────────────────────────

export type PanelPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface PanelOptions {
  position: PanelPosition;
  startOpen: boolean;
}

export interface Panel {
  host: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") elem.className = v;
      else elem.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === "string") elem.appendChild(document.createTextNode(child));
    else elem.appendChild(child);
  }
  return elem;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "??:??:??";
  }
}

function badgeClass(type: CollectorEvent): string {
  const map: Record<string, string> = {
    event: "jd-badge-event",
    "event:valid": "jd-badge-valid",
    "event:invalid": "jd-badge-invalid",
    "destination:send": "jd-badge-send",
    "destination:error": "jd-badge-error",
    "destination:init": "jd-badge-init",
    consent: "jd-badge-consent",
    "queue:flush": "jd-badge-queue",
    error: "jd-badge-error",
  };
  return map[type] ?? "jd-badge-event";
}

function eventLabel(entry: DebugEntry): string {
  const p = entry.payload as Record<string, unknown> | JctEvent | undefined;
  if (!p) return entry.type;

  // JctEvent payloads (event, event:valid)
  if ("entity" in p && "action" in p) {
    return `${p.entity}:${p.action}`;
  }

  // Object payloads with nested event
  if ("event" in p) {
    const evt = p.event as JctEvent;
    if (evt?.entity && evt?.action) return `${evt.entity}:${evt.action}`;
  }

  // destination:init
  if ("destination" in p) {
    return `${p.destination}`;
  }

  // consent
  if ("state" in p) return "state updated";

  // queue:flush
  if ("count" in p) return `${p.count} events`;

  return entry.type;
}

function destLabel(entry: DebugEntry): string {
  const p = entry.payload as Record<string, unknown> | undefined;
  if (!p) return "";
  if ("destination" in p && typeof p.destination === "string") return p.destination;
  return "";
}

function syntaxHighlight(obj: unknown, indent = 0): string {
  if (obj === null || obj === undefined) {
    return `<span class="jd-detail-null">${String(obj)}</span>`;
  }
  if (typeof obj === "string") {
    const escaped = obj.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<span class="jd-detail-string">"${escaped}"</span>`;
  }
  if (typeof obj === "number") {
    return `<span class="jd-detail-number">${obj}</span>`;
  }
  if (typeof obj === "boolean") {
    return `<span class="jd-detail-bool">${obj}</span>`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const pad = "  ".repeat(indent + 1);
    const closePad = "  ".repeat(indent);
    const items = obj.map((v) => `${pad}${syntaxHighlight(v, indent + 1)}`).join(",\n");
    return `[\n${items}\n${closePad}]`;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const pad = "  ".repeat(indent + 1);
    const closePad = "  ".repeat(indent);
    const items = entries
      .map(([k, v]) => `${pad}<span class="jd-detail-key">${k}</span>: ${syntaxHighlight(v, indent + 1)}`)
      .join(",\n");
    return `{\n${items}\n${closePad}}`;
  }
  return String(obj);
}

// ─── Panel Factory ──────────────────────────────────────────────

export function createPanel(collector: Collector, store: DebugStore, options: PanelOptions): Panel {
  const posClass = `jd-pos-${options.position}`;

  // ── Shadow host ──
  const host = document.createElement("junction-debug");
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles
  const style = document.createElement("style");
  style.textContent = PANEL_STYLES;
  shadow.appendChild(style);

  // ── State ──
  let isOpen = options.startOpen;
  let activeTab = "events";
  let filterText = "";
  let expandedEventId: number | null = null;

  // ── FAB ──
  const fab = el("button", { class: `jd-fab ${posClass}` }, "J");
  const fabBadge = el("span", { class: "jd-fab-badge" }, "0");
  fab.appendChild(fabBadge);
  fab.addEventListener("click", toggle);
  shadow.appendChild(fab);

  // ── Panel container ──
  const panel = el("div", { class: `jd-panel ${posClass} ${isOpen ? "jd-open" : ""}` });
  shadow.appendChild(panel);

  // ── Header ──
  const clearBtn = el("button", { class: "jd-header-btn", title: "Clear" }, "\u2715 Clear");
  clearBtn.addEventListener("click", () => {
    store.clear();
    render();
  });

  const closeBtn = el("button", { class: "jd-header-btn", title: "Close" }, "\u2715");
  closeBtn.addEventListener("click", close);

  const header = el(
    "div",
    { class: "jd-header" },
    el("div", { class: "jd-header-title" }, el("span", {}, "J"), " unction Debug"),
    el("div", { class: "jd-header-actions" }, clearBtn, closeBtn),
  );
  panel.appendChild(header);

  // ── Tabs ──
  const tabDefs = [
    { id: "events", label: "Events" },
    { id: "consent", label: "Consent" },
    { id: "destinations", label: "Dests" },
    { id: "context", label: "Context" },
  ];

  const tabBar = el("div", { class: "jd-tabs" });
  const tabBtns: Record<string, HTMLButtonElement> = {};
  for (const td of tabDefs) {
    const btn = el("button", { class: `jd-tab ${td.id === activeTab ? "jd-active" : ""}` }, td.label);
    btn.addEventListener("click", () => {
      switchTab(td.id);
    });
    tabBtns[td.id] = btn;
    tabBar.appendChild(btn);
  }
  panel.appendChild(tabBar);

  // ── Content area ──
  const content = el("div", { class: "jd-content" });
  panel.appendChild(content);

  // Tab panels
  const tabPanels: Record<string, HTMLDivElement> = {};
  for (const td of tabDefs) {
    const tp = el("div", { class: `jd-tab-panel ${td.id === activeTab ? "jd-active" : ""}` });
    tp.dataset.tab = td.id;
    tabPanels[td.id] = tp;
    content.appendChild(tp);
  }

  // ── Status bar ──
  const statusbar = el("div", { class: "jd-statusbar" });
  panel.appendChild(statusbar);

  // ── Tab switching ──
  function switchTab(id: string) {
    activeTab = id;
    for (const [key, btn] of Object.entries(tabBtns)) {
      btn.classList.toggle("jd-active", key === id);
    }
    for (const [key, tp] of Object.entries(tabPanels)) {
      tp.classList.toggle("jd-active", key === id);
    }
    render();
  }

  // ── Open / Close ──
  function open() {
    isOpen = true;
    panel.classList.add("jd-open");
    fab.style.display = "none";
    render();
  }

  function close() {
    isOpen = false;
    panel.classList.remove("jd-open");
    fab.style.display = "flex";
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  // ── Render functions ──

  function render() {
    renderFab();
    renderStatusBar();
    if (!isOpen) return;

    switch (activeTab) {
      case "events":
        renderEvents();
        break;
      case "consent":
        renderConsent();
        break;
      case "destinations":
        renderDestinations();
        break;
      case "context":
        renderContext();
        break;
    }
  }

  function renderFab() {
    const c = store.getCounters();
    fabBadge.textContent = String(c.total);
    fabBadge.style.display = c.total > 0 ? "flex" : "none";
  }

  function renderStatusBar() {
    const c = store.getCounters();
    statusbar.innerHTML = "";
    const counters = el("div", { class: "jd-statusbar-counters" });

    const addCounter = (dotClass: string, label: string, count: number) => {
      const item = el("span", { class: "jd-statusbar-counter" });
      item.appendChild(el("span", { class: `jd-dot ${dotClass}` }));
      item.appendChild(document.createTextNode(` ${count} ${label}`));
      counters.appendChild(item);
    };

    addCounter("jd-dot-green", "valid", c.valid);
    addCounter("jd-dot-red", "invalid", c.invalid);
    addCounter(
      "jd-dot-blue",
      "sent",
      Object.values(c.sent).reduce((a, b) => a + b, 0),
    );

    statusbar.appendChild(counters);
    statusbar.appendChild(document.createTextNode(`${store.getEntries().length} entries`));
  }

  // ── Events tab ──

  function renderEvents() {
    const tp = tabPanels.events;
    tp.innerHTML = "";

    // Filter bar
    const filter = el("div", { class: "jd-filter" });
    const input = el("input", { type: "text", placeholder: "Filter events..." });
    input.value = filterText;
    input.addEventListener("input", () => {
      filterText = input.value;
      renderEventList(list);
    });
    filter.appendChild(input);
    tp.appendChild(filter);

    // Event list container
    const list = el("ul", { class: "jd-event-list" });
    tp.appendChild(list);
    renderEventList(list);
  }

  function renderEventList(list: HTMLUListElement) {
    list.innerHTML = "";

    let entries = store.getEntries();

    // Filter
    if (filterText) {
      const lower = filterText.toLowerCase();
      entries = entries.filter((e) => {
        const label = eventLabel(e).toLowerCase();
        const type = e.type.toLowerCase();
        return label.includes(lower) || type.includes(lower);
      });
    }

    if (entries.length === 0) {
      list.appendChild(
        el("div", { class: "jd-empty" }, filterText ? "No matching events" : "Waiting for events\u2026"),
      );
      return;
    }

    // Render in reverse (newest first)
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const row = el("li", { class: "jd-event-row" });

      row.appendChild(el("span", { class: "jd-event-time" }, formatTime(entry.timestamp)));
      row.appendChild(
        el("span", { class: `jd-event-badge ${badgeClass(entry.type)}` }, entry.type.replace("destination:", "dest:")),
      );
      row.appendChild(el("span", { class: "jd-event-name" }, eventLabel(entry)));

      const dl = destLabel(entry);
      if (dl) {
        row.appendChild(el("span", { class: "jd-event-dest" }, dl));
      }

      // Detail area
      const detail = el("div", { class: "jd-event-detail" });
      detail.innerHTML = syntaxHighlight(entry.payload);

      row.addEventListener("click", () => {
        if (expandedEventId === entry.id) {
          expandedEventId = null;
          detail.classList.remove("jd-expanded");
        } else {
          // Collapse previous
          const prev = list.querySelector(".jd-event-detail.jd-expanded");
          if (prev) prev.classList.remove("jd-expanded");
          expandedEventId = entry.id;
          detail.classList.add("jd-expanded");
        }
      });

      list.appendChild(row);
      list.appendChild(detail);
    }
  }

  // ── Consent tab ──

  function renderConsent() {
    const tp = tabPanels.consent;
    tp.innerHTML = "";

    const state = collector.getConsent();
    const categories = ["necessary", "analytics", "marketing", "personalization", "social"];

    const grid = el("div", { class: "jd-consent-grid" });

    for (const cat of categories) {
      const value = (state as Record<string, boolean | undefined>)[cat];
      const card = el("div", { class: "jd-consent-card" });

      card.appendChild(el("span", { class: "jd-consent-label" }, cat));

      let statusText: string;
      let statusClass: string;
      if (value === true) {
        statusText = "\u2713";
        statusClass = "jd-consent-granted";
      } else if (value === false) {
        statusText = "\u2717";
        statusClass = "jd-consent-denied";
      } else {
        statusText = "\u25CB";
        statusClass = "jd-consent-pending";
      }

      const statusEl = el(
        "span",
        { class: `jd-consent-status ${statusClass}`, title: "Click to toggle (testing)" },
        statusText,
      );

      // Click to toggle for testing
      if (cat !== "necessary") {
        statusEl.addEventListener("click", () => {
          const current = (collector.getConsent() as Record<string, boolean | undefined>)[cat];
          const next = current !== true;
          collector.consent({ [cat]: next });
          // Re-render after a tick
          requestAnimationFrame(() => renderConsent());
        });
      }

      card.appendChild(statusEl);
      grid.appendChild(card);
    }

    tp.appendChild(grid);

    // Counters
    const counters = store.getCounters();
    tp.appendChild(
      el(
        "div",
        { class: "jd-consent-info" },
        `${counters.consentChanges} consent changes \u00B7 ${counters.queueFlushes} queue flushes \u00B7 Click status to toggle (testing only)`,
      ),
    );
  }

  // ── Destinations tab ──

  function renderDestinations() {
    const tp = tabPanels.destinations;
    tp.innerHTML = "";

    const counters = store.getCounters();
    const initEntries = store.getByType("destination:init");
    const errorEntries = store.getByType("destination:error");

    const initNames = new Set(
      initEntries.map((e) => (e.payload as Record<string, unknown>)?.destination as string).filter(Boolean),
    );
    const errorNames = new Set(
      errorEntries.map((e) => (e.payload as Record<string, unknown>)?.destination as string).filter(Boolean),
    );

    // Collect all known destination names
    const allNames = new Set([
      ...Object.keys(counters.sent),
      ...Object.keys(counters.errors),
      ...initNames,
      ...errorNames,
    ]);

    if (allNames.size === 0) {
      tp.appendChild(el("div", { class: "jd-empty" }, "No destinations registered yet"));
      return;
    }

    const list = el("ul", { class: "jd-dest-list" });

    for (const name of allNames) {
      const row = el("li", { class: "jd-dest-row" });

      const hasError = errorNames.has(name) && !initNames.has(name);
      const isInit = initNames.has(name);
      const statusClass = hasError ? "jd-dest-err" : isInit ? "jd-dest-ok" : "jd-dest-pending";

      row.appendChild(el("span", { class: `jd-dest-status ${statusClass}` }));

      const info = el("div", { class: "jd-dest-info" });
      info.appendChild(el("div", { class: "jd-dest-name" }, name));

      const statusLabel = hasError ? "error" : isInit ? "ready" : "initializing";
      info.appendChild(el("div", { class: "jd-dest-meta" }, statusLabel));
      row.appendChild(info);

      const sentCount = counters.sent[name] ?? 0;
      const errCount = counters.errors[name] ?? 0;
      const countEl = el("div", { class: "jd-dest-count" });
      countEl.innerHTML = `<strong>${sentCount}</strong> sent${errCount > 0 ? ` \u00B7 <span style="color:var(--jd-red)">${errCount} err</span>` : ""}`;
      row.appendChild(countEl);

      list.appendChild(row);
    }

    tp.appendChild(list);
  }

  // ── Context tab ──

  function renderContext() {
    const tp = tabPanels.context;
    tp.innerHTML = "";

    // Try to get latest event for context
    const entries = store.getEntries();
    const latestEvent = [...entries].reverse().find((e) => e.type === "event:valid" || e.type === "event");

    const event = latestEvent?.payload as JctEvent | undefined;

    // Page
    const addSection = (title: string, rows: [string, string | undefined][]) => {
      const section = el("div", { class: "jd-context-section" });
      section.appendChild(el("div", { class: "jd-context-heading" }, title));
      for (const [key, val] of rows) {
        if (val === undefined || val === "") continue;
        const row = el("div", { class: "jd-context-row" });
        row.appendChild(el("span", { class: "jd-context-key" }, key));
        row.appendChild(el("span", { class: "jd-context-val" }, val));
        section.appendChild(row);
      }
      tp.appendChild(section);
    };

    if (event?.context?.page) {
      const p = event.context.page;
      addSection("Page", [
        ["URL", p.url],
        ["Path", p.path],
        ["Title", p.title],
        ["Referrer", p.referrer],
      ]);
    } else {
      addSection("Page", [
        ["URL", window.location.href],
        ["Path", window.location.pathname],
        ["Title", document.title],
        ["Referrer", document.referrer],
      ]);
    }

    if (event?.context?.device) {
      const d = event.context.device;
      addSection("Device", [
        ["Type", d.type],
        ["Language", d.language],
        ["Viewport", d.viewport ? `${d.viewport.width}\u00D7${d.viewport.height}` : undefined],
        ["Screen", d.screenResolution ? `${d.screenResolution.width}\u00D7${d.screenResolution.height}` : undefined],
      ]);
    }

    if (event?.context?.campaign) {
      const c = event.context.campaign;
      addSection("Campaign", [
        ["Source", c.source],
        ["Medium", c.medium],
        ["Campaign", c.campaign],
        ["Term", c.term],
        ["Content", c.content],
      ]);
    }

    if (event?.user) {
      addSection("User", [
        ["Anonymous ID", event.user.anonymousId],
        ["User ID", event.user.userId],
        ...(event.user.traits
          ? Object.entries(event.user.traits).map(([k, v]) => [k, String(v)] as [string, string])
          : []),
      ]);
    }

    if (event?.context?.session) {
      const s = event.context.session;
      addSection("Session", [
        ["ID", s.id],
        ["New", String(s.isNew)],
        ["Count", String(s.count)],
      ]);
    }

    // Consent state
    const consent = collector.getConsent();
    const consentRows: [string, string][] = Object.entries(consent).map(([k, v]) => [
      k,
      v === true ? "\u2713 granted" : v === false ? "\u2717 denied" : "\u25CB pending",
    ]);
    if (consentRows.length > 0) {
      addSection("Consent", consentRows);
    }

    if (!event) {
      tp.appendChild(el("div", { class: "jd-consent-info" }, "Context will populate after the first event fires"));
    }
  }

  // ── Subscribe to store updates ──
  const unsubStore = store.onUpdate(() => {
    render();
  });

  // ── Initial render ──
  document.body.appendChild(host);
  if (isOpen) {
    fab.style.display = "none";
  }
  render();

  // ── Cleanup ──
  function destroy() {
    unsubStore();
    host.remove();
  }

  return { host, open, close, toggle, destroy };
}
