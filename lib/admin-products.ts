import type { Product } from "@/lib/products";

export const adminProductsStorageKey = "invermuebles_admin_products";

export function readAdminProducts(fallbackProducts: Product[]) {
  if (typeof window === "undefined") {
    return fallbackProducts;
  }

  try {
    const storedProducts = window.localStorage.getItem(adminProductsStorageKey);
    return storedProducts ? (JSON.parse(storedProducts) as Product[]) : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

export function saveAdminProducts(products: Product[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(adminProductsStorageKey, JSON.stringify(products));
}

export function createProductId(name: string, existingProducts: Product[]) {
  const baseId =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase() || "producto";

  let id = baseId;
  let counter = 2;

  while (existingProducts.some((product) => product.id === id)) {
    id = `${baseId}-${counter}`;
    counter += 1;
  }

  return id;
}
