"use client";

import { ConsentBanner } from "@/components/consent/consent-banner";
import { CartProvider } from "@/lib/cart";
import { junctionConfig } from "@/lib/junction-config";
import { JunctionProvider, PageTracker, useJunction } from "@junctionjs/next";
import { Suspense, useEffect, useRef } from "react";

/**
 * PageTracker intentionally skips the initial mount (to avoid SSR double-counting).
 * For the demo we want the very first pageview to appear so users can see it queued.
 */
function InitialPageView() {
  const client = useJunction();
  const fired = useRef(false);

  useEffect(() => {
    if (!client || fired.current) return;
    fired.current = true;
    // Defer so the debug panel (created in a parent effect) subscribes first
    const id = requestAnimationFrame(() => {
      client.track("page", "viewed");
    });
    return () => cancelAnimationFrame(id);
  }, [client]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JunctionProvider config={junctionConfig} debug debugOptions={{ startOpen: false, position: "bottom-right" }}>
      <InitialPageView />
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      <CartProvider>{children}</CartProvider>
      <ConsentBanner />
    </JunctionProvider>
  );
}
