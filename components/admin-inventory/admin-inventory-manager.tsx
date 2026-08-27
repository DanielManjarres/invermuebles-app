"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExcelDownloadButton } from "@/components/admin-reports/excel-download-button";
import {
  InventoryGroups,
  type InventoryItem,
} from "@/components/admin-inventory/inventory-groups";
import {
  InventoryStats,
  InventoryToolbar,
  type InventoryFilter,
} from "@/components/admin-inventory/inventory-overview";
import { StockMovementModal } from "@/components/admin-inventory/stock-movement-modal";
import type { Product } from "@/lib/products";
import {
  createMovementForm,
  movementLabels,
  type MovementType,
  type StockMovementFormState,
} from "@/lib/stock-movements";
import {
  calculateNextStock,
  isValidStockMovementQuantity,
} from "@/lib/stock-calculator";
import { downloadInventoryReport } from "@/lib/admin-report-builders";

type AdminInventoryManagerProps = {
  products: Product[];
};

function createCategoryId(category: string) {
  return `inventario-${category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase()}`;
}

function createInventoryItems(products: Product[]): InventoryItem[] {
  return products.flatMap<InventoryItem>((product): InventoryItem[] => {
    const category = product.catalogCategory || product.category;
    const productType = product.catalogProductType || product.productClass;

    if (product.variants && product.variants.length > 0) {
      return product.variants.map((variant) => ({
        active: variant.active,
        category,
        isLegacy: false,
        key: `${product.id}-${variant.id}`,
        location: variant.location,
        minimumStock: variant.minimumStock,
        productId: product.id,
        productName: product.name,
        productType,
        reference: variant.reference,
        stock: variant.stock,
        variantId: variant.id,
        variantName: variant.name,
      }));
    }

    return [{
      active: true,
      category,
      isLegacy: true,
      key: product.id,
      location: "",
      minimumStock: 0,
      productId: product.id,
      productName: product.name,
      productType,
      reference: product.reference,
      stock: product.stock,
      variantName: "Referencia principal",
    }];
  });
}

function isLowStock(item: InventoryItem) {
  return item.stock > 0 && item.stock <= item.minimumStock;
}

function matchesFilter(item: InventoryItem, filter: InventoryFilter) {
  if (filter === "available") {
    return item.active && item.stock > item.minimumStock;
  }

  if (filter === "lowStock") {
    return item.active && isLowStock(item);
  }

  if (filter === "outOfStock") {
    return item.active && item.stock === 0;
  }

  return true;
}

