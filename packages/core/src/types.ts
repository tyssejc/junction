/**
 * @junctionjs/core - Type System
 *
 * The foundational type system for Junction. Events are the primitive —
 * not tags, not rules. Everything flows from a well-typed event.
 */

// ─── Event System ────────────────────────────────────────────────

/**
 * The core event type. Every interaction in Junction is an event.
 * Events are entity_action pairs with typed properties.
 *
 * Design decision: we use entity + action (like walkerOS) rather than
 * a flat event name string (like Segment/RudderStack). This gives us
 * natural grouping and makes schema validation per-entity straightforward.
 *
 * Examples:
 *   { entity: "product", action: "added", ... }
 *   { entity: "page", action: "viewed", ... }
 *   { entity: "order", action: "completed", ... }
 */
export interface JctEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  /** The entity being acted upon (e.g., "product", "page", "order") */
  entity: string;

  /** The action taken on the entity (e.g., "viewed", "added", "completed") */
  action: string;

  /** Typed properties specific to this event */
  properties: T;

  /** Contextual data that persists across events (e.g., page info, device info) */
  context: EventContext;

  /** User identity information */
  user: UserIdentity;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Unique event ID (UUID v4) */
  id: string;

  /** Event schema version (semver) */
  version: string;

  /** The source that generated this event */
  source: EventSource;
}

export interface EventContext {
  /** Current page information (client-side) */
  page?: {
    url: string;
    path: string;
    title: string;
    referrer: string;
    search: string;
    hash: string;
  };

  /** Device and browser information */
  device?: {
    type: "desktop" | "mobile" | "tablet" | "unknown";
    userAgent: string;
    language: string;
    viewport?: { width: number; height: number };
    screenResolution?: { width: number; height: number };
  };

  /** Campaign / UTM parameters */
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  /** Session information */
  session?: {
    id: string;
    isNew: boolean;
    count: number;
  };

  /** Arbitrary context extensions */
  [key: string]: unknown;
}

export interface UserIdentity {
  /** Anonymous device/browser ID (first-party, set by Junction) */
  anonymousId: string;

  /** Known user ID (set after authentication) */
  userId?: string;

  /** User traits that persist (set via identify()) */
  traits?: Record<string, unknown>;
}

export type EventSource = {
  /** Source type */
  type: "client" | "server" | "gateway";

  /** Source name (e.g., "browser", "astro-middleware", "worker") */
  name: string;

  /** Source version */
  version: string;
};

// ─── Consent System ──────────────────────────────────────────────

/**
 * Consent categories. Each destination declares which categories it requires.
 * Events are only dispatched to a destination when at least one of its
 * required categories is granted.
 *
 * Design decision: we use named categories (not destination-specific flags)
 * because CMPs think in categories. This maps directly to OneTrust, Cookiebot,
 * Usercentrics, etc.
 */
export type ConsentCategory =
  | "necessary"
  | "analytics"
  | "marketing"
  | "personalization"
  | "social"
  | "exempt"
  | string; // extensible for custom categories

export type ConsentState = Partial<Record<ConsentCategory, boolean>>;

export type ConsentStatus = "pending" | "granted" | "denied" | "expired";

export interface ConsentConfig {
  /** Default state before user interaction */
  defaultState: ConsentState;

  /** How long (ms) to queue events while consent is pending. 0 = don't queue. */
  queueTimeout: number;

  /** Whether to respect Do Not Track header */
  respectDNT: boolean;

  /** Whether to respect Global Privacy Control */
  respectGPC: boolean;
}

// ─── Destination System ──────────────────────────────────────────

/**
 * A Destination is a plugin that receives events and sends them somewhere.
 *
 * Design decision: destinations are plain objects with async functions,
 * not classes. This makes them easy to test, tree-shake, and compose.
 * The transform function replaces walkerOS's "mapping" — it's just
 * TypeScript, no DSL.
 */
export interface Destination<TConfig = Record<string, unknown>> {
  /** Unique destination identifier (e.g., "amplitude", "ga4", "meta-pixel") */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Destination version (semver) */
  version: string;

  /** Which consent categories this destination requires (OR logic: any match = allowed) */
  consent: ConsentCategory[];

  /** Whether this destination runs client-side, server-side, or both */
  runtime: "client" | "server" | "both";

  /**
   * Initialize the destination. Called once when the collector starts.
   * Use this to load SDKs, set up connections, etc.
   */
  init: (config: TConfig) => Promise<void> | void;

  /**
   * Transform a Junction event into the destination's format.
   * Return null/undefined to skip this event for this destination.
   *
   * This replaces walkerOS's "mapping" concept. It's just a function —
   * you can use whatever logic you want.
   */
  transform: (event: JctEvent) => unknown | null | undefined;

  /**
   * Send transformed event(s) to the destination.
   * Receives the output of transform().
   */
  send: (payload: unknown, config: TConfig) => Promise<void>;

  /**
   * Called when consent state changes. Use this to update the destination's
   * own consent state (e.g., Google's consent mode).
   */
  onConsent?: (state: ConsentState) => void;

  /**
   * Called when the collector is shutting down (e.g., page unload).
   * Use this to flush buffers, close connections, etc.
   */
  teardown?: () => Promise<void> | void;
}

// ─── Schema Validation ───────────────────────────────────────────

/**
 * Event contracts define the expected shape of events.
 * These are enforced at both build time (TypeScript) and runtime (Zod).
 *
 * Design decision: contracts are per entity+action pair.
 * This is more granular than walkerOS (which validates event structure
 * but not business logic) and more practical than Snowplow's Iglu
 * (which requires a separate schema registry server).
 */
