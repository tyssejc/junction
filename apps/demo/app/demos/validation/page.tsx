"use client";

import { contracts } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { useJunction } from "@junctionjs/next";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ZodError } from "zod";

type ValidationResult =
  | { type: "success"; message: string }
  | { type: "error"; message: string; issues?: ZodError["issues"] }
  | { type: "no-contract"; message: string };

const breakItScenarios = [
  {
    label: "Missing required field",
    description: "product:viewed without product_id",
    entity: "product",
    action: "viewed",
    properties: { name: "Saturn V Model", price: 89.99, currency: "USD", category: "models" },
  },
  {
    label: "Wrong type",
    description: "product:viewed with price as string",
    entity: "product",
    action: "viewed",
    properties: {
      product_id: "saturn-v",
      name: "Saturn V Model",
      price: "eighty-nine",
      currency: "USD",
      category: "models",
    },
  },
  {
    label: "Extra unknown field",
    description: "product:viewed with unrecognized field",
    entity: "product",
    action: "viewed",
    properties: {
      product_id: "saturn-v",
      name: "Saturn V Model",
      price: 89.99,
      currency: "USD",
      category: "models",
      unknownField: "this should be flagged",
    },
  },
];

const defaultProps = JSON.stringify(
  { product_id: "apollo-tee", name: "Apollo 11 Mission Tee", price: 34.99, currency: "USD", category: "apparel" },
  null,
  2,
);

