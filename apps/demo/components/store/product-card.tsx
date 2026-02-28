"use client";

import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useJunction } from "@junctionjs/next";
import Link from "next/link";

const categoryGradients: Record<string, string> = {
  apparel: "from-purple-600 to-pink-500",
  models: "from-blue-600 to-cyan-400",
  patches: "from-orange-500 to-yellow-400",
  stickers: "from-green-500 to-teal-400",
  books: "from-amber-600 to-orange-400",
  posters: "from-indigo-600 to-blue-400",
  collectibles: "from-pink-600 to-purple-400",
};

const categoryEmoji: Record<string, string> = {
  apparel: "👕",
  models: "🚀",
  patches: "🔖",
  stickers: "✨",
  books: "📚",
  posters: "🖼️",
  collectibles: "💿",
};

export function ProductCard({ product, position }: { product: Product; position: number }) {
  const junction = useJunction();

  function handleClick() {
    junction?.track("product", "clicked", {
      product_id: product.slug,
      name: product.name,
      price: product.price,
      position,
    });
  }

  return (
    <Link href={`/store/${product.slug}`} onClick={handleClick} className="group block">
      <div className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
        {/* Image placeholder */}
        <div
          className={cn(
            "relative flex h-48 items-center justify-center bg-gradient-to-br",
            categoryGradients[product.category] ?? "from-gray-600 to-gray-400",
          )}
        >
          <span className="text-5xl opacity-80">{categoryEmoji[product.category] ?? "📦"}</span>
          {product.badge && (
            <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              {product.badge}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-4">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
          <p className="mt-2 text-lg font-bold text-accent">${product.price.toFixed(2)}</p>
        </div>
      </div>
    </Link>
  );
}
