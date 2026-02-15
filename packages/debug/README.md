# @junctionjs/debug

In-page debug panel for Junction. Real-time visibility into event flow, consent state, and destination status.

Zero dependencies. Vanilla DOM in a shadow root. Toggles with a keyboard shortcut.

## Features

- **Events tab** — real-time event stream with syntax-highlighted payload expansion, text filtering, color-coded badges
- **Consent tab** — visual consent state per category with click-to-toggle for testing
- **Destinations tab** — registered destinations with traffic-light status and per-destination send/error counts
- **Context tab** — live snapshot of page info, device, UTM params, session, and user identity
- Status bar with aggregate counters (valid, invalid, sent)
- Ring buffer retains the last 500 events (configurable)
- Dark theme, shadow DOM isolated, collapses to a small fab button

## Install

```bash
npm install @junctionjs/debug
```

## Usage

```typescript
import { createDebugPanel } from "@junctionjs/debug";

// Attach to your collector (e.g., window.jct)
const panel = createDebugPanel(window.jct, {
  shortcut: "ctrl+shift+j", // keyboard toggle
  position: "bottom-right",
  startOpen: false,
  maxEvents: 500,
});

// Programmatic control
panel.open();
panel.close();
panel.toggle();
panel.destroy();

// Access the event store directly
const entries = panel.store.getEntries();
const counters = panel.store.getCounters();
```

## License

MIT