export function AdminInventoryManager({ products }: AdminInventoryManagerProps) {
  const [inventory, setInventory] = useState<Product[]>(products);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("all");
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stockMovementForm, setStockMovementForm] =
    useState<StockMovementFormState>(createMovementForm());
  const [stockError, setStockError] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setInventory(products);
  }, [products]);

  const inventoryItems = useMemo(() => createInventoryItems(inventory), [inventory]);
  const totalReferences = inventoryItems.length;
  const availableReferences = inventoryItems.filter(
    (item) => item.active && item.stock > item.minimumStock
  ).length;
  const lowStockReferences = inventoryItems.filter(
    (item) => item.active && isLowStock(item)
  ).length;
  const outOfStock = inventoryItems.filter(
    (item) => item.active && item.stock === 0
  ).length;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return inventoryItems.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          item.productName,
          item.variantName,
          item.reference,
          item.category,
          item.productType,
          item.location,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesQuery && matchesFilter(item, activeFilter);
    });
  }, [activeFilter, inventoryItems, query]);

  const groupedProducts = useMemo(
    () =>
      Array.from(new Set(filteredProducts.map((item) => item.category))).map(
        (category) => {
          const items = filteredProducts.filter(
            (item) => item.category === category
          );

          return {
            category,
            id: createCategoryId(category),
            items,
            productTypes: Array.from(
              new Set(items.map((item) => item.productType))
            ),
            lowStock: items.filter((item) => item.active && isLowStock(item)).length,
            outOfStock: items.filter(
              (item) => item.active && item.stock === 0
            ).length,
            available: items.filter(
              (item) => item.active && item.stock > item.minimumStock
            ).length,
          };
        }
      ),
    [filteredProducts]
  );
  const movementQuantity = Number(stockMovementForm.quantity);
  const hasValidMovementQuantity =
    stockMovementForm.quantity.trim() !== "" &&
    Boolean(stockMovementForm.type) &&
    isValidStockMovementQuantity(
      stockMovementForm.type || "entry",
      movementQuantity
    );
  const projectedStock =
    stockItem && stockMovementForm.type && hasValidMovementQuantity
      ? calculateNextStock(stockItem.stock, stockMovementForm.type, movementQuantity)
      : null;
  const isInvalidExit =
    stockMovementForm.type === "exit" &&
    projectedStock !== null &&
    projectedStock < 0;
  const movementSummaryText = !stockMovementForm.type
    ? "Selecciona entrada, salida o ajuste para calcular el stock final."
    : !hasValidMovementQuantity
      ? "Ingresa una cantidad para ver el cambio antes de guardar."
      : isInvalidExit
        ? "La salida supera el stock disponible."
        : "Revisa el stock final antes de guardar el movimiento.";
  function openStockForm(item: InventoryItem) {
    setStockItem(item);
    setStockMovementForm(createMovementForm());
    setStockError("");
    setNotice("");
  }

  function closeStockForm() {
    setStockItem(null);
    setStockError("");
  }

  function handleMovementTypeChange(type: MovementType) {
    setStockMovementForm({
      type,
      quantity: "",
      reason: "",
      note: "",
    });
    setStockError("");
  }

  async function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stockItem) {
      return;
    }

    if (!stockMovementForm.type) {
      setStockError("Selecciona el tipo de movimiento.");
      return;
    }

    if (!stockMovementForm.reason) {
      setStockError("Selecciona el motivo del movimiento.");
      return;
    }

    if (!hasValidMovementQuantity) {
      setStockError(
        stockMovementForm.type === "adjustment"
          ? "El stock real debe ser un entero mayor o igual a cero."
          : "La cantidad debe ser un entero mayor a cero."
      );
      return;
    }

    const quantity = movementQuantity;
    const previousStock = stockItem.stock;
    const nextStock = projectedStock ?? previousStock;

    if (isInvalidExit) {
      setStockError("La salida no puede ser mayor a la cantidad disponible.");
      return;
    }

    let result: { message?: string; nextStock?: number } = {};
    let response: Response;

    try {
      setStockSaving(true);
      response = await fetch("/api/stock-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: stockItem.productId,
          variantId: stockItem.variantId,
          type: stockMovementForm.type,
          quantity,
          reason: stockMovementForm.reason,
          note: stockMovementForm.note.trim(),
        }),
      });

      result = (await response.json().catch(() => ({}))) as {
        message?: string;
        nextStock?: number;
      };
    } catch {
      setStockError("No se pudo conectar con la base de datos.");
      setStockSaving(false);
      return;
    }

    setStockSaving(false);

    if (!response.ok || typeof result.nextStock !== "number") {
      setStockError(
        result.message ?? "No se pudo guardar el movimiento. Intenta de nuevo."
      );
      return;
    }

    const nextInventory = inventory.map((product) => {
      if (product.id !== stockItem.productId) return product;

      if (!stockItem.variantId) {
        return { ...product, stock: result.nextStock ?? nextStock };
      }

      const variants = (product.variants ?? []).map((variant) =>
        variant.id === stockItem.variantId
          ? { ...variant, stock: result.nextStock ?? nextStock }
          : variant
      );
      return {
        ...product,
        stock: variants.reduce((total, variant) => total + variant.stock, 0),
        variants,
      };
    });

    setInventory(nextInventory);
    setNotice(
      `${movementLabels[stockMovementForm.type]} registrada para ${stockItem.productName} · ${stockItem.variantName}. Stock actual: ${result.nextStock}.`
    );
    setStockItem(null);
  }

  return (
    <>
      <InventoryStats
        availableReferences={availableReferences}
        lowStockReferences={lowStockReferences}
        outOfStock={outOfStock}
        totalReferences={totalReferences}
      />

      <section className="tableSection">
        <div className="sectionHeader inventoryHeader">
          <div>
            <p className="eyebrow">Control interno</p>
            <h2>Inventario por variante</h2>
          </div>
          <ExcelDownloadButton
            disabled={inventory.length === 0}
            onDownload={() => downloadInventoryReport(inventory)}
          />
        </div>

        <InventoryToolbar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onQueryChange={setQuery}
          query={query}
        />

        {notice ? (
          <p className="inventoryNotice" aria-live="polite">
            <span>{notice}</span>
            <Link href="/admin/movimientos">Ver movimientos</Link>
          </p>
        ) : null}

        <InventoryGroups
          groups={groupedProducts}
          onOpenMovement={openStockForm}
        />
      </section>

      {stockItem ? (
        <StockMovementModal
          error={stockError}
          form={stockMovementForm}
          hasValidQuantity={hasValidMovementQuantity}
          isInvalidExit={isInvalidExit}
          item={stockItem}
          movementQuantity={movementQuantity}
          movementSummaryText={movementSummaryText}
          onClose={closeStockForm}
          onFormChange={setStockMovementForm}
          onSubmit={handleStockSubmit}
          onTypeChange={handleMovementTypeChange}
          projectedStock={projectedStock}
          saving={stockSaving}
        />
      ) : null}
    </>
  );
}
