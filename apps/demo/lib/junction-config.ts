import { readConsentCookie } from "@/components/consent/use-consent-cookie";
import type { CollectorConfig } from "@junctionjs/core";
import { contracts } from "./contracts";
import { demoSink, simulatedAmplitude, simulatedGA4, simulatedMeta } from "./demo-sink";

/**
 * Junction collector configuration for the Orbit Supply demo.
 *
 * The demo-sink (exempt) always receives events for visualization.
 * Simulated GA4/Amplitude/Meta destinations are consent-gated so the
 * consent queue actually works: events queue while pending, flush on
 * grant, and drop on deny.
 */
export const junctionConfig: CollectorConfig = {
  name: "orbit-supply-demo",
  environment: "demo",

  consent: {
    // Returning visitors: restore saved consent so events respect it immediately.
    // First visitors: empty {} means all categories pending → events queue.
    defaultState: readConsentCookie() ?? {},
    queueTimeout: 10_000,
    respectDNT: true,
    respectGPC: true,
  },

  destinations: [
    {
      destination: demoSink,
      config: {},
      // "exempt" means no consent is required — the sink always receives events
      consent: ["exempt"],
      enabled: true,
    },
    // Simulated consent-gated destinations — no-op send, but their consent
    // requirements drive the queue/flush/drop behavior visible in the demo.
    { destination: simulatedGA4, config: {}, enabled: true },
    { destination: simulatedAmplitude, config: {}, enabled: true },
    { destination: simulatedMeta, config: {}, enabled: true },
  ],

  contracts,
  debug: true,
};
