"use client";

import { cn } from "@/lib/utils";
import { useJunction } from "@junctionjs/next";
import { ArrowRight, CheckCircle2, Code2, GitBranch, Rocket, Shield, Terminal, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const junction = useJunction();
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (!junction) return;
    return junction.on("event", () => {
      setEventCount((c) => c + 1);
    });
  }, [junction]);

  return (
    <div className="relative overflow-hidden">
      {/* Global background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 15% 40%, rgba(108,99,255,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(0,212,170,0.08) 0%, transparent 50%)",
        }}
      />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20 pt-24 text-center lg:pb-28 lg:pt-32">
        {/* Junction badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
          <Zap className="h-3 w-3" />
          Git-native · Consent-first · Schema-validated
        </div>

        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your tag manager should be a{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #6c63ff 0%, #00d4aa 100%)" }}
            >
              TypeScript file
            </span>
            ,
            <br />
            not a UI you hope nobody breaks
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Junction is a git-native event collection system. Config as code. Consent-first. Schema-validated.
            Everything lives in your repo, reviewed in PRs, tested in CI.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/store"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Rocket className="h-4 w-4" />
              Browse the Store
            </Link>
            <Link
              href="/demos/config"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Terminal className="h-4 w-4" />
              See the Config
            </Link>
          </div>
        </div>

        {/* Live event counter */}
        <div className="mx-auto mt-14 max-w-sm">
          <div className="rounded-xl border border-border bg-card/80 px-6 py-4 backdrop-blur-sm">
            <div className="mb-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Live — events fired on this page
            </div>
            <div className="text-center text-4xl font-bold tabular-nums text-primary">{eventCount}</div>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Press <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">Ctrl+Shift+J</kbd>{" "}
              to see the debug panel
            </p>
          </div>
        </div>
      </section>

      {/* ── Value Props ─────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-foreground">Why Junction?</h2>
            <p className="mt-2 text-muted-foreground">The things your current tag manager can&apos;t do</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Code2 className="h-5 w-5" />}
              iconColor="text-primary"
              glowColor="rgba(108,99,255,0.15)"
              borderHover="hover:border-primary/50"
              title="Config as Code"
              description="Your tracking config lives in your repo. Review it in PRs. Test it in CI. Roll it back with git revert. No more 4am GTM incidents."
              footer={
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <GitBranch className="h-3 w-3" /> Reviewed in PRs
                </span>
              }
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              iconColor="text-accent"
              glowColor="rgba(0,212,170,0.12)"
              borderHover="hover:border-accent/50"
              title="Consent-First"
              description="Events queue while consent is pending, then flush or drop on resolution. No lost data. No compliance violations. Works with any CMP."
              footer={
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" /> GDPR & CCPA compliant
                </span>
              }
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconColor="text-warning"
              glowColor="rgba(255,170,0,0.1)"
              borderHover="hover:border-warning/50"
              title="Schema Validated"
              description="Every event has a Zod contract. Invalid events are caught at dev time, not discovered in dashboards weeks later."
              footer={
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Zap className="h-3 w-3" /> Validated at runtime
                </span>
              }
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground">Your entire analytics config in one file</h2>
            <p className="mt-2 text-muted-foreground">No dashboards. No clicking. Just TypeScript.</p>
          </div>

          {/* Terminal window */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-warning/70" />
              <span className="h-3 w-3 rounded-full bg-accent/70" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">junction-config.ts</span>
            </div>

            <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-foreground">
              {`import type { CollectorConfig } from "@junctionjs/core";
import { ga4 } from "@junctionjs/destination-ga4";
import { amplitude } from "@junctionjs/destination-amplitude";
import { meta } from "@junctionjs/destination-meta";
import { contracts } from "./contracts";

export const config: CollectorConfig = {
  name: "orbit-supply",
  environment: "production",

  consent: {
    defaultState: {},           // start with nothing granted
    queueTimeout: 10_000,       // queue events for 10s
    respectDNT: true,           // honor Do Not Track
    respectGPC: true,           // honor Global Privacy Control
  },

  destinations: [
    {
      destination: ga4,
      config: { measurementId: "G-XXXXXXXXXX" },
      consent: ["analytics"],   // only fires when analytics=true
    },
    {
      destination: meta,
      config: { pixelId: "123456789" },
      consent: ["marketing"],   // only fires when marketing=true
    },
  ],

  contracts,   // your Zod schemas for runtime validation
  debug: process.env.NODE_ENV === "development",
};`}
            </pre>
          </div>

          {/* Caption */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              Reviewed in PRs
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              Tested in CI
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-warning" />
              Deployed with your app
            </span>
          </div>
        </div>
      </section>

      {/* ── Demo CTAs ───────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground">See it in action</h2>
            <p className="mt-2 text-muted-foreground">
              Browse the demo store to generate real events, or explore the showcase demos.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <DemoCard
              href="/demos/consent"
              icon={<Shield className="h-6 w-6 text-accent" />}
              title="Consent Demo"
              description="See how events queue while consent is pending, then flush or drop. Per-destination gating, DNT/GPC support."
              color="accent"
            />
            <DemoCard
              href="/demos/validation"
              icon={<CheckCircle2 className="h-6 w-6 text-primary" />}
              title="Validation Demo"
              description="Fire valid and invalid events and watch Zod validation happen in real time. Break it intentionally."
              color="primary"
            />
            <DemoCard
              href="/demos/config"
              icon={<Code2 className="h-6 w-6 text-warning" />}
              title="Config Demo"
              description="See how one TypeScript file replaces a GTM workspace. Adding a destination is a PR, not a 6-step wizard."
              color="warning"
            />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/store"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Or just browse the store
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  iconColor,
  glowColor,
  borderHover,
  title,
  description,
  footer,
}: {
  icon: React.ReactNode;
  iconColor: string;
  glowColor: string;
  borderHover: string;
  title: string;
  description: string;
  footer: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300",
        borderHover,
      )}
    >
      {/* Glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 50% 0%, ${glowColor}, transparent 70%)` }}
      />
      <div
        className={cn(
          "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted",
          iconColor,
        )}
      >
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 border-t border-border pt-4">{footer}</div>
    </div>
  );
}

function DemoCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "accent" | "warning";
}) {
  const borderColor = {
    primary: "border-primary/20 hover:border-primary/60",
    accent: "border-accent/20 hover:border-accent/60",
    warning: "border-warning/20 hover:border-warning/60",
  }[color];

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-xl border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        borderColor,
      )}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        Explore
        <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
