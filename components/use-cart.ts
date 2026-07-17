"use client";

import { useEffect, useState } from "react";

export type CartItem = {
  category?: string;
  details?: string;
  id: string;
  image?: string;
  name: string;
  reference: string;
};

export type AddCartResult = "added" | "exists";

const cartKey = "invermuebles-cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedCart = window.localStorage.getItem(cartKey);
  if (!storedCart) {
    return [];
  }

  try {
    return JSON.parse(storedCart) as CartItem[];
  } catch {
    return [];
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  function saveCart(nextItems: CartItem[]) {
    setItems(nextItems);
    window.localStorage.setItem(cartKey, JSON.stringify(nextItems));
  }

  function addItem(item: CartItem): AddCartResult {
    const exists = items.some((cartItem) => cartItem.id === item.id);
    if (exists) {
      return "exists";
    }

    saveCart([...items, item]);
    return "added";
  }

  function removeItem(id: string) {
    saveCart(items.filter((item) => item.id !== id));
  }

  function clearCart() {
    saveCart([]);
  }

  return {
    items,
    addItem,
    removeItem,
    clearCart,
  };
}
