/**
 * @junctionjs/core
 *
 * Isomorphic core — runs everywhere.
 * Provides: types, collector, consent, validation, common schemas.
 */

// Types
export type {
  JctEvent,
  EventContext,
  EventSource,
  UserIdentity,
  ConsentState,
  ConsentCategory,
  ConsentConfig,
  ConsentSignal,
  ConsentStatus,
  Destination,
  DestinationEntry,
  Collector,
  CollectorConfig,
  CollectorEvent,
  CollectorEventHandler,
  EventContract,
  Rule,
  RuleCondition,
  URLCondition,
  CookieCondition,
  HeaderCondition,
  ElementCondition,
  CustomCondition,
} from "./types.js";

// Factories
export { createCollector, type CreateCollectorOptions } from "./collector.js";
export { createConsentManager, type ConsentManager } from "./consent.js";
export { createValidator, schemas, type Validator, type ValidationResult } from "./validation.js";
