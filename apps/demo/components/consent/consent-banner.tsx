"use client";

import { cn } from "@/lib/utils";
import type { ConsentState } from "@junctionjs/core";
import { ChevronDown, ChevronUp, Cookie, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useConsentCookie } from "./use-consent-cookie";

const categories = [
  {
    key: "analytics",
    label: "Mission Control Analytics",
    description: "Helps us track flight paths through the store so we can optimize your orbit.",
  },
  {
    key: "marketing",
    label: "Intergalactic Marketing",
    description: "Powers targeted transmissions across the galaxy. We promise: no spam from Andromeda.",
  },
  {
    key: "personalization",
    label: "Crew Personalization",
    description: "Remembers your preferred space suit size and favorite asteroid snacks.",
  },
] as const;

export function ConsentBanner() {
  const { hasConsented, savedConsent, acceptAll, rejectAll, saveCustom } = useConsentCookie();
  const [showPreferences, setShowPreferences] = useState(false);
  const [showBanner, setShowBanner] = useState(!hasConsented);
  // Local toggle state — not persisted until the user clicks "Save Selected"
  const [draftState, setDraftState] = useState<ConsentState>({
    analytics: false,
    marketing: false,
    personalization: false,
  });

  // When consent is reset externally, re-show the banner
  useEffect(() => {
    if (!hasConsented) {
      setShowBanner(true);
      setShowPreferences(false);
      setDraftState({ analytics: false, marketing: false, personalization: false });
    }
  }, [hasConsented]);

  // When re-opening the manage panel, seed draft from saved state
  useEffect(() => {
    if (hasConsented && showBanner && savedConsent) {
      setDraftState({ ...savedConsent });
    }
  }, [hasConsented, showBanner, savedConsent]);

  // After consent is given, show the settings button instead
  if (hasConsented && !showBanner) {
    return (
      <button
        type="button"
        onClick={() => setShowBanner(true)}
        className="fixed bottom-4 left-4 z-[9998] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all hover:scale-110 hover:bg-muted"
        aria-label="Cookie settings"
        data-testid="consent-settings-button"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  // If consent was given and banner is open (re-manage flow)
  if (hasConsented && showBanner) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-[9999] border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md sm:p-6"
        data-testid="consent-banner"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-accent" />
              <h2 className="text-sm font-semibold">Update Cookie Preferences</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <PreferencesPanel
            state={draftState}
            onChange={(key, value) => setDraftState((prev) => ({ ...prev, [key]: value }))}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                acceptAll();
                setShowBanner(false);
              }}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
              data-testid="consent-accept-all"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={() => {
                rejectAll();
                setShowBanner(false);
              }}
              className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              data-testid="consent-reject-all"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={() => {
                saveCustom(draftState);
                setShowBanner(false);
              }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              data-testid="consent-save-preferences"
            >
              Save Selected
            </button>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="ml-auto rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // First-time visitor: full banner
  if (!hasConsented) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-[9999] border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md sm:p-6"
        data-testid="consent-banner"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-start gap-3">
            <Cookie className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
            <div>
              <h2 className="text-base font-bold">Houston, we have cookies!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These cookies fuel our rockets, not your waistline. We use them to understand how you navigate the
                cosmos and improve your mission experience.
              </p>
            </div>
          </div>

          {showPreferences && (
            <div className="mb-4">
              <PreferencesPanel
                state={draftState}
                onChange={(key, value) => setDraftState((prev) => ({ ...prev, [key]: value }))}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                acceptAll();
                setShowBanner(false);
              }}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
              data-testid="consent-accept-all"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={() => {
                rejectAll();
                setShowBanner(false);
              }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
              data-testid="consent-reject-all"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={() => setShowPreferences((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
              data-testid="consent-manage-preferences"
            >
              Manage Preferences
              {showPreferences ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
            {showPreferences && (
              <button
                type="button"
                onClick={() => {
                  saveCustom(draftState);
                  setShowBanner(false);
                }}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                data-testid="consent-save-preferences"
              >
                Save Selected
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function PreferencesPanel({
  state,
  onChange,
}: {
  state: ConsentState;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      {categories.map((cat) => (
        <label
          key={cat.key}
          className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-card/50 p-3 transition-colors hover:bg-muted/50"
        >
          <div className="mr-4">
            <span className="text-sm font-medium">{cat.label}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
          </div>
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={state[cat.key] === true}
              onChange={(e) => onChange(cat.key, e.target.checked)}
              className="peer sr-only"
              data-testid={`consent-toggle-${cat.key}`}
            />
            <div
              className={cn(
                "h-6 w-11 rounded-full border transition-colors",
                state[cat.key] === true ? "border-green-500 bg-green-600" : "border-border bg-muted",
              )}
            />
            <div
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                state[cat.key] === true && "translate-x-5",
              )}
            />
          </div>
        </label>
      ))}
      <p className="px-1 pt-1 text-[10px] text-muted-foreground">
        Essential cookies for site functionality are always active. They don&apos;t need consent because even astronauts
        need life support.
      </p>
    </div>
  );
}
