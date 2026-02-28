import { cn } from "@/lib/utils";
import { Code2, GitBranch, GitCommit, ShieldCheck, TerminalSquare } from "lucide-react";

const configCode = `import type { CollectorConfig } from "@junctionjs/core";
import { ga4 } from "@junctionjs/destination-ga4";
import { amplitude } from "@junctionjs/destination-amplitude";
import { meta } from "@junctionjs/destination-meta";
import { contracts } from "./contracts";

export const config: CollectorConfig = {
  name: "orbit-supply",
  environment: "production",

  // ① Consent: queue events while user decides, respect privacy signals
  consent: {
    defaultState: {},          // No consent assumed on load
    queueTimeout: 10_000,      // 10s queue before dropping
    respectDNT: true,          // Honor Do Not Track
    respectGPC: true,          // Honor Global Privacy Control
  },

  // ② Destinations: each declares its own consent requirements
  destinations: [
    {
      destination: ga4,
      config: { measurementId: "G-XXXXXXXXXX", consentMode: true },
      // consent: ["analytics"]  ← inherited from destination
    },
    {
      destination: amplitude,
      config: { apiKey: "amp_xxxxxxxxxxxx", mode: "client" },
    },
    {
      destination: meta,
      config: { pixelId: "123456789" },
      // consent: ["marketing"]  ← inherited from destination
    },
  ],

  // ③ Contracts: Zod schemas that validate every event at runtime
  contracts,

  // ④ Debug: in-page panel in dev, zero overhead in production
  debug: process.env.NODE_ENV !== "production",
};`;

const diffLines = [
  { type: "context", text: "  destinations: [" },
  { type: "context", text: '    { destination: ga4, config: { measurementId: "G-XXX" } },' },
  { type: "add", text: "    {" },
  { type: "add", text: "      destination: amplitude," },
  { type: "add", text: "      config: {" },
  { type: "add", text: "        apiKey: process.env.AMPLITUDE_KEY," },
  { type: "add", text: '        mode: "client",' },
  { type: "add", text: '        eventNameFormat: "Title Case",' },
  { type: "add", text: "      }," },
  { type: "add", text: "    }," },
  { type: "context", text: "  ]," },
];

const callouts = [
  {
    num: "①",
    title: "Consent",
    icon: ShieldCheck,
    color: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/5",
    description:
      "Queue events while consent is pending. Respect DNT and GPC browser signals. Configure per-destination consent categories.",
  },
  {
    num: "②",
    title: "Destinations",
    icon: TerminalSquare,
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
    description:
      "Each destination is a typed plugin that declares its own consent requirements. Add or remove one in a PR — no UI required.",
  },
  {
    num: "③",
    title: "Contracts",
    icon: Code2,
    color: "text-warning",
    border: "border-warning/30",
    bg: "bg-warning/5",
    description:
      "Zod schemas validated at runtime. Invalid events are caught immediately, not discovered weeks later in a dashboard.",
  },
  {
    num: "④",
    title: "Debug",
    icon: GitBranch,
    color: "text-destructive",
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    description: "In-page debug panel in development. Zero runtime overhead in production. Toggle with Ctrl+Shift+J.",
  },
];

export default function ConfigDemoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <GitCommit className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Git-Native Config</h1>
          <p className="mt-1 text-muted-foreground">
            Your entire tracking configuration is a TypeScript file. Review it in PRs. Test it in CI. Roll it back with{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs text-primary">git revert</code>.
          </p>
        </div>
      </div>

      {/* ── Annotated Config File ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-destructive/70" />
          <span className="h-3 w-3 rounded-full bg-warning/70" />
          <span className="h-3 w-3 rounded-full bg-accent/70" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">junction-config.ts</span>
        </div>
        <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-foreground">{configCode}</pre>
      </div>

      {/* Callout grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {callouts.map((c) => (
          <div key={c.title} className={cn("rounded-lg border p-4", c.border, c.bg)}>
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("font-mono text-sm font-bold", c.color)}>{c.num}</span>
              <c.icon className={cn("h-4 w-4", c.color)} />
              <span className={cn("text-sm font-semibold", c.color)}>{c.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{c.description}</p>
          </div>
        ))}
      </div>

      {/* ── What This Replaces ── */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-bold">What This Replaces</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* GTM side */}
          <div className="rounded-xl border border-destructive/20 bg-card p-6">
            <h3 className="mb-1 text-lg font-semibold text-destructive">GTM / Adobe Launch</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Every change requires navigating 4+ screens. No PR. No CI. No rollback button.
            </p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                "Log into the GTM web UI, navigate to the correct workspace",
                "Create a tag — pick the right template, configure fields in form inputs",
                "Create a trigger — select conditions from dropdown menus",
                "Link tag to trigger, hope the variable names match your dataLayer",
                "Test in Preview mode (opens a separate debug window)",
                'Click "Submit" — no PR, no review, no CI tests, no rollback button',
                "Pray nobody broke the dataLayer contract in a code deploy",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-px shrink-0 font-mono text-xs text-destructive/70">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Junction side */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="mb-1 text-lg font-semibold text-primary">Junction</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Everything is TypeScript in your repo. Ships with your app. Rolls back with git.
            </p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                {
                  id: "edit",
                  content: (
                    <>
                      Edit <code className="font-mono text-xs text-primary">junction-config.ts</code> in your IDE
                    </>
                  ),
                },
                { id: "typescript", content: "TypeScript catches misconfigured destinations at compile time" },
                { id: "pr", content: "Open a PR — teammates review the exact diff" },
                { id: "ci", content: "CI runs contract tests against your Zod schemas" },
                { id: "merge", content: "Merge — deploys automatically with your app" },
                {
                  id: "revert",
                  content: (
                    <>
                      Something wrong? <code className="font-mono text-xs text-primary">git revert</code> restores the
                      previous config
                    </>
                  ),
                },
              ].map(({ id, content }, i) => (
                <li key={id} className="flex gap-3">
                  <span className="mt-px shrink-0 font-mono text-xs text-primary/70">{i + 1}.</span>
                  <span>{content}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ── Adding a Destination: The Diff ── */}
      <div className="mt-12">
        <h2 className="mb-2 text-2xl font-bold">Adding Amplitude: The Diff</h2>
        <p className="mb-4 text-muted-foreground">
          This is the <em>entire</em> change required to add Amplitude to your analytics stack. 8 lines. In a PR.
          Reviewed, tested, and deployed with your code.
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* File header */}
          <div className="border-b border-border bg-muted/60 px-4 py-2.5 font-mono text-xs text-muted-foreground">
            junction-config.ts
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
            {diffLines.map((line, i) => (
              <div
                key={`${line.type}-${i}`}
                className={cn(
                  "flex",
                  line.type === "add" && "bg-green-500/10 text-green-400",
                  line.type === "context" && "text-muted-foreground",
                )}
              >
                <span
                  className={cn("mr-3 w-5 shrink-0 text-right opacity-60", line.type === "add" && "text-green-500")}
                >
                  {line.type === "add" ? "+" : " "}
                </span>
                {line.text}
              </div>
            ))}
          </pre>
        </div>

        {/* Comparison callout */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">With Junction</p>
            <p className="mt-1 text-xs text-muted-foreground">
              8 lines of TypeScript → PR → CI → merge. Done. Reviewable, testable, reversible.
            </p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">With GTM</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create tag → create trigger → configure variables → link → preview → submit. 6 steps. No PR. No CI. No
              rollback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
