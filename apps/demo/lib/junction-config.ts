import type { CollectorConfig } from "@junctionjs/core";
import { contracts } from "./contracts";
import { demoSink } from "./demo-sink";

/**
 * Junction collector configuration for the Orbit Supply demo.
 *
 * Uses `demoSink` as the sole destination — it intercepts events and
 * captures both the raw event and each vendor's transformed payload
 * for display in the live event feed panel.
 *
 * In a real deployment you would add ga4, amplitude, and meta entries
 * here with actual API keys / measurement IDs.
 */
export const junctionConfig: CollectorConfig = {
  name: "orbit-supply-demo",
  environment: "demo",

  consent: {
    // Start with no consent granted — the demo UI lets users toggle categories
    defaultState: {},
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
  ],

  contracts,
  debug: true,
};
