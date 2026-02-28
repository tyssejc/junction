"use client";

import { CartItemRow } from "@/components/store/cart-item";
import { useCart } from "@/lib/cart";
import { useJunction } from "@junctionjs/next";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { items, cartTotal, itemCount } = useCart();
  const junction = useJunction();
  const router = useRouter();

  function handleCheckout() {
    junction?.track("checkout", "started", {
      cart_total: cartTotal,
      currency: "USD",
      item_count: itemCount,
    });
    router.push("/checkout");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our space gear and add some items.</p>
        <Link
          href="/store"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Browse Store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Your Cart</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <CartItemRow key={`${item.product.slug}-${item.variant ?? ""}`} item={item} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </p>
          <p className="text-2xl font-bold text-accent">${cartTotal.toFixed(2)}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/store" className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted">
            Continue Shopping
          </Link>
          <button
            type="button"
            onClick={handleCheckout}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
