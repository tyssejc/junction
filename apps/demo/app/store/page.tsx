"use client";

import { ProductCard } from "@/components/store/product-card";
import { getProductsByCategory, products } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useJunction } from "@junctionjs/next";
import { useEffect, useRef, useState } from "react";

const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

export default function StorePage() {
  const junction = useJunction();
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all" ? products : getProductsByCategory(activeCategory);

  const lastTrackedCategory = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: filtered is derived from activeCategory which is already in the dep list
  useEffect(() => {
    if (!junction) return;
    if (lastTrackedCategory.current === activeCategory) return;
    lastTrackedCategory.current = activeCategory;
    junction.track("product", "list_viewed", {
      category: activeCategory === "all" ? undefined : activeCategory,
      products: filtered.map((p) => ({ product_id: p.slug, name: p.name, price: p.price })),
    });
  }, [activeCategory, junction]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Space Gear</h1>
        <p className="mt-1 text-muted-foreground">
          Every click fires a tracked event. Open the debug panel (Ctrl+Shift+J) to watch.
        </p>
      </div>

      {/* Category filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product, i) => (
          <ProductCard key={product.slug} product={product} position={i + 1} />
        ))}
      </div>
    </div>
  );
}
