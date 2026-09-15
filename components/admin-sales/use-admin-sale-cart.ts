"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";

export type AdminSaleCartItem = {
  productId: string;
  quantity: number;
};

export type AdminSaleCartResult = {
  quantity: number;
  status: "added" | "updated";
};

const adminSaleCartKey = "invermuebles-admin-sale-cart";

function readAdminSaleCart(): AdminSaleCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedCart = window.localStorage.getItem(adminSaleCartKey);
  if (!storedCart) {
    return [];
  }

  try {
    const parsedItems = JSON.parse(storedCart) as Array<AdminSaleCartItem & { id?: string }>;
    return parsedItems
      .filter((item) => item.productId || item.id)
      .map((item) => ({
        productId: item.productId || item.id || "",
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      }));
  } catch {
    return [];
  }
}

function saveAdminSaleCart(nextItems: AdminSaleCartItem[]) {
  window.localStorage.setItem(adminSaleCartKey, JSON.stringify(nextItems));
  window.dispatchEvent(new Event("admin-sale-cart-updated"));
}

export function clearAdminSaleCart() {
  if (typeof window === "undefined") {
    return;
  }

  saveAdminSaleCart([]);
}

export function useAdminSaleCart(products: Product[] = []) {
  const [items, setItems] = useState<AdminSaleCartItem[]>(() => readAdminSaleCart());

  useEffect(() => {
    setItems(readAdminSaleCart());

    function syncCart() {
      setItems(readAdminSaleCart());
    }

    window.addEventListener("storage", syncCart);
    window.addEventListener("admin-sale-cart-updated", syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("admin-sale-cart-updated", syncCart);
    };
  }, []);

  function saveCart(nextItems: AdminSaleCartItem[]) {
    setItems(nextItems);
    saveAdminSaleCart(nextItems);
  }

  function addProduct(product: Product): AdminSaleCartResult {
    const currentItems = readAdminSaleCart();
    const existingItem = currentItems.find((item) => item.productId === product.id);

    if (existingItem) {
      const nextQuantity = Math.min(existingItem.quantity + 1, product.stock);
      const nextItems = currentItems.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: nextQuantity }
          : item
      );

      saveCart(nextItems);
      return {
        quantity: nextQuantity,
        status: "updated",
      };
    }

    saveCart([...currentItems, { productId: product.id, quantity: 1 }]);
    return {
      quantity: 1,
      status: "added",
    };
  }

  function clearCart() {
    saveCart([]);
  }

  function removeProduct(lineId: string) {
    saveCart(
      readAdminSaleCart().filter((item) => item.productId !== lineId),
    );
  }

  const detailedItems = items
    .map((item) => {
      const product = products.find((currentProduct) => currentProduct.id === item.productId);
      const availableStock = product?.stock ?? 0;
      if (!product || availableStock < 1) {
        return null;
      }

      return {
        lineId: product.id,
        product,
        quantity: Math.min(item.quantity, availableStock),
      };
    })
    .filter((item): item is {
      lineId: string;
      product: Product;
      quantity: number;
    } => item !== null);

  const totalQuantity = detailedItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return {
    items,
    detailedItems,
    totalQuantity,
    addProduct,
    clearCart,
    removeProduct,
  };
}
