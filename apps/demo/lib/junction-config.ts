import { readConsentCookie } from "@/components/consent/use-consent-cookie";
import type { CollectorConfig } from "@junctionjs/core";
import { ga4 } from "@junctionjs/destination-ga4";
import { contracts } from "./contracts";
import { demoSink, simulatedAmplitude, simulatedMeta } from "./demo-sink";

/**
 * Junction collector configuration for the Orbit Supply demo.
 *
 * The demo-sink (exempt) always receives events for visualization.
 * GA4 is a real destination gated on NEXT_PUBLIC_GA4_MEASUREMENT_ID env var.
 * Simulated Amplitude/Meta destinations are consent-gated so the
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
    // Real GA4 — gated on env var so the demo works without it.
    ...(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
      ? [
          {
            destination: ga4,
            config: {
              measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
              sendPageView: false,
              consentMode: true,
            },
            consent: ["analytics"],
            enabled: true,
          },
        ]
      : []),
    { destination: simulatedAmplitude, config: {}, enabled: true },
    { destination: simulatedMeta, config: {}, enabled: true },
  ],

  contracts,
  debug: true,
};