export default function ValidationDemoPage() {
  const junction = useJunction();
  const [entity, setEntity] = useState("product");
  const [action, setAction] = useState("viewed");
  const [propsText, setPropsText] = useState(defaultProps);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [invalidEvents, setInvalidEvents] = useState<string[]>([]);
  const [expandedContract, setExpandedContract] = useState<string | null>("product:viewed");

  // Subscribe to junction validation events
  useEffect(() => {
    if (!junction) return;
    return junction.on("event:invalid", (data) => {
      const payload = data.payload as { entity?: string; action?: string } | null;
      const label = payload ? `${payload.entity}:${payload.action}` : "unknown";
      setInvalidEvents((prev) => [`${label} @ ${new Date().toLocaleTimeString()}`, ...prev].slice(0, 10));
    });
  }, [junction]);

  function validateProps(ent: string, act: string, props: Record<string, unknown>): ValidationResult {
    const contract = contracts.find((c) => c.entity === ent && c.action === act);
    if (!contract) {
      return {
        type: "no-contract",
        message: `No contract registered for ${ent}:${act} — event passes through unvalidated.`,
      };
    }

    const schema = contract.schema as { safeParse: (v: unknown) => { success: boolean; error?: ZodError } };
    const parsed = schema.safeParse(props);

    if (parsed.success) {
      return { type: "success", message: `✓ ${ent}:${act} passed schema validation (${contract.mode} mode)` };
    }

    return {
      type: "error",
      message: `✗ ${ent}:${act} failed validation — ${parsed.error!.issues.length} issue(s)`,
      issues: parsed.error!.issues,
    };
  }

  function handleFireEvent(ent: string, act: string, props: Record<string, unknown>) {
    const validation = validateProps(ent, act, props);
    setResult(validation);
    junction?.track(ent, act, props);
  }

  function handleFireCustom() {
    try {
      const parsed = JSON.parse(propsText);
      handleFireEvent(entity, action, parsed);
    } catch (e: unknown) {
      setResult({ type: "error", message: `JSON parse error: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  function handleBreakIt(scenario: (typeof breakItScenarios)[0]) {
    setEntity(scenario.entity);
    setAction(scenario.action);
    setPropsText(JSON.stringify(scenario.properties, null, 2));
    handleFireEvent(scenario.entity, scenario.action, scenario.properties as Record<string, unknown>);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Schema Validation</h1>
      <p className="mt-2 text-muted-foreground">
        Every Junction event can be validated against a Zod contract. Invalid events are caught immediately — not
        discovered in dashboards weeks later.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* ── Left column: builder + break it ── */}
        <div className="space-y-6">
          {/* Event builder */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Event Builder</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-entity" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Entity
                  </label>
                  <select
                    id="event-entity"
                    value={entity}
                    onChange={(e) => {
                      setEntity(e.target.value);
                      setResult(null);
                    }}
                    className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="product">product</option>
                    <option value="checkout">checkout</option>
                    <option value="order">order</option>
                    <option value="page">page</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="event-action" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Action
                  </label>
                  <select
                    id="event-action"
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value);
                      setResult(null);
                    }}
                    className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="viewed">viewed</option>
                    <option value="added">added</option>
                    <option value="clicked">clicked</option>
                    <option value="list_viewed">list_viewed</option>
                    <option value="started">started</option>
                    <option value="completed">completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="event-properties" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Properties (JSON)
                </label>
                <textarea
                  id="event-properties"
                  value={propsText}
                  onChange={(e) => {
                    setPropsText(e.target.value);
                    setResult(null);
                  }}
                  rows={8}
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                  spellCheck={false}
                />
              </div>

              <button
                type="button"
                onClick={handleFireCustom}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Fire Event
              </button>
            </div>

            {/* Validation result */}
            {result && <ValidationOutput result={result} />}
          </div>

          {/* Break it */}
          <div className="rounded-xl border border-destructive/30 bg-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-destructive">Break It</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Fire intentionally invalid events to see Zod validation in action.
            </p>
            <div className="space-y-2">
              {breakItScenarios.map((scenario) => (
                <button
                  type="button"
                  key={scenario.label}
                  onClick={() => handleBreakIt(scenario)}
                  className="flex w-full items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-left text-sm transition-colors hover:bg-destructive/10"
                >
                  <div>
                    <p className="font-semibold text-destructive">{scenario.label}</p>
                    <p className="text-xs text-muted-foreground">{scenario.description}</p>
                  </div>
                  <span className="text-xs text-destructive">Fire →</span>
                </button>
              ))}
            </div>
          </div>

          {/* junction:invalid feed */}
          {invalidEvents.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                junction emitted <code className="font-mono text-primary">event:invalid</code>
              </h3>
              <div className="space-y-1">
                {invalidEvents.map((ev) => (
                  <div key={ev} className="font-mono text-xs text-destructive">
                    {ev}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: contracts + mode comparison ── */}
        <div className="space-y-6">
          {/* Mode comparison */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Strict vs Lenient</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">Strict Mode</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Invalid events are <strong>dropped</strong>. They never reach any destination. The collector emits{" "}
                  <code className="font-mono text-primary">event:invalid</code> for monitoring.
                </p>
              </div>
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <p className="text-sm font-semibold text-warning">Lenient Mode</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Invalid events trigger a <strong>warning</strong> but still pass through to destinations. Useful
                  during migration or when you want to monitor before enforcing.
                </p>
              </div>
            </div>
          </div>

          {/* Contracts */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 text-lg font-semibold">Registered Contracts</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              These Zod schemas are registered with Junction. Events matching these entity:action pairs are validated at
              runtime.
            </p>
            <div className="space-y-2">
              {contracts.map((c) => {
                const key = `${c.entity}:${c.action}`;
                const isOpen = expandedContract === key;
                return (
                  <div key={key} className="overflow-hidden rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setExpandedContract(isOpen ? null : key)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-primary">{key}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            c.mode === "strict" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning",
                          )}
                        >
                          {c.mode}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
                        {c.description && (
                          <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                        <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                          {formatSchema(c)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationOutput({ result }: { result: ValidationResult }) {
  if (result.type === "success") {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
        <span className="text-green-400">{result.message}</span>
      </div>
    );
  }

  if (result.type === "no-contract") {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span className="text-warning">{result.message}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
      <div className="flex items-start gap-2">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <span className="text-sm text-destructive">{result.message}</span>
      </div>
      {result.issues && result.issues.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-destructive/20 pt-3">
          {result.issues.map((issue) => (
            <div
              key={`${issue.path.join(".")}-${issue.message}`}
              className="rounded bg-destructive/10 px-3 py-2 font-mono text-xs"
            >
              <span className="text-destructive/70">[{issue.path.length > 0 ? issue.path.join(".") : "root"}]</span>{" "}
              <span className="text-destructive">{issue.message}</span>
              {issue.code !== "custom" && <span className="ml-1 text-destructive/50">({issue.code})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSchema(contract: { entity: string; action: string; schema: unknown }): string {
  try {
    const schema = contract.schema as { shape?: Record<string, unknown> };
    if (schema?.shape) {
      const fields = Object.entries(schema.shape).map(([key, val]: [string, unknown]) => {
        const v = val as {
          _def?: { typeName?: string; innerType?: { _def?: { typeName?: string } }; checks?: Array<{ kind: string }> };
        };
        const typeName = v?._def?.typeName ?? "unknown";
        const checks = v?._def?.checks ?? [];
        const isOptional = typeName === "ZodOptional";
        const innerType = isOptional ? v?._def?.innerType?._def?.typeName : typeName;

        const typeMap: Record<string, string> = {
          ZodString: "z.string()",
          ZodNumber: checks.some((c) => c.kind === "int") ? "z.number().int()" : "z.number()",
          ZodArray: "z.array(...)",
          ZodBoolean: "z.boolean()",
          ZodObject: "z.object({...})",
        };

        const base = typeMap[innerType ?? ""] ?? innerType ?? "unknown";
        return `  ${key}: ${base}${isOptional ? ".optional()" : ""}`;
      });
      return `z.object({\n${fields.join(",\n")}\n})`;
    }
  } catch {
    // ignore
  }
  return `// ${contract.entity}:${contract.action} schema`;
}
