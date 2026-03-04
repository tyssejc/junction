"use client";

import { type CapturedEvent, clearEvents, getEvents, onEvent } from "@/lib/demo-sink";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const entityColors: Record<string, string> = {
  page: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  product: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  checkout: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  order: "bg-green-500/20 text-green-400 border-green-500/30",
  test: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

function getEntityColor(entity: string) {
  return entityColors[entity] ?? "bg-muted text-muted-foreground border-border";
}

/** Check which destinations would receive this event based on consent state */
function getDestinationStatus(event: CapturedEvent) {
  const consent = event.raw.context?.consent;
  return {
    ga4: { label: "GA4", requires: "analytics", allowed: consent?.analytics === true },
    amplitude: { label: "AMP", requires: "analytics", allowed: consent?.analytics === true },
    meta: { label: "Meta", requires: "marketing", allowed: consent?.marketing === true },
  };
}

export function EventViewer({ maxHeight = "400px" }: { maxHeight?: string }) {
  const [events, setEvents] = useState<CapturedEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setEvents(getEvents().reverse());
    return onEvent(() => {
      setEvents(getEvents().reverse());
    });
  }, []);

  const handleClear = useCallback(() => {
    clearEvents();
    setEvents([]);
    setExpandedId(null);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">Live Event Stream</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{events.length} events</span>
          {events.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Clear events"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="overflow-y-auto p-2 space-y-1.5" style={{ maxHeight }}>
        {events.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No events yet. Navigate the store to see events appear here.
          </p>
        ) : (
          events.map((ev, i) => {
            const id = `${ev.raw.id}-${i}`;
            const isExpanded = expandedId === id;
            const wasQueued = ev.raw.context?.was_queued === true;
            const destinations = getDestinationStatus(ev);

            return (
              <div key={id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-xs text-left transition-all",
                    wasQueued ? "border-amber-500/40 bg-amber-500/10" : getEntityColor(ev.raw.entity),
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                      )}
                      <span className="font-mono font-semibold">
                        {ev.raw.entity}:{ev.raw.action}
                      </span>
                      {/* Consent badges */}
                      {wasQueued && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                          queued
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Destination delivery indicators */}
                      <div className="flex gap-1">
                        {Object.values(destinations).map((d) => (
                          <span
                            key={d.label}
                            className={cn(
                              "rounded px-1 py-0.5 text-[8px] font-bold uppercase leading-none",
                              d.allowed
                                ? "bg-green-500/20 text-green-400"
                                : "bg-muted text-muted-foreground opacity-40",
                            )}
                            title={`${d.label}: requires ${d.requires} — ${d.allowed ? "delivered" : "blocked"}`}
                          >
                            {d.label}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] opacity-60">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  {!isExpanded && Object.keys(ev.raw.properties).length > 0 && (
                    <div className="mt-1 truncate font-mono text-[10px] opacity-70">
                      {JSON.stringify(ev.raw.properties).slice(0, 120)}
                    </div>
                  )}
                </button>

                {/* Expanded detail view */}
                {isExpanded && (
                  <div className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-xs">
                    {/* Consent state at time of fire */}
                    <div className="mb-3">
                      <h4 className="mb-1 font-semibold text-muted-foreground">Consent at Fire</h4>
                      <div className="flex flex-wrap gap-1">
                        {ev.raw.context?.consent ? (
                          Object.entries(ev.raw.context.consent).map(([cat, val]) => (
                            <span
                              key={cat}
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                val === true && "border-green-500/30 bg-green-500/20 text-green-400",
                                val === false && "border-red-500/30 bg-red-500/20 text-red-400",
                                val === undefined && "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
                              )}
                            >
                              {cat}: {val === true ? "granted" : val === false ? "denied" : "pending"}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No consent data</span>
                        )}
                        {wasQueued && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            was_queued: true
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vendor transforms side-by-side */}
                    <div className="grid gap-2 md:grid-cols-3">
                      <TransformBlock label="GA4" data={ev.transforms.ga4} />
                      <TransformBlock label="Amplitude" data={ev.transforms.amplitude} />
                      <TransformBlock label="Meta Pixel" data={ev.transforms.meta} />
                    </div>

                    {/* Raw event */}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                        Raw Event JSON
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-background p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                        {JSON.stringify(ev.raw, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TransformBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="rounded border border-border bg-background p-2">
      <h5 className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{label}</h5>
      <pre className="max-h-32 overflow-auto font-mono text-[10px] leading-relaxed text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
