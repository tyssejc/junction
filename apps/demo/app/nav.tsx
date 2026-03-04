"use client";

import { EventViewer } from "@/components/junction/event-viewer";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { Activity, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/cart", label: "Cart" },
  { href: "/demos/consent", label: "Consent" },
  { href: "/demos/validation", label: "Validation" },
  { href: "/demos/config", label: "Config" },
];

export function Nav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [showEvents, setShowEvents] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="text-2xl">🚀</span>
            <span className="text-foreground">Orbit Supply</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
                {link.label === "Cart" && itemCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setShowEvents((v) => !v)}
              className={cn(
                "ml-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                showEvents ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground",
              )}
              title="Toggle event viewer"
              data-testid="event-viewer-toggle"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Collapsible event viewer drawer */}
      {showEvents && (
        <div className="fixed inset-x-0 bottom-0 z-[9990] flex max-h-[50vh] flex-col border-t border-border bg-card/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">Event Inspector</span>
            </div>
            <button
              type="button"
              onClick={() => setShowEvents(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <EventViewer maxHeight="calc(50vh - 60px)" />
          </div>
        </div>
      )}
    </>
  );
}
