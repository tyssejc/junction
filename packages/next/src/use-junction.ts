"use client";

import type { JunctionClient } from "@junctionjs/client";
import { useContext } from "react";
import { JunctionContext } from "./provider";

/**
 * Returns the active JunctionClient from the nearest JunctionProvider.
 * Returns null while the client is initializing (first render).
 * Throws if called outside of a provider tree entirely.
 */
export function useJunction(): JunctionClient | null {
  const client = useContext(JunctionContext) as JunctionClient | null;
  // Context is undefined when there is no provider in the tree at all.
  // It is null while the provider is initializing — that's expected.
  return client;
}
