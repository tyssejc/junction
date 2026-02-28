"use client";

import { type ReactNode, createContext, useCallback, useContext, useReducer } from "react";
import type { Product } from "./products";

// ─── Types ───────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

interface CartState {
  items: CartItem[];
}

interface CartContextValue extends CartState {
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  removeItem: (slug: string, variant?: string) => void;
  updateQuantity: (slug: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
}

// ─── Reducer ─────────────────────────────────────────────────────

type CartAction =
  | { type: "ADD_ITEM"; product: Product; quantity: number; variant?: string }
  | { type: "REMOVE_ITEM"; slug: string; variant?: string }
  | { type: "UPDATE_QUANTITY"; slug: string; quantity: number; variant?: string }
  | { type: "CLEAR_CART" };

function itemKey(slug: string, variant?: string): string {
  return variant ? `${slug}::${variant}` : slug;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const key = itemKey(action.product.slug, action.variant);
      const existing = state.items.find((i) => itemKey(i.product.slug, i.variant) === key);

      if (existing) {
        return {
          items: state.items.map((i) =>
            itemKey(i.product.slug, i.variant) === key ? { ...i, quantity: i.quantity + action.quantity } : i,
          ),
        };
      }

      return {
        items: [...state.items, { product: action.product, quantity: action.quantity, variant: action.variant }],
      };
    }

    case "REMOVE_ITEM": {
      const key = itemKey(action.slug, action.variant);
      return { items: state.items.filter((i) => itemKey(i.product.slug, i.variant) !== key) };
    }

    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        const key = itemKey(action.slug, action.variant);
        return { items: state.items.filter((i) => itemKey(i.product.slug, i.variant) !== key) };
      }

      const key = itemKey(action.slug, action.variant);
      return {
        items: state.items.map((i) =>
          itemKey(i.product.slug, i.variant) === key ? { ...i, quantity: action.quantity } : i,
        ),
      };
    }

    case "CLEAR_CART":
      return { items: [] };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = useCallback((product: Product, quantity = 1, variant?: string) => {
    dispatch({ type: "ADD_ITEM", product, quantity, variant });
  }, []);

  const removeItem = useCallback((slug: string, variant?: string) => {
    dispatch({ type: "REMOVE_ITEM", slug, variant });
  }, []);

  const updateQuantity = useCallback((slug: string, quantity: number, variant?: string) => {
    dispatch({ type: "UPDATE_QUANTITY", slug, quantity, variant });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const cartTotal = state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, updateQuantity, clearCart, cartTotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
