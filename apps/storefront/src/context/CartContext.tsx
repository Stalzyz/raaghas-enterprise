"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Cookies from "js-cookie";
import { API_URL } from "@/lib/api";

export interface CartItem {
  id: string;
  variantId: string;
  title: string;
  price: number;
  quantity: number;
  maxStock: number; // FIX: track available inventory to prevent overselling
  image: string;
  taxInclusive?: boolean; // added for tax
  size?: string;
  color?: string;
  material?: string;
  options?: Record<string, string>;
  handle?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  isDrawerOpen: boolean;
  toggleDrawer: (open?: boolean) => void;
  isInitialized: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("raaghas_cart");
    if (saved && saved !== "undefined") {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cart", e);
        localStorage.removeItem("raaghas_cart");
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("raaghas_cart", JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) => {
          if (i.id === newItem.id) {
             const newQty = i.quantity + newItem.quantity;
             const cappedQty = Math.min(newQty, i.maxStock || 999);
             if (newQty > cappedQty) {
                alert(`Cannot add more. Only ${i.maxStock} available in stock.`);
             }
             return { ...i, quantity: cappedQty };
          }
          return i;
        });
      }
      return [...prev, newItem];
    });

    // Track Meta AddToCart Event (Pixel + CAPI Deduplication)
    const eventId = "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    import("@/components/analytics/MetaPixel").then((m) => {
      m.trackMetaEvent("AddToCart", {
        content_ids: [newItem.variantId],
        content_name: newItem.title,
        currency: "INR",
        value: newItem.price,
        content_type: "product"
      }, eventId);
    });

    fetch(API_URL + "/api/v1/marketing/capi/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "AddToCart",
        amount: newItem.price,
        currency: "INR",
        metaEventId: eventId,
        contentIds: [newItem.variantId],
        fbp: Cookies.get("_fbp"),
        fbc: Cookies.get("_fbc")
      })
    }).catch(() => {});
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const newQty = i.quantity + delta;
        // FIX: cap at maxStock to prevent overselling
        const capped = Math.min(Math.max(1, newQty), i.maxStock || 999);
        return { ...i, quantity: capped };
      })
    );
  };

  const clearCart = () => setItems([]);

  const toggleDrawer = (open?: boolean) => {
    setIsDrawerOpen(open !== undefined ? open : !isDrawerOpen);
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        isDrawerOpen,
        toggleDrawer,
        isInitialized,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
