"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  PackageX,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { SelectMenu } from "@/components/select-menu";
import type { Product } from "@/lib/products";
import {
  createMovementForm,
  movementLabels,
  movementReasonOptions,
  type MovementType,
  type StockMovementFormState,
} from "@/lib/stock-movements";
import {
  calculateNextStock,
  isValidStockMovementQuantity,
} from "@/lib/stock-calculator";

type AdminInventoryManagerProps = {
  products: Product[];
};

type InventoryFilter = "all" | "available" | "lowStock" | "outOfStock";

type InventoryItem = {
  active: boolean;
  category: string;
  isLegacy: boolean;
  key: string;
  location: string;
  minimumStock: number;
  productId: string;
  productName: string;
  productType: string;
  reference: string;
  stock: number;
  variantId?: string;
  variantName: string;
};

const filters: Array<{ label: string; value: InventoryFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Stock bajo", value: "lowStock" },
  { label: "Agotados", value: "outOfStock" },
];

const movementNotePlaceholders: Record<MovementType, string> = {
  entry: "Ej: Reposición recibida en buen estado",
  exit: "Ej: Venta confirmada por WhatsApp",
  adjustment: "Ej: Conteo físico realizado en bodega",
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

function getStockStatus(item: InventoryItem) {
  if (!item.active) return { className: "unavailable", label: "Inactiva" };
  if (item.stock === 0) return { className: "unavailable", label: "Agotado" };
  if (isLowStock(item)) return { className: "stockLow", label: "Stock bajo" };
  return { className: "available", label: "Disponible" };
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
  const currentReasonOptions = stockMovementForm.type
    ? movementReasonOptions[stockMovementForm.type]
    : [];
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
  const notePlaceholder = stockMovementForm.type
    ? movementNotePlaceholders[stockMovementForm.type]
    : "Opcional";

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
      <section className="statsGrid">
        <div className="stat">
          <Boxes size={22} />
          <span>Total referencias</span>
          <strong>{totalReferences}</strong>
        </div>
        <div className="stat">
          <PackageCheck size={22} />
          <span>Disponibles</span>
          <strong>{availableReferences}</strong>
        </div>
        <div className="stat">
          <AlertTriangle size={22} />
          <span>Stock bajo</span>
          <strong>{lowStockReferences}</strong>
        </div>
        <div className="stat">
          <PackageX size={22} />
          <span>Agotados</span>
          <strong>{outOfStock}</strong>
        </div>
      </section>

      <section className="tableSection">
        <div className="sectionHeader inventoryHeader">
          <div>
            <p className="eyebrow">Control interno</p>
            <h2>Inventario por variante</h2>
          </div>
        </div>

        <div className="inventoryToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por producto, variante, referencia o ubicación"
              type="search"
              value={query}
            />
          </label>

          <div className="inventoryFilters" aria-label="Filtros del inventario">
            {filters.map((filter) => (
              <button
                className={
                  activeFilter === filter.value
                    ? "filterButton active"
                    : "filterButton"
                }
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {notice ? (
          <p className="inventoryNotice" aria-live="polite">
            <span>{notice}</span>
            <Link href="/admin/movimientos">Ver movimientos</Link>
          </p>
        ) : null}

        {groupedProducts.length > 0 ? (
          <nav className="inventoryShortcuts" aria-label="Atajos del inventario">
            {groupedProducts.map((group) => (
              <a className="inventoryShortcut" href={`#${group.id}`} key={group.id}>
                <span>{group.category}</span>
                <small>
                  {group.items.length} referencia(s)
                  {group.outOfStock > 0
                    ? ` · ${group.outOfStock} agotado(s)`
                    : ""}
                </small>
              </a>
            ))}
          </nav>
        ) : null}

        {groupedProducts.length === 0 ? (
          <div className="emptyState">
            <h2>No se encontraron referencias</h2>
            <p>Cambia la búsqueda o selecciona otro filtro del inventario.</p>
          </div>
        ) : (
          <div className="inventoryGroups">
            {groupedProducts.map((group) => (
              <article className="inventoryGroup" id={group.id} key={group.category}>
                <div className="inventoryGroupHeader">
                  <div>
                    <p className="eyebrow">{group.productTypes.join(" / ")}</p>
                    <h3>{group.category}</h3>
                  </div>
                  <div className="inventoryGroupStats">
                    <span>{group.items.length} referencias</span>
                    <span>{group.available} disponibles</span>
                    <span>{group.lowStock} con stock bajo</span>
                    <span>{group.outOfStock} agotados</span>
                  </div>
                </div>

                <div className="tableWrap inventoryTableWrap">
                  <table className="inventoryTable">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Variante</th>
                        <th>Tipo</th>
                        <th>Referencia</th>
                        <th>Ubicación</th>
                        <th>Cantidad</th>
                        <th>Mínimo</th>
                        <th>Estado</th>
                        <th className="actionsHeader">Gestión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const status = getStockStatus(item);
                        return (
                        <tr key={item.key}>
                          <td>
                            <strong>{item.productName}</strong>
                          </td>
                          <td>
                            {item.variantName}
                            {item.isLegacy ? (
                              <small className="inventoryLegacyNote">Sin migrar</small>
                            ) : null}
                          </td>
                          <td>{item.productType}</td>
                          <td>{item.reference}</td>
                          <td>{item.location || "Sin registrar"}</td>
                          <td>{item.stock}</td>
                          <td>{item.minimumStock}</td>
                          <td>
                            <span className={status.className}>
                              {status.label}
                            </span>
                          </td>
                          <td className="actionsCell">
                            <button
                              className="manageButton"
                              type="button"
                              onClick={() => openStockForm(item)}
                            >
                              <RotateCcw size={15} />
                              Registrar movimiento
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {stockItem ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form className="adminModal smallModal" onSubmit={handleStockSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Movimiento de inventario</p>
                <h2>{stockItem.productName}</h2>
                <p>
                  {stockItem.variantName} · {stockItem.reference}
                </p>
              </div>
              <button
                className="modalClose"
                type="button"
                aria-label="Cerrar"
                onClick={closeStockForm}
              >
                <X size={20} />
              </button>
            </div>

            <div className="stockSummary">
              <span>Stock actual</span>
              <strong>{stockItem.stock}</strong>
            </div>

            <p className="formHint">
              Registra entradas cuando llegue mercancía, salidas cuando se entregue o
              venda un producto, y ajustes cuando el conteo físico no coincida.
            </p>

            <div className="movementTypeGroup" aria-label="Tipo de movimiento">
              {(Object.keys(movementLabels) as MovementType[]).map((type) => (
                <button
                  className={
                    stockMovementForm.type === type
                      ? "movementTypeButton active"
                      : "movementTypeButton"
                  }
                  key={type}
                  type="button"
                  onClick={() => handleMovementTypeChange(type)}
                >
                  {movementLabels[type]}
                </button>
              ))}
            </div>

            <div className="adminFormGrid movementFormGrid">
              <label>
                {stockMovementForm.type === "adjustment"
                  ? "Cantidad real contada"
                  : "Cantidad"}
                <input
                  autoFocus
                  min={stockMovementForm.type === "adjustment" ? "0" : "1"}
                  required
                  type="number"
                  value={stockMovementForm.quantity}
                  onChange={(event) =>
                    setStockMovementForm({
                      ...stockMovementForm,
                      quantity: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Motivo
                <SelectMenu
                  disabled={!stockMovementForm.type}
                  options={currentReasonOptions.map((reason) => ({
                    label: reason,
                    value: reason,
                  }))}
                  placeholder="Selecciona un motivo"
                  value={stockMovementForm.reason}
                  onChange={(value) =>
                    setStockMovementForm({
                      ...stockMovementForm,
                      reason: value,
                    })
                  }
                />
              </label>
              <label className="adminFormWide">
                Observación
                <textarea
                  placeholder={notePlaceholder}
                  rows={3}
                  value={stockMovementForm.note}
                  onChange={(event) =>
                    setStockMovementForm({
                      ...stockMovementForm,
                      note: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <div
              className={
                isInvalidExit
                  ? "movementPreview movementPreviewWarning"
                  : "movementPreview"
              }
            >
              <div>
                <span>Stock actual</span>
                <strong>{stockItem.stock}</strong>
              </div>
              <div>
                <span>Movimiento</span>
                <strong>
                  {hasValidMovementQuantity
                    ? stockMovementForm.type === "entry"
                      ? `+${movementQuantity}`
                      : stockMovementForm.type === "exit"
                        ? `-${movementQuantity}`
                        : movementQuantity
                    : "-"}
                </strong>
              </div>
              <div>
                <span>Stock final</span>
                <strong>{projectedStock ?? "-"}</strong>
              </div>
              <p>{movementSummaryText}</p>
            </div>

            {stockError ? <p className="formError">{stockError}</p> : null}

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeStockForm}
                disabled={stockSaving}
              >
                Cancelar
              </button>
              <button className="primaryButton" type="submit" disabled={stockSaving}>
                {stockSaving ? "Guardando..." : "Guardar movimiento"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
