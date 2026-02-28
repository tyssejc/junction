"use client";

import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { useJunction } from "@junctionjs/next";
import { useState } from "react";

export function AddToCartButton({ product, variant }: { product: Product; variant?: string }) {
  const junction = useJunction();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, 1, variant);

    junction?.track("product", "added", {
      product_id: product.slug,
      name: product.name,
      price: product.price,
      currency: product.currency,
      quantity: 1,
      variant,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
      disabled={added}
    >
      {added ? "Added!" : "Add to Cart"}
    </button>
  );
}
