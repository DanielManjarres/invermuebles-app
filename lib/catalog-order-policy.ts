export type CatalogOrderItemInput = {
  productId?: string;
  quantity?: number;
};

export type CatalogOrderItem = {
  productId: string;
  quantity: number;
};

type CatalogOrderProduct = {
  name: string;
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
    };

    if (!normalizedItem.productId || !Number.isInteger(normalizedItem.quantity)) {
      return;
    }

    const key = normalizedItem.productId;
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
) {
  if (!product) {
    return "Uno de los productos ya no está disponible.";
  }

  if (item.quantity > product.stock) {
    return `Solo hay ${product.stock} unidad(es) disponibles de ${product.name}.`;
  }

  return null;
}
