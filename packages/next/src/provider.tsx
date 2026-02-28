"use client";

import { type ClientConfig, type JunctionClient, createClient } from "@junctionjs/client";
import { type DebugPanelOptions, createDebugPanel } from "@junctionjs/debug";
import { type ReactNode, createContext, useEffect, useRef, useState } from "react";

export const JunctionContext = createContext<JunctionClient | null>(null);

/** ClientConfig without autoPageView — Next.js manages its own routing via PageTracker */
export type ProviderConfig = Omit<ClientConfig, "autoPageView">;

interface JunctionProviderProps {
  config: ProviderConfig;
  /** Mount the debug panel (keyboard shortcut: ctrl+shift+j) */
  debug?: boolean;
  debugOptions?: DebugPanelOptions;
  children: ReactNode;
}

export function JunctionProvider({ config, debug, debugOptions, children }: JunctionProviderProps) {
  // Ref holds the stable instance; state drives context reactivity
  const clientRef = useRef<JunctionClient | null>(null);
  const [client, setClient] = useState<JunctionClient | null>(null);

  // Create client once on mount — autoPageView: false, PageTracker handles routing
  // biome-ignore lint/correctness/useExhaustiveDependencies: config is read once on mount; re-creating the client on every render would break analytics state
  useEffect(() => {
    const newClient = createClient({ ...config, autoPageView: false });
    clientRef.current = newClient;
    setClient(newClient);

    return () => {
      newClient.shutdown();
      clientRef.current = null;
      setClient(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create debug panel after client is ready; re-create if debug flag toggles
  // biome-ignore lint/correctness/useExhaustiveDependencies: debugOptions is read once when panel mounts
  useEffect(() => {
    if (!debug || !client) return;

    const panel = createDebugPanel(client, debugOptions);

    return () => {
      panel.destroy();
    };
  }, [client, debug]); // eslint-disable-line react-hooks/exhaustive-deps

  return <JunctionContext.Provider value={client}>{children}</JunctionContext.Provider>;
}
