export type CatalogOrderItemInput = {
  productId?: string;
  quantity?: number;
  variantId?: string;
};

export type CatalogOrderItem = {
  productId: string;
  quantity: number;
  variantId: string;
};

type CatalogOrderProduct = {
  hasActiveVariants: boolean;
  id: string;
  name: string;
  stock: number;
};

type CatalogOrderVariant = {
  id: string;
  name: string;
  productId: string;
  stock: number;
};

export function normalizeCatalogOrderItems(
  items: CatalogOrderItemInput[] = [],
): CatalogOrderItem[] {
  const groupedItems = new Map<string, CatalogOrderItem>();

  items.forEach((item) => {
    const normalizedItem = {
      productId: item.productId?.trim() ?? "",
      quantity: Number(item.quantity),
      variantId: item.variantId?.trim() ?? "",
    };

    if (!normalizedItem.productId || !Number.isInteger(normalizedItem.quantity)) {
      return;
    }

    const key = `${normalizedItem.productId}:${normalizedItem.variantId}`;
    const existingItem = groupedItems.get(key);
    groupedItems.set(key, {
      ...normalizedItem,
      quantity: normalizedItem.quantity + (existingItem?.quantity ?? 0),
    });
  });

  return Array.from(groupedItems.values());
}

export function getCatalogOrderItemError(
  item: CatalogOrderItem,
  product?: CatalogOrderProduct,
  variant?: CatalogOrderVariant,
) {
  if (!product) {
    return "Uno de los productos ya no está disponible.";
  }

  if (product.hasActiveVariants && !item.variantId) {
    return `Selecciona una presentación disponible de ${product.name}.`;
  }

  if (item.variantId && (!variant || variant.productId !== product.id)) {
    return `La presentación seleccionada de ${product.name} ya no está disponible.`;
  }

  const availableStock = variant?.stock ?? product.stock;
  if (item.quantity > availableStock) {
    return `Solo hay ${availableStock} unidad(es) disponibles de ${product.name}${variant ? ` · ${variant.name}` : ""}.`;
  }

  return null;
}
