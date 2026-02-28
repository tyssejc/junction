export { JunctionProvider, type ProviderConfig } from "./provider";
export { useJunction } from "./use-junction";
export { PageTracker } from "./page-tracker";

// Re-export commonly needed types from peer deps
export type { ClientConfig, JunctionClient } from "@junctionjs/client";
export type { DebugPanelOptions } from "@junctionjs/debug";
