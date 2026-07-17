"use client";

import { useEffect, useState } from "react";

export type CartItem = {
  category?: string;
  details?: string;
  id: string;
  image?: string;
  name: string;
  quantity: number;
  reference: string;
};

export type AddCartResult = {
  quantity: number;
  status: "added" | "updated";
};

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
    const parsedItems = JSON.parse(storedCart) as CartItem[];
    return parsedItems.map((item) => ({
      ...item,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
    }));
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
    const currentItems = readCart();
    const existingItem = currentItems.find((cartItem) => cartItem.id === item.id);

    if (existingItem) {
      const nextQuantity = existingItem.quantity + 1;
      const nextItems = currentItems.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: nextQuantity,
            }
          : cartItem,
      );

      saveCart(nextItems);
      return {
        quantity: nextQuantity,
        status: "updated",
      };
    }

    saveCart([
      ...currentItems,
      {
        ...item,
        quantity: 1,
      },
    ]);

    return {
      quantity: 1,
      status: "added",
    };
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
