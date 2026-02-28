"use client";

import { CartProvider } from "@/lib/cart";
import { junctionConfig } from "@/lib/junction-config";
import { JunctionProvider, PageTracker } from "@junctionjs/next";
import { Suspense } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JunctionProvider config={junctionConfig} debug debugOptions={{ startOpen: false, position: "bottom-right" }}>
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      <CartProvider>{children}</CartProvider>
    </JunctionProvider>
  );
}
