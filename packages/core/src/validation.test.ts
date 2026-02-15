import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createValidator, schemas } from "./validation.js";
import type { JctEvent, EventContract } from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────

function makeEvent(overrides?: Partial<JctEvent>): JctEvent {
  return {
    entity: "product",
    action: "viewed",
    properties: {
      product_id: "SKU-123",
      name: "Test Product",
      price: 29.99,
      currency: "USD",
    },
    context: {},
    user: { anonymousId: "anon-123" },
    timestamp: new Date().toISOString(),
    id: "evt-001",
    version: "1.0.0",
    source: { type: "client", name: "test", version: "0.0.0" },
    ...overrides,
  };
}

function makeContract(overrides?: Partial<EventContract>): EventContract {
  return {
    entity: "product",
    action: "viewed",
    version: "1.0.0",
    mode: "strict",
    schema: z.object({
      product_id: z.string().min(1),
      name: z.string().min(1),
      price: z.number().nonnegative(),
      currency: z.string().length(3),
    }),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("Validator", () => {
  describe("register and hasContract", () => {
    it("registers a contract", () => {
      const validator = createValidator();
      validator.register(makeContract());

      expect(validator.hasContract("product", "viewed")).toBe(true);
      expect(validator.hasContract("product", "added")).toBe(false);
    });

    it("returns all registered contracts", () => {
      const validator = createValidator();
      validator.register(makeContract());
      validator.register(makeContract({ entity: "order", action: "completed" }));

      expect(validator.getContracts()).toHaveLength(2);
    });
  });

  describe("unregister", () => {
    it("removes a contract", () => {
      const validator = createValidator();
      validator.register(makeContract());

      validator.unregister("product", "viewed");
      expect(validator.hasContract("product", "viewed")).toBe(false);
    });
  });

  describe("validate", () => {
    it("passes events with no matching contract", () => {
      const validator = createValidator();
      const event = makeEvent({ entity: "page", action: "viewed" });

      const result = validator.validate(event);
      expect(result.valid).toBe(true);
      expect(result.event).toBe(event); // same reference — no transformation
    });

    it("passes valid events through the contract", () => {
      const validator = createValidator();
      validator.register(makeContract());

      const event = makeEvent();
      const result = validator.validate(event);

      expect(result.valid).toBe(true);
    });

    it("rejects invalid events in strict mode", () => {
      const validator = createValidator();
      validator.register(makeContract({ mode: "strict" }));

      const event = makeEvent({
        properties: {
          product_id: "", // empty string, min(1) fails
          name: "Test",
          price: -5, // nonnegative fails
          currency: "US", // length(3) fails
        },
      });

      const result = validator.validate(event);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("passes invalid events in lenient mode with warnings", () => {
      const validator = createValidator();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      validator.register(makeContract({ mode: "lenient" }));

      const event = makeEvent({
        properties: {
          product_id: "",
          name: "Test",
          price: -5,
          currency: "US",
        },
      });

      const result = validator.validate(event);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeDefined(); // errors attached but event passes
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("supports wildcard action contracts", () => {
      const validator = createValidator();
      validator.register(makeContract({
        action: "*",
        schema: z.object({
          product_id: z.string().min(1),
        }),
      }));

      // Any action on "product" should match
      const event = makeEvent({
        action: "added",
        properties: { product_id: "SKU-123" },
      });

      const result = validator.validate(event);
      expect(result.valid).toBe(true);
    });

    it("prefers exact match over wildcard", () => {
      const validator = createValidator();

      // Wildcard: only requires product_id
      validator.register(makeContract({
        action: "*",
        schema: z.object({ product_id: z.string() }),
      }));

      // Exact: requires more fields
      validator.register(makeContract({
        action: "viewed",
        schema: z.object({
          product_id: z.string(),
          name: z.string(),
          price: z.number(),
          currency: z.string().length(3),
        }),
      }));

      // Event missing name/price/currency should fail against exact match
      const event = makeEvent({
        properties: { product_id: "SKU-123" },
      });

      const result = validator.validate(event);
      expect(result.valid).toBe(false);
    });

    it("replaces event properties with coerced data on success", () => {
      const validator = createValidator();
      validator.register(makeContract({
        schema: z.object({
          product_id: z.string(),
          name: z.string(),
          price: z.coerce.number(), // coerces strings to numbers
          currency: z.string().length(3),
        }),
      }));

      const event = makeEvent({
        properties: {
          product_id: "SKU-123",
          name: "Test",
          price: "29.99" as unknown as number, // string that gets coerced
          currency: "USD",
        },
      });

      const result = validator.validate(event);
      expect(result.valid).toBe(true);
      expect(result.event.properties.price).toBe(29.99);
      expect(typeof result.event.properties.price).toBe("number");
    });
  });
});

describe("Common Schemas", () => {
  it("provides product schemas", () => {
    expect(schemas.product.product_id).toBeDefined();
    expect(schemas.product.name).toBeDefined();
    expect(schemas.product.price).toBeDefined();
    expect(schemas.product.currency).toBeDefined();
  });

  it("validates a proper product_id", () => {
    const result = schemas.product.product_id.safeParse("SKU-123");
    expect(result.success).toBe(true);
  });

  it("rejects an empty product_id", () => {
    const result = schemas.product.product_id.safeParse("");
    expect(result.success).toBe(false);
  });

  it("validates a proper price", () => {
    expect(schemas.product.price.safeParse(29.99).success).toBe(true);
    expect(schemas.product.price.safeParse(0).success).toBe(true);
  });

  it("rejects a negative price", () => {
    expect(schemas.product.price.safeParse(-1).success).toBe(false);
  });

  it("validates ISO 4217 currency codes", () => {
    expect(schemas.product.currency.safeParse("USD").success).toBe(true);
    expect(schemas.product.currency.safeParse("EU").success).toBe(false);
    expect(schemas.product.currency.safeParse("USDX").success).toBe(false);
  });

  it("provides order schemas", () => {
    expect(schemas.order.order_id).toBeDefined();
    expect(schemas.order.total).toBeDefined();
  });

  it("provides page schemas", () => {
    expect(schemas.page.path).toBeDefined();
  });

  it("provides userTraits schemas", () => {
    expect(schemas.userTraits.email).toBeDefined();
  });
});
