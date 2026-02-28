"use client";

import type { CartItem as CartItemType } from "@/lib/cart";
import { useCart } from "@/lib/cart";
import { useJunction } from "@junctionjs/next";

export function CartItemRow({ item }: { item: CartItemType }) {
  const junction = useJunction();
  const { removeItem, updateQuantity } = useCart();

  function handleRemove() {
    removeItem(item.product.slug, item.variant);
    junction?.track("product", "removed", {
      product_id: item.product.slug,
      name: item.product.name,
      price: item.product.price,
    });
  }

  function handleQuantity(newQty: number) {
    updateQuantity(item.product.slug, newQty, item.variant);
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex-1">
        <h4 className="font-semibold text-foreground">{item.product.name}</h4>
        {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
        <p className="mt-1 text-sm text-accent">${item.product.price.toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleQuantity(item.quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-sm hover:bg-muted"
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          type="button"
          onClick={() => handleQuantity(item.quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-sm hover:bg-muted"
        >
          +
        </button>
      </div>

      <p className="w-20 text-right font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>

      <button type="button" onClick={handleRemove} className="text-xs text-destructive hover:underline">
        Remove
      </button>
    </div>
  );
}
