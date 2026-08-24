"use client";

import { useEffect, useState } from "react";

export type CartItem = {
  availableStock?: number;
  category?: string;
  details?: string;
  id: string;
  image?: string;
  name: string;
  productId: string;
  quantity: number;
  reference: string;
  variantId?: string;
  variantName?: string;
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
      productId: item.productId || item.id,
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
      const availableStock = item.availableStock ?? existingItem.availableStock;
      const nextQuantity = availableStock !== undefined && availableStock > 0
        ? Math.min(existingItem.quantity + 1, availableStock)
        : existingItem.quantity;
      const nextItems = currentItems.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              ...item,
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
    saveCart(readCart().filter((item) => item.id !== id));
  }

  function increaseItemQuantity(id: string) {
    const nextItems = readCart().map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: item.availableStock !== undefined && item.availableStock > 0
              ? Math.min(item.quantity + 1, item.availableStock)
              : item.availableStock === undefined
                ? item.quantity + 1
                : item.quantity,
          }
        : item,
    );

    saveCart(nextItems);
  }

  function decreaseItemQuantity(id: string) {
    const nextItems = readCart().map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: Math.max(1, item.quantity - 1),
          }
        : item,
    );

    saveCart(nextItems);
  }

  function clearCart() {
    saveCart([]);
  }

  return {
    items,
    addItem,
    removeItem,
    increaseItemQuantity,
    decreaseItemQuantity,
    clearCart,
  };
}
