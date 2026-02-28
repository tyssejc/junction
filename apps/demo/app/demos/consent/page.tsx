"use client";

import { cn } from "@/lib/utils";
import type { ConsentState } from "@junctionjs/core";
import { useJunction } from "@junctionjs/next";
import { ChevronDown, ChevronUp, Shield, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface QueuedEventDisplay {
  id: string;
  label: string;
  status: "pending" | "flushed" | "dropped";
}

export default function ConsentDemoPage() {
  const junction = useJunction();
  const [consentState, setConsentState] = useState<ConsentState>({});
  const [queuedEvents, setQueuedEvents] = useState<QueuedEventDisplay[]>([]);
  const [showCustomize, setShowCustomize] = useState(false);

  // Sync consent state from junction
  useEffect(() => {
    if (!junction) return;
    setConsentState(junction.getConsent());
    return junction.on("consent", () => {
      setConsentState(junction.getConsent());
    });
  }, [junction]);

  // Watch for queue:flush to visually confirm events sent
  useEffect(() => {
    if (!junction) return;
    return junction.on("queue:flush", () => {
      setQueuedEvents((prev) => prev.map((e) => (e.status === "pending" ? { ...e, status: "flushed" as const } : e)));
    });
  }, [junction]);

  function grantAll() {
    junction?.consent({ analytics: true, marketing: true, personalization: true });
    setQueuedEvents((prev) => prev.map((e) => (e.status === "pending" ? { ...e, status: "flushed" as const } : e)));
    setShowCustomize(false);
  }

  function denyAll() {
    junction?.consent({ analytics: false, marketing: false, personalization: false });
    setQueuedEvents((prev) => prev.map((e) => (e.status === "pending" ? { ...e, status: "dropped" as const } : e)));
    setShowCustomize(false);
  }

  function customize(category: string, value: boolean) {
    const next = { ...consentState, [category]: value };
    junction?.consent(next);
  }

  function resetConsent() {
    junction?.consent({});
    setConsentState({});
    setQueuedEvents([]);
    setShowCustomize(false);
  }

  function fireTestEvent() {
    const id = crypto.randomUUID().slice(0, 6);
    junction?.track("test", "consent_demo", { demo_id: id, timestamp: Date.now() });
    const hasAnyConsent = Object.values(consentState).some((v) => v === true);
    setQueuedEvents((prev) => [
      ...prev,
      {
        id,
        label: `test:consent_demo (${id})`,
        status: hasAnyConsent ? "flushed" : "pending",
      },
    ]);
  }

  function consentBadge(category: string) {
    const value = consentState[category];
    if (value === true) return { label: "Granted", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (value === false) return { label: "Denied", className: "bg-red-500/20 text-red-400 border-red-500/30" };
    return { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  }

  const pendingCount = queuedEvents.filter((e) => e.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-xl bg-accent/10 p-3 text-accent">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Consent Deep Dive</h1>
          <p className="mt-1 text-muted-foreground">
            Junction&apos;s consent state machine queues events while consent is pending, then flushes or drops them
            based on user choice. No data escapes without explicit permission.
          </p>
        </div>
      </div>

      {/* ── Interactive Consent Banner ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Consent Banner</h2>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Live state
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={grantAll}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={denyAll}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={() => setShowCustomize((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Customize
            {showCustomize ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={resetConsent}
            className="ml-auto rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Reset to Pending
          </button>
        </div>

        {/* Customize panel */}
        {showCustomize && (
          <div className="mt-5 space-y-3 border-t border-border pt-5">
            {["analytics", "marketing", "personalization"].map((cat) => {
              const badge = consentBadge(cat);
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize">{cat}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => customize(cat, true)}
                      className={cn(
                        "rounded px-3 py-1 text-xs font-medium transition-colors",
                        consentState[cat] === true ? "bg-green-600 text-white" : "border border-border hover:bg-muted",
                      )}
                    >
                      Grant
                    </button>
                    <button
                      type="button"
                      onClick={() => customize(cat, false)}
                      className={cn(
                        "rounded px-3 py-1 text-xs font-medium transition-colors",
                        consentState[cat] === false ? "bg-red-600 text-white" : "border border-border hover:bg-muted",
                      )}
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Queue Visualization ── */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Queue Visualization</h2>
            <p className="text-sm text-muted-foreground">
              Events stack up while consent is pending
              {pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-400">
                  {pendingCount} queued
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={fireTestEvent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Zap className="h-3.5 w-3.5" />
            Fire Test Event
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {queuedEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Click <strong>Reset to Pending</strong> then fire some events to see the queue.
              </p>
            </div>
          ) : (
            [...queuedEvents].reverse().map((ev) => (
              <div
                key={ev.id}
                className={cn(
                  "rounded-md border px-3 py-2 font-mono text-xs transition-all",
                  ev.status === "pending" && "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
                  ev.status === "flushed" && "border-green-500/30 bg-green-500/10 text-green-400",
                  ev.status === "dropped" && "border-red-500/30 bg-red-500/10 text-red-400 opacity-50 line-through",
                )}
              >
                {ev.label}
                <span className="ml-2 text-[10px] opacity-60">
                  {ev.status === "pending" ? "● queued" : ev.status === "flushed" ? "✓ sent" : "✗ dropped"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Per-Destination Gating ── */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 text-lg font-semibold">Per-Destination Gating</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Each destination declares which consent categories it requires. Events only reach destinations with matching
          consent grants.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <DestinationGate
            name="GA4"
            category="analytics"
            consentState={consentState}
            description="Requires analytics consent"
          />
          <DestinationGate
            name="Amplitude"
            category="analytics"
            consentState={consentState}
            description="Requires analytics consent"
          />
          <DestinationGate
            name="Meta Pixel"
            category="marketing"
            consentState={consentState}
            description="Requires marketing consent"
          />
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
          {`// junction-config.ts\n{ destination: ga4, consent: ["analytics"] }  // only fires when analytics=true\n{ destination: meta, consent: ["marketing"] }  // only fires when marketing=true`}
        </div>
      </div>

      {/* ── Mode Comparison ── */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Queue Mode vs Strict GDPR Mode</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
            <h3 className="font-semibold text-accent">Normal Mode (Queue)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Events are queued while consent is pending. When the user grants consent, queued events flush through.
              When denied, they&apos;re dropped.
            </p>
            <div className="mt-3 rounded bg-muted/70 px-3 py-2 font-mono text-xs text-muted-foreground">
              {"consent: { queueTimeout: 10_000 }"}
            </div>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <h3 className="font-semibold text-destructive">Strict GDPR Mode (Drop)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pending = denied. No events are queued at all. Only explicitly granted categories receive events. Use for
              GDPR-strict deployments.
            </p>
            <div className="mt-3 rounded bg-muted/70 px-3 py-2 font-mono text-xs text-muted-foreground">
              {"consent: { strictMode: true }"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Browser Privacy Signals ── */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Browser Privacy Signals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-5">
            <h3 className="font-semibold">Do Not Track (DNT)</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              Your browser: <BrowserDNT />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              When <code className="rounded bg-muted px-1 font-mono text-primary">respectDNT: true</code>, Junction
              treats DNT=1 as marketing + analytics denied.
            </p>
          </div>
          <div className="rounded-lg border border-border p-5">
            <h3 className="font-semibold">Global Privacy Control (GPC)</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              Your browser: <BrowserGPC />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              When <code className="rounded bg-muted px-1 font-mono text-primary">respectGPC: true</code>, Junction
              respects the legally binding GPC signal under CCPA/GDPR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DestinationGate({
  name,
  category,
  consentState,
  description,
}: {
  name: string;
  category: string;
  consentState: ConsentState;
  description: string;
}) {
  const granted = consentState[category] === true;
  const denied = consentState[category] === false;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all duration-300",
        granted && "border-green-500/40 bg-green-500/5",
        denied && "border-red-500/40 bg-red-500/5",
        !granted && !denied && "border-yellow-500/30 bg-yellow-500/5",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            granted && "bg-green-500/20 text-green-400",
            denied && "bg-red-500/20 text-red-400",
            !granted && !denied && "bg-yellow-500/20 text-yellow-400",
          )}
        >
          {granted ? "Open" : denied ? "Blocked" : "Pending"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p
        className={cn(
          "mt-2 text-sm font-medium",
          granted && "text-green-400",
          denied && "text-red-400",
          !granted && !denied && "text-yellow-400",
        )}
      >
        {granted ? "→ Receiving events" : denied ? "× Blocked" : "⏳ Queuing events"}
      </p>
    </div>
  );
}

function BrowserDNT() {
  const [dnt, setDnt] = useState<string>("...");
  useEffect(() => {
    setDnt(navigator.doNotTrack === "1" ? "Enabled ✓" : "Not set");
  }, []);
  return <span className="font-mono font-semibold text-primary">{dnt}</span>;
}

function BrowserGPC() {
  const [gpc, setGpc] = useState<string>("...");
  useEffect(() => {
    setGpc((navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl ? "Enabled ✓" : "Not set");
  }, []);
  return <span className="font-mono font-semibold text-primary">{gpc}</span>;
}
