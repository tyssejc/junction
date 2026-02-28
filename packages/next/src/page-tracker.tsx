"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useJunction } from "./use-junction";

/**
 * Tracks page views on client-side navigation in Next.js App Router.
 *
 * Place inside <JunctionProvider> (and inside a <Suspense> boundary,
 * since useSearchParams requires it in Next.js).
 *
 * Skips the initial mount to avoid double-counting with any SSR-side
 * tracking; only fires on subsequent pathname/searchParams changes.
 */
export function PageTracker() {
  const client = useJunction();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mounted = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname and searchParams are intentional navigation triggers, not values used inside the effect
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // skip initial mount
    }
    client?.track("page", "viewed");
  }, [pathname, searchParams, client]);

  return null;
}
