/**
 * @junctionjs/core - Schema Validation
 *
 * Event contracts enforced at runtime using Zod.
 *
 * Design decision: we use Zod rather than a custom validation DSL
 * (like walkerOS) or a separate schema registry (like Snowplow's Iglu).
 * Zod is already standard in the TypeScript ecosystem, works isomorphically,
 * and gives us both runtime validation AND TypeScript type inference.
 *
 * Contracts are defined per entity+action pair and can operate in
 * "strict" mode (throw on invalid) or "lenient" mode (warn + pass through).
 */

import { type ZodError, type ZodType, z } from "zod";
import type { EventContract, JctEvent } from "./types.js";

// ─── Contract Registry ───────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  event: JctEvent;
  errors?: ZodError;
  /** In lenient mode, we may have coerced/cleaned the data */
  coerced?: boolean;
}

export interface Validator {
  /** Register an event contract */
  register: (contract: EventContract) => void;

  /** Remove a contract */
  unregister: (entity: string, action: string) => void;

  /** Validate an event against its contract. Returns the (potentially cleaned) event. */
  validate: (event: JctEvent) => ValidationResult;

  /** Check if a contract exists for this entity+action */
  hasContract: (entity: string, action: string) => boolean;

  /** Get all registered contracts */
  getContracts: () => EventContract[];
}

// ─── Implementation ──────────────────────────────────────────────

export function createValidator(): Validator {
  // Map of "entity:action" => contract
  const contracts = new Map<string, EventContract>();

  function key(entity: string, action: string): string {
    return `${entity}:${action}`;
  }

  function findContract(entity: string, action: string): EventContract | undefined {
    // Try exact match first, then wildcard
    return contracts.get(key(entity, action)) ?? contracts.get(key(entity, "*"));
  }

  const validator: Validator = {
    register(contract: EventContract) {
      contracts.set(key(contract.entity, contract.action), contract);
    },

    unregister(entity: string, action: string) {
      contracts.delete(key(entity, action));
    },

    validate(event: JctEvent): ValidationResult {
      const contract = findContract(event.entity, event.action);

      // No contract = pass through (uncontracted events are allowed)
      if (!contract) {
        return { valid: true, event };
      }

      const schema = contract.schema as ZodType;

      try {
        // safeParse: doesn't throw, returns success/error
        const result = schema.safeParse(event.properties);

        if (result.success) {
          return {
            valid: true,
            event: { ...event, properties: result.data },
            coerced: result.data !== event.properties,
          };
        }

        // Validation failed
        if (contract.mode === "strict") {
          return {
            valid: false,
            event,
            errors: result.error,
          };
        }

        // Lenient mode: log warning, pass through original event
        console.warn(
          `[Junction] Event validation warning for ${event.entity}:${event.action}:`,
          result.error.flatten(),
        );
        return { valid: true, event, errors: result.error };
      } catch (e) {
        // Schema itself is broken — always warn
        console.error(`[Junction] Contract error for ${event.entity}:${event.action}:`, e);
        return { valid: true, event };
      }
    },

    hasContract(entity: string, action: string) {
      return findContract(entity, action) !== undefined;
    },

    getContracts() {
      return Array.from(contracts.values());
    },
  };

  return validator;
}

// ─── Common Schemas (reusable building blocks) ───────────────────

/**
 * Pre-built Zod schemas for common event properties.
 * Use these to compose your contracts.
 *
 * Example:
 *   import { schemas } from "@junctionjs/core";
 *   const productAddedSchema = z.object({
 *     ...schemas.product,
 *     quantity: z.number().int().positive(),
 *   });
 */
export const schemas = {
  /** Standard product properties */
  product: {
    product_id: z.string().min(1),
    name: z.string().min(1),
    price: z.number().nonnegative(),
    currency: z.string().length(3), // ISO 4217
    category: z.string().optional(),
    brand: z.string().optional(),
    variant: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    sku: z.string().optional(),
    image_url: z.string().url().optional(),
    url: z.string().url().optional(),
  },

  /** Standard order/transaction properties */
  order: {
    order_id: z.string().min(1),
    total: z.number().nonnegative(),
    revenue: z.number().nonnegative().optional(),
    tax: z.number().nonnegative().optional(),
    shipping: z.number().nonnegative().optional(),
    discount: z.number().nonnegative().optional(),
    currency: z.string().length(3),
    coupon: z.string().optional(),
    products: z.array(z.record(z.unknown())).optional(),
  },

  /** Standard page properties */
  page: {
    title: z.string().optional(),
    path: z.string(),
    url: z.string().url().optional(),
    referrer: z.string().optional(),
    search: z.string().optional(),
  },

  /** Standard user trait properties */
  userTraits: {
    email: z.string().email().optional(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    created_at: z.string().datetime().optional(),
  },
} as const;
