"use client";

import { type CapturedEvent, getEvents, onEvent } from "@/lib/demo-sink";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const entityColors: Record<string, string> = {
  page: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  product: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  checkout: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  order: "bg-green-500/20 text-green-400 border-green-500/30",
};

function getEntityColor(entity: string) {
  return entityColors[entity] ?? "bg-muted text-muted-foreground border-border";
}

export function EventViewer({ maxHeight = "400px" }: { maxHeight?: string }) {
  const [events, setEvents] = useState<CapturedEvent[]>([]);

  useEffect(() => {
    setEvents(getEvents().reverse());
    return onEvent(() => {
      setEvents(getEvents().reverse());
    });
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">Live Event Stream</h3>
        <span className="text-xs text-muted-foreground">{events.length} events</span>
      </div>
      <div className="overflow-y-auto p-2 space-y-1.5" style={{ maxHeight }}>
        {events.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No events yet. Navigate the store to see events appear here.
          </p>
        ) : (
          events.map((ev, i) => (
            <div
              key={`${ev.raw.id}-${i}`}
              className={cn("rounded-md border px-3 py-2 text-xs", getEntityColor(ev.raw.entity))}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">
                  {ev.raw.entity}:{ev.raw.action}
                </span>
                <span className="text-[10px] opacity-60">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
              {Object.keys(ev.raw.properties).length > 0 && (
                <div className="mt-1 truncate font-mono text-[10px] opacity-70">
                  {JSON.stringify(ev.raw.properties).slice(0, 120)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
