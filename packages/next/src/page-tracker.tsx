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

  // Derive a single URL string so the effect fires exactly once per
  // navigation. Using pathname and searchParams as separate deps can
  // cause double-fires when Next.js updates them in separate renders.
  const search = searchParams?.toString();
  const url = search ? `${pathname}?${search}` : pathname;

  // biome-ignore lint/correctness/useExhaustiveDependencies: url is a derived navigation trigger combining pathname + searchParams
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // skip initial mount
    }
    client?.track("page", "viewed");
  }, [url, client]);

  return null;
}
