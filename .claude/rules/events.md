---
paths:
  - "packages/core/**"
  - "packages/client/**"
---

# Event Standards

## Entity:Action Pairs

All events use `entity:action` pairs, not flat strings.

```typescript
// Good
track("product", "viewed", { product_id: "123" })
track("order", "completed", { order_id: "456" })

// Bad
track("Product Viewed", { product_id: "123" })
```

## Naming Rules

- **Entities:** lowercase, singular or plural (`product`, `page`, `order`, `user`)
- **Actions:** lowercase, past tense preferred (`viewed`, `added`, `completed`, `signed_up`)
- **Combined key:** `entity:action` used for contract lookup and destination mapping
- Wildcard contracts (`entity:*`) match all actions for an entity
- If no contract exists, events pass through unvalidated

## Destination Mapping

Destinations map entity:action to vendor event names:

```typescript
const GA4_EVENT_MAP: Record<string, string> = {
  "page:viewed": "page_view",
  "product:viewed": "view_item",
  "product:added": "add_to_cart",
  "order:completed": "purchase",
};
```
