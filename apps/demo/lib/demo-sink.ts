/**
 * demo-sink — A visualization destination for Junction demos.
 *
 * Instead of sending events to real analytics vendors, this destination
 * captures them (along with each vendor's transformed payload) so the
 * demo UI can render a live feed of what each destination would receive.
 */

import type { Destination, JctEvent } from "@junctionjs/core";
import { amplitude } from "@junctionjs/destination-amplitude";
import { ga4 } from "@junctionjs/destination-ga4";
import { meta } from "@junctionjs/destination-meta";

// ─── Types ───────────────────────────────────────────────────────

export interface CapturedEvent {
  raw: JctEvent;
  transforms: {
    ga4: ReturnType<typeof ga4.transform>;
    amplitude: ReturnType<typeof amplitude.transform>;
    meta: ReturnType<typeof meta.transform>;
  };
  timestamp: string;
}

export type DemoSinkConfig = Record<string, never>;

// ─── Ring Buffer ─────────────────────────────────────────────────

const MAX_EVENTS = 100;
const capturedEvents: CapturedEvent[] = [];
const subscribers: Array<(event: CapturedEvent) => void> = [];

function pushEvent(event: CapturedEvent): void {
  if (capturedEvents.length >= MAX_EVENTS) {
    capturedEvents.shift();
  }
  capturedEvents.push(event);
  for (const cb of subscribers) {
    cb(event);
  }
}

// ─── Public API ──────────────────────────────────────────────────

export function getEvents(): CapturedEvent[] {
  return [...capturedEvents];
}

export function onEvent(callback: (event: CapturedEvent) => void): () => void {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

export function clearEvents(): void {
  capturedEvents.length = 0;
}

// ─── Simulated Consent-Gated Destinations ───────────────────────
// These no-op destinations exist solely to make the consent queue work.
// They declare the same consent requirements as real GA4/Amplitude/Meta,
// so events queue while consent is pending and drop when denied.

function noopDestination(name: string, consent: string[]): Destination<Record<string, never>> {
  return {
    name,
    version: "0.0.0",
    consent,
    runtime: "client",
    init() {},
    transform(event: JctEvent) {
      return event;
    },
    async send() {},
  };
}

export const simulatedAmplitude = noopDestination("amplitude", ["analytics"]);
export const simulatedMeta = noopDestination("meta", ["marketing"]);

// ─── Destination ─────────────────────────────────────────────────

export const demoSink: Destination<DemoSinkConfig> = {
  name: "demo-sink",
  description: "Captures events and vendor transforms for demo visualization",
  version: "0.1.0",
  consent: ["exempt"],
  runtime: "client",

  init() {
    // Nothing to initialize
  },

  transform(event: JctEvent): JctEvent {
    // Pass the raw event through as the payload
    return event;
  },

  async send(payload: unknown) {
    const event = payload as JctEvent;

    const captured: CapturedEvent = {
      raw: event,
      transforms: {
        ga4: ga4.transform(event, {} as any),
        amplitude: amplitude.transform(event, {} as any),
        meta: meta.transform(event, {} as any),
      },
      timestamp: new Date().toISOString(),
    };

    pushEvent(captured);
  },
};
