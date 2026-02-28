"use client";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { type CapturedEvent, getEvents, onEvent } from "@/lib/demo-sink";
import { getProduct } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useJunction } from "@junctionjs/next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const junction = useJunction();
  const product = getProduct(slug);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [lastEvent, setLastEvent] = useState<CapturedEvent | null>(null);

  const trackedSlug = useRef<string | null>(null);
  useEffect(() => {
    if (!product || !junction) return;
    if (trackedSlug.current === slug) return;
    trackedSlug.current = slug;
    junction.track("product", "viewed", {
      product_id: product.slug,
      name: product.name,
      price: product.price,
      currency: product.currency,
      category: product.category,
    });
  }, [slug, product, junction]);

  // Capture the latest product:viewed event for transform display
  useEffect(() => {
    const events = getEvents();
    const latest = [...events]
      .reverse()
      .find((e) => e.raw.entity === "product" && (e.raw.action === "viewed" || e.raw.action === "added"));
    if (latest) setLastEvent(latest);

    return onEvent((ev) => {
      if (ev.raw.entity === "product") setLastEvent(ev);
    });
  }, []);

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link href="/store" className="mt-4 inline-block text-primary hover:underline">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/store"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to store
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Product image */}
        <div
          className={cn(
            "flex h-80 items-center justify-center rounded-xl bg-gradient-to-br lg:h-[400px]",
            categoryGradients[product.category] ?? "from-gray-600 to-gray-400",
          )}
        >
          <span className="text-8xl opacity-80">{categoryEmoji[product.category] ?? "📦"}</span>
        </div>

        {/* Product details */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">{product.category}</p>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.description}</p>
          <p className="mt-4 text-3xl font-bold text-accent">${product.price.toFixed(2)}</p>

          {/* Variant selector */}
          {product.variants?.map((v) => (
            <div key={v.label} className="mt-6">
              <p className="mb-2 text-sm font-medium">{v.label}</p>
              <div className="flex flex-wrap gap-2">
                {v.options.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setSelectedVariant(opt)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      selectedVariant === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8">
            <AddToCartButton product={product} variant={selectedVariant} />
          </div>
        </div>
      </div>

      {/* Destination comparison panel */}
      {lastEvent && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Destination Transform Comparison</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            The same Junction event, transformed for three different analytics destinations:
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            <TransformCard title="GA4 would receive" color="text-blue-400" data={lastEvent.transforms.ga4} />
            <TransformCard
              title="Amplitude would receive"
              color="text-purple-400"
              data={lastEvent.transforms.amplitude}
            />
            <TransformCard title="Meta would receive" color="text-green-400" data={lastEvent.transforms.meta} />
          </div>
        </div>
      )}
    </div>
  );
}

function TransformCard({ title, color, data }: { title: string; color: string; data: unknown }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2">
        <h3 className={cn("text-sm font-semibold", color)}>{title}</h3>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs text-muted-foreground">
        {data ? JSON.stringify(data, null, 2) : "null (event skipped)"}
      </pre>
    </div>
  );
}
