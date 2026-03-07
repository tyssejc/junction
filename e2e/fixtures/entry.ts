/**
 * Single entry point for the IIFE bundle used in E2E tests.
 * Re-exports core + client + debug so everything is available under `window.Junction`.
 */
export { createCollector, createConsentManager, createCmpBridge } from "../../packages/core/src/index.js";
export { createDebugPanel } from "../../packages/debug/src/index.js";
export type {
  Collector,
  CollectorConfig,
  ConsentState,
  Destination,
  DestinationEntry,
  JctEvent,
} from "../../packages/core/src/index.js";
