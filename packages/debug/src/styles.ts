/**
 * @junctionjs/debug - Styles
 *
 * Complete CSS for the debug panel, injected into shadow root.
 * Dark theme, monospace for data, system font for chrome.
 * No external dependencies.
 */

export const PANEL_STYLES = /* css */ `
  :host {
    --jd-bg: #1a1a2e;
    --jd-bg-surface: #16213e;
    --jd-bg-hover: #1f2f50;
    --jd-bg-active: #0f3460;
    --jd-border: #2a2a4a;
    --jd-text: #e0e0e0;
    --jd-text-dim: #888;
    --jd-text-bright: #fff;
    --jd-accent: #e94560;
    --jd-green: #4ade80;
    --jd-yellow: #fbbf24;
    --jd-red: #f87171;
    --jd-blue: #60a5fa;
    --jd-purple: #a78bfa;
    --jd-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --jd-mono: "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
    --jd-radius: 6px;

    all: initial;
    font-family: var(--jd-font);
    font-size: 12px;
    color: var(--jd-text);
    line-height: 1.4;
  }

  /* ─── FAB (collapsed state) ─── */

  .jd-fab {
    position: fixed;
    z-index: 2147483646;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--jd-accent);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    font-family: var(--jd-mono);
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    user-select: none;
  }

  .jd-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px rgba(233,69,96,0.4);
  }

  .jd-fab .jd-fab-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--jd-green);
    color: #000;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ─── Position variants ─── */

  .jd-pos-bottom-right { bottom: 16px; right: 16px; }
  .jd-pos-bottom-left { bottom: 16px; left: 16px; }
  .jd-pos-top-right { top: 16px; right: 16px; }
  .jd-pos-top-left { top: 16px; left: 16px; }

  .jd-panel.jd-pos-bottom-right { bottom: 60px; right: 16px; }
  .jd-panel.jd-pos-bottom-left { bottom: 60px; left: 16px; }
  .jd-panel.jd-pos-top-right { top: 60px; right: 16px; }
  .jd-panel.jd-pos-top-left { top: 60px; left: 16px; }

  /* ─── Panel (expanded state) ─── */

  .jd-panel {
    position: fixed;
    z-index: 2147483646;
    width: 420px;
    height: 360px;
    background: var(--jd-bg);
    border: 1px solid var(--jd-border);
    border-radius: var(--jd-radius);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: none;
    flex-direction: column;
    overflow: hidden;
  }

  .jd-panel.jd-open {
    display: flex;
  }

  /* ─── Header ─── */

  .jd-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--jd-bg-surface);
    border-bottom: 1px solid var(--jd-border);
    cursor: default;
    user-select: none;
  }

  .jd-header-title {
    font-weight: 600;
    font-size: 11px;
    color: var(--jd-text-bright);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .jd-header-title span {
    color: var(--jd-accent);
  }

  .jd-header-actions {
    display: flex;
    gap: 6px;
  }

  .jd-header-btn {
    background: none;
    border: none;
    color: var(--jd-text-dim);
    cursor: pointer;
    padding: 2px 4px;
    font-size: 12px;
    border-radius: 3px;
  }

  .jd-header-btn:hover {
    color: var(--jd-text-bright);
    background: var(--jd-bg-hover);
  }

  /* ─── Tabs ─── */

  .jd-tabs {
    display: flex;
    gap: 0;
    background: var(--jd-bg-surface);
    border-bottom: 1px solid var(--jd-border);
  }

  .jd-tab {
    flex: 1;
    padding: 6px 8px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--jd-text-dim);
    cursor: pointer;
    font-size: 11px;
    font-family: var(--jd-font);
    transition: color 0.1s, border-color 0.1s;
    text-align: center;
  }

  .jd-tab:hover {
    color: var(--jd-text);
  }

  .jd-tab.jd-active {
    color: var(--jd-accent);
    border-bottom-color: var(--jd-accent);
  }

  .jd-tab-badge {
    display: inline-block;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    margin-left: 4px;
    border-radius: 7px;
    background: var(--jd-bg-hover);
    font-size: 9px;
    line-height: 14px;
    text-align: center;
    vertical-align: middle;
  }

  /* ─── Tab content area ─── */

  .jd-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .jd-tab-panel {
    display: none;
    position: absolute;
    inset: 0;
    overflow-y: auto;
    padding: 0;
  }

  .jd-tab-panel.jd-active {
    display: block;
  }

  .jd-tab-panel::-webkit-scrollbar { width: 6px; }
  .jd-tab-panel::-webkit-scrollbar-track { background: transparent; }
  .jd-tab-panel::-webkit-scrollbar-thumb { background: var(--jd-border); border-radius: 3px; }

  /* ─── Filter bar ─── */

  .jd-filter {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--jd-border);
    background: var(--jd-bg-surface);
  }

  .jd-filter input {
    flex: 1;
    background: var(--jd-bg);
    border: 1px solid var(--jd-border);
    border-radius: 3px;
    color: var(--jd-text);
    padding: 3px 6px;
    font-size: 11px;
    font-family: var(--jd-mono);
    outline: none;
  }

  .jd-filter input:focus {
    border-color: var(--jd-accent);
  }

  .jd-filter input::placeholder {
    color: var(--jd-text-dim);
  }

  /* ─── Event list ─── */

  .jd-event-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .jd-event-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-bottom: 1px solid var(--jd-border);
    cursor: pointer;
    transition: background 0.1s;
    font-size: 11px;
  }

  .jd-event-row:hover {
    background: var(--jd-bg-hover);
  }

  .jd-event-time {
    color: var(--jd-text-dim);
    font-family: var(--jd-mono);
    font-size: 10px;
    flex-shrink: 0;
    width: 55px;
  }

  .jd-event-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--jd-mono);
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .jd-badge-event { background: #1e3a5f; color: var(--jd-blue); }
  .jd-badge-valid { background: #1a3d2e; color: var(--jd-green); }
  .jd-badge-invalid { background: #3d1a1a; color: var(--jd-red); }
  .jd-badge-send { background: #1e3a5f; color: var(--jd-blue); }
  .jd-badge-error { background: #3d1a1a; color: var(--jd-red); }
  .jd-badge-consent { background: #2e1a3d; color: var(--jd-purple); }
  .jd-badge-init { background: #1a3d2e; color: var(--jd-green); }
  .jd-badge-queue { background: #3d3a1a; color: var(--jd-yellow); }

  .jd-event-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--jd-mono);
  }

  .jd-event-dest {
    color: var(--jd-text-dim);
    font-size: 10px;
    flex-shrink: 0;
  }

  /* ─── Event detail (expanded) ─── */

  .jd-event-detail {
    display: none;
    padding: 6px 8px 8px 8px;
    background: var(--jd-bg-surface);
    border-bottom: 1px solid var(--jd-border);
    font-family: var(--jd-mono);
    font-size: 10px;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--jd-text);
    max-height: 200px;
    overflow-y: auto;
  }

  .jd-event-detail.jd-expanded {
    display: block;
  }

  .jd-detail-key {
    color: var(--jd-purple);
  }

  .jd-detail-string {
    color: var(--jd-green);
  }

  .jd-detail-number {
    color: var(--jd-yellow);
  }

  .jd-detail-bool {
    color: var(--jd-blue);
  }

  .jd-detail-null {
    color: var(--jd-text-dim);
  }

  /* ─── Consent tab ─── */

  .jd-consent-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 8px;
  }

  .jd-consent-card {
    background: var(--jd-bg-surface);
    border: 1px solid var(--jd-border);
    border-radius: var(--jd-radius);
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .jd-consent-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
  }

  .jd-consent-status {
    font-size: 14px;
    cursor: pointer;
    user-select: none;
  }

  .jd-consent-granted { color: var(--jd-green); }
  .jd-consent-denied { color: var(--jd-red); }
  .jd-consent-pending { color: var(--jd-yellow); }

  .jd-consent-info {
    padding: 8px;
    font-size: 11px;
    color: var(--jd-text-dim);
    text-align: center;
    border-top: 1px solid var(--jd-border);
  }

  /* ─── Destinations tab ─── */

  .jd-dest-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .jd-dest-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--jd-border);
  }

  .jd-dest-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .jd-dest-ok { background: var(--jd-green); }
  .jd-dest-err { background: var(--jd-red); }
  .jd-dest-pending { background: var(--jd-yellow); }

  .jd-dest-info {
    flex: 1;
  }

  .jd-dest-name {
    font-weight: 600;
    font-size: 11px;
    color: var(--jd-text-bright);
  }

  .jd-dest-meta {
    font-size: 10px;
    color: var(--jd-text-dim);
    font-family: var(--jd-mono);
  }

  .jd-dest-count {
    font-family: var(--jd-mono);
    font-size: 11px;
    color: var(--jd-text-dim);
    text-align: right;
    flex-shrink: 0;
  }

  .jd-dest-count strong {
    color: var(--jd-text-bright);
  }

  /* ─── Context tab ─── */

  .jd-context-section {
    padding: 6px 8px;
    border-bottom: 1px solid var(--jd-border);
  }

  .jd-context-heading {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--jd-text-dim);
    margin-bottom: 4px;
  }

  .jd-context-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 11px;
  }

  .jd-context-key {
    color: var(--jd-text-dim);
  }

  .jd-context-val {
    color: var(--jd-text-bright);
    font-family: var(--jd-mono);
    text-align: right;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ─── Empty state ─── */

  .jd-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--jd-text-dim);
    font-size: 12px;
    padding: 20px;
    text-align: center;
  }

  /* ─── Status bar ─── */

  .jd-statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: var(--jd-bg-surface);
    border-top: 1px solid var(--jd-border);
    font-size: 10px;
    color: var(--jd-text-dim);
    user-select: none;
  }

  .jd-statusbar-counters {
    display: flex;
    gap: 10px;
  }

  .jd-statusbar-counter {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .jd-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  .jd-dot-green { background: var(--jd-green); }
  .jd-dot-red { background: var(--jd-red); }
  .jd-dot-yellow { background: var(--jd-yellow); }
  .jd-dot-blue { background: var(--jd-blue); }
`;
