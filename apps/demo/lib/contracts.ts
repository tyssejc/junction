import type { EventContract } from "@junctionjs/core";
import { z } from "zod";

export const contracts: EventContract[] = [
  {
    entity: "product",
    action: "viewed",
    version: "1.0.0",
    description: "Fired when a user views a product detail page.",
    schema: z.object({
      product_id: z.string(),
      name: z.string(),
      price: z.number(),
      currency: z.string(),
      category: z.string(),
    }),
    mode: "strict",
  },
  {
    entity: "product",
    action: "added",
    version: "1.0.0",
    description: "Fired when a user adds a product to their cart.",
    schema: z.object({
      product_id: z.string(),
      name: z.string(),
      price: z.number(),
      currency: z.string(),
      quantity: z.number().int().positive(),
      variant: z.string().optional(),
    }),
    mode: "strict",
  },
  {
    entity: "product",
    action: "list_viewed",
    version: "1.0.0",
    description: "Fired when a user views a list of products (category page, search results, etc.).",
    schema: z.object({
      category: z.string().optional(),
      products: z.array(
        z.object({
          product_id: z.string(),
          name: z.string(),
          price: z.number(),
        }),
      ),
    }),
    mode: "strict",
  },
  {
    entity: "product",
    action: "clicked",
    version: "1.0.0",
    description: "Fired when a user clicks a product in a list.",
    schema: z.object({
      product_id: z.string(),
      name: z.string(),
      price: z.number(),
      position: z.number().int().nonnegative().optional(),
    }),
    mode: "strict",
  },
  {
    entity: "checkout",
    action: "started",
    version: "1.0.0",
    description: "Fired when a user initiates the checkout flow.",
    schema: z.object({
      cart_total: z.number().nonnegative(),
      currency: z.string(),
      item_count: z.number().int().positive(),
    }),
    mode: "strict",
  },
  {
    entity: "order",
    action: "completed",
    version: "1.0.0",
    description: "Fired when a purchase is successfully confirmed.",
    schema: z.object({
      order_id: z.string(),
      total: z.number().nonnegative(),
      currency: z.string(),
      tax: z.number().nonnegative(),
      items: z.array(
        z.object({
          product_id: z.string(),
          name: z.string(),
          price: z.number(),
          quantity: z.number().int().positive(),
        }),
      ),
    }),
    mode: "strict",
  },
];
