"use client";

import { useCart } from "@/lib/cart";
import { useJunction } from "@junctionjs/next";
import Link from "next/link";
import { useState } from "react";

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const junction = useJunction();
  const [completed, setCompleted] = useState(false);
  const [orderId, setOrderId] = useState("");

  function handleComplete() {
    const id = crypto.randomUUID().slice(0, 8).toUpperCase();
    setOrderId(id);

    junction?.track("order", "completed", {
      order_id: id,
      total: cartTotal,
      currency: "USD",
      tax: +(cartTotal * 0.08).toFixed(2),
      items: items.map((i) => ({
        product_id: i.product.slug,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        variant: i.variant,
      })),
    });

    clearCart();
    setCompleted(true);
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-6xl">🎉</p>
        <h1 className="mt-4 text-3xl font-bold">Order Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Order <span className="font-mono text-accent">#{orderId}</span> has been placed.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          The <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">order:completed</code>{" "}
          event was just fired with full order details, validated against the Zod contract, and transformed for GA4,
          Amplitude, and Meta.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the debug panel (Ctrl+Shift+J) to see the full event payload.
        </p>
        <Link
          href="/store"
          className="mt-8 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Nothing to checkout</h1>
        <Link href="/store" className="mt-4 inline-block text-primary hover:underline">
          Browse store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Fake form */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Shipping Information</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder="Address"
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="ZIP Code"
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">This is a demo — no real orders are placed.</p>
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={`${item.product.slug}-${item.variant ?? ""}`} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {item.product.name} x{item.quantity}
                  </span>
                  <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span>${(cartTotal * 0.08).toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-bold">
                  <span>Total</span>
                  <span className="text-accent">${(cartTotal * 1.08).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className="mt-6 w-full rounded-lg bg-accent px-6 py-3 text-sm font-bold text-accent-foreground hover:bg-accent/90"
            >
              Complete Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
