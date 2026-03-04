"use client";

import type { ConsentState } from "@junctionjs/core";
import { useJunction } from "@junctionjs/next";
import { useCallback, useState } from "react";

export const CONSENT_COOKIE_NAME = "jct-consent";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export function readConsentCookie(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function writeCookie(state: ConsentState): void {
  const value = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(): void {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
}

export type ConsentChoice = "pending" | "accepted" | "rejected" | "custom";

function deriveChoice(state: ConsentState | null): ConsentChoice {
  if (!state) return "pending";
  const values = Object.values(state);
  if (values.length === 0) return "pending";
  if (values.every((v) => v === true)) return "accepted";
  if (values.every((v) => v === false)) return "rejected";
  return "custom";
}

export function useConsentCookie() {
  const junction = useJunction();
  // Read cookie synchronously so the very first render knows consent state
  const [savedConsent, setSavedConsent] = useState<ConsentState | null>(() => readConsentCookie());
  const [choice, setChoice] = useState<ConsentChoice>(() => deriveChoice(readConsentCookie()));

  const acceptAll = useCallback(() => {
    const state: ConsentState = { analytics: true, marketing: true, personalization: true };
    writeCookie(state);
    setSavedConsent(state);
    setChoice("accepted");
    junction?.consent(state);
  }, [junction]);

  const rejectAll = useCallback(() => {
    const state: ConsentState = { analytics: false, marketing: false, personalization: false };
    writeCookie(state);
    setSavedConsent(state);
    setChoice("rejected");
    junction?.consent(state);
  }, [junction]);

  const saveCustom = useCallback(
    (state: ConsentState) => {
      writeCookie(state);
      setSavedConsent(state);
      setChoice("custom");
      junction?.consent(state);
    },
    [junction],
  );

  const reset = useCallback(() => {
    clearCookie();
    setSavedConsent(null);
    setChoice("pending");
    junction?.consent({});
  }, [junction]);

  return {
    /** The persisted consent state, or null if no choice made yet */
    savedConsent,
    /** Whether the user has made a choice */
    hasConsented: savedConsent !== null,
    /** The type of choice made */
    choice,
    acceptAll,
    rejectAll,
    saveCustom,
    reset,
  };
}