export interface EventContract {
  /** Entity this contract applies to */
  entity: string;

  /** Action this contract applies to (or "*" for all actions on this entity) */
  action: string;

  /** Contract version (semver) — allows evolution without breaking */
  version: string;

  /** Human-readable description */
  description?: string;

  /**
   * Zod schema for the event properties.
   * Stored as a reference — the actual Zod schema is defined in code.
   * This type is the schema's output type.
   */
  schema: unknown; // ZodType at runtime

  /** Whether validation failure should throw (strict) or warn (lenient) */
  mode: "strict" | "lenient";
}

// ─── Rules Engine ────────────────────────────────────────────────

/**
 * Rules determine WHEN events should be emitted from sources.
 * This is the "trigger" concept from GTM/Launch, but expressed as
 * composable predicates rather than UI-configured conditions.
 *
 * Design decision: rules are source-level concerns, not destination-level.
 * A rule says "emit a page_viewed event when the URL matches /products/*",
 * not "send to GA4 when the URL matches /products/*". Destinations
 * decide what to do with events they receive.
 */
export interface Rule {
  /** Unique rule identifier */
  name: string;

  /** Human-readable description */
  description?: string;

  /** The event to emit when this rule matches */
  event: {
    entity: string;
    action: string;
    properties?: Record<string, unknown>;
  };

  /** Conditions that must ALL be true for this rule to fire (AND logic) */
  conditions: RuleCondition[];

  /** Whether this rule is active */
  enabled: boolean;

  /** Priority (lower = fires first). Default: 100 */
  priority?: number;
}

export type RuleCondition = URLCondition | CookieCondition | HeaderCondition | ElementCondition | CustomCondition;

export interface URLCondition {
  type: "url";
  field: "pathname" | "hostname" | "search" | "hash" | "href";
  operator: "equals" | "contains" | "startsWith" | "endsWith" | "matches";
  value: string;
}

export interface CookieCondition {
  type: "cookie";
  name: string;
  operator: "exists" | "equals" | "contains";
  value?: string;
}

export interface HeaderCondition {
  type: "header";
  name: string;
  operator: "exists" | "equals" | "contains";
  value?: string;
}

export interface ElementCondition {
  type: "element";
  selector: string;
  operator: "exists" | "visible" | "hasAttribute" | "textContains";
  value?: string;
}

export interface CustomCondition {
  type: "custom";
  /** Function that evaluates the condition */
  evaluate: (context: EventContext) => boolean;
}

// ─── Collector Configuration ─────────────────────────────────────

/**
 * The top-level configuration for a Junction collector instance.
 * This is what gets stored in YAML/JSON per environment and loaded at runtime.
 */
export interface CollectorConfig {
  /** Project name */
  name: string;

  /** Environment (dev, staging, prod) — typically set by CI/CD */
  environment: string;

  /** Global context that's merged into every event */
  globals?: Record<string, unknown>;

  /** Consent configuration */
  consent: ConsentConfig;

  /** Registered destinations and their configs */
  destinations: DestinationEntry[];

  /** Auto-tracking rules (optional — events can also be emitted manually) */
  rules?: Rule[];

  /** Schema contracts for validation */
  contracts?: EventContract[];

  /** Debug mode — logs all events to console */
  debug?: boolean;

  /**
   * Event buffer config.
   * Events are buffered and flushed in batches for performance.
   */
  buffer?: {
    /** Max events before flush (default: 10) */
    maxSize: number;
    /** Max time (ms) before flush (default: 2000) */
    maxWait: number;
  };
}

export interface DestinationEntry<TConfig = Record<string, unknown>> {
  /** Destination plugin reference */
  destination: Destination<any>;

  /** Destination-specific configuration */
  config: TConfig;

  /** Override consent requirements (optional — defaults to destination's own) */
  consent?: ConsentCategory[];

  /** Whether this destination is enabled (default: true) */
  enabled?: boolean;
}

// ─── Collector Interface ─────────────────────────────────────────

/**
 * The Collector is the core runtime. It accepts events, validates them,
 * checks consent, and dispatches to destinations.
 *
 * Design decision: ONE global, not two. The collector IS the public API.
 * No separate push function — just collector.track(), collector.consent(), etc.
 */
export interface Collector {
  /** Track an event */
  track: <T extends Record<string, unknown>>(entity: string, action: string, properties?: T) => void;

  /** Identify a user */
  identify: (userId: string, traits?: Record<string, unknown>) => void;

  /** Update consent state */
  consent: (state: ConsentState) => void;

  /** Get current consent state */
  getConsent: () => ConsentState;

  /** Register a destination at runtime */
  addDestination: (entry: DestinationEntry) => void;

  /** Remove a destination by name */
  removeDestination: (name: string) => void;

  /** Subscribe to collector events (for debugging, monitoring) */
  on: (event: CollectorEvent, handler: CollectorEventHandler) => () => void;

  /** Flush all buffered events */
  flush: () => Promise<void>;

  /** Shutdown: flush + teardown all destinations */
  shutdown: () => Promise<void>;
}

export type CollectorEvent =
  | "event" // any event tracked
  | "event:valid" // event passed validation
  | "event:invalid" // event failed validation
  | "consent" // consent state changed
  | "destination:send" // event sent to destination
  | "destination:error" // destination send failed
  | "destination:init" // destination initialized
  | "queue:flush" // consent queue flushed
  | "error"; // any error

export type CollectorEventHandler = (data: {
  type: CollectorEvent;
  payload: unknown;
  timestamp: string;
}) => void;
