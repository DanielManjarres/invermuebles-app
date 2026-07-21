"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
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

type AdminInventoryManagerProps = {
  products: Product[];
};

type InventoryFilter = "all" | "available" | "outOfStock";

const filters: Array<{ label: string; value: InventoryFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
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

function matchesFilter(product: Product, filter: InventoryFilter) {
  if (filter === "available") {
    return product.stock > 0;
  }

  if (filter === "outOfStock") {
    return product.stock === 0;
  }

  return true;
}

export function AdminInventoryManager({ products }: AdminInventoryManagerProps) {
  const [inventory, setInventory] = useState<Product[]>(products);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("all");
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockMovementForm, setStockMovementForm] =
    useState<StockMovementFormState>(createMovementForm());
  const [stockError, setStockError] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setInventory(products);
  }, [products]);

  const totalProducts = inventory.length;
  const availableProducts = inventory.filter((product) => product.stock > 0).length;
  const outOfStock = inventory.filter((product) => product.stock === 0).length;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return inventory.filter((product) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          product.name,
          product.reference,
          product.category,
          product.productClass,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesQuery && matchesFilter(product, activeFilter);
    });
  }, [activeFilter, inventory, query]);

  const groupedProducts = useMemo(
    () =>
      Array.from(new Set(filteredProducts.map((product) => product.category))).map(
        (category) => {
          const items = filteredProducts.filter(
            (product) => product.category === category
          );

          return {
            category,
            id: createCategoryId(category),
            items,
            classes: Array.from(
              new Set(items.map((product) => product.productClass))
            ),
            outOfStock: items.filter((product) => product.stock === 0).length,
            available: items.filter((product) => product.stock > 0).length,
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
    Number.isFinite(movementQuantity) &&
    movementQuantity > 0;
  const projectedStock =
    stockProduct && stockMovementForm.type && hasValidMovementQuantity
      ? stockMovementForm.type === "entry"
        ? stockProduct.stock + movementQuantity
        : stockMovementForm.type === "exit"
          ? stockProduct.stock - movementQuantity
          : movementQuantity
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

  function openStockForm(product: Product) {
    setStockProduct(product);
    setStockMovementForm(createMovementForm());
    setStockError("");
    setNotice("");
  }

  function closeStockForm() {
    setStockProduct(null);
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

    if (!stockProduct) {
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
      setStockError("La cantidad debe ser mayor a cero.");
      return;
    }

    const quantity = movementQuantity;
    const previousStock = stockProduct.stock;
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
          productId: stockProduct.id,
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

    const nextInventory = inventory.map((product) =>
      product.id === stockProduct.id
        ? { ...product, stock: result.nextStock ?? nextStock }
        : product
    );

    setInventory(nextInventory);
    setNotice(
      `${movementLabels[stockMovementForm.type]} registrada para ${stockProduct.name}. Stock actual: ${result.nextStock}.`
    );
    setStockProduct(null);
  }

  return (
    <>
      <section className="statsGrid">
        <div className="stat">
          <Boxes size={22} />
          <span>Total productos</span>
          <strong>{totalProducts}</strong>
        </div>
        <div className="stat">
          <PackageCheck size={22} />
          <span>Disponibles</span>
          <strong>{availableProducts}</strong>
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
            <h2>Inventario por tipo de producto</h2>
          </div>
        </div>

        <div className="inventoryToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por producto, referencia, tipo o clase"
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
                  {group.items.length} productos
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
            <h2>No se encontraron productos</h2>
            <p>Cambia la búsqueda o selecciona otro filtro del inventario.</p>
          </div>
        ) : (
          <div className="inventoryGroups">
            {groupedProducts.map((group) => (
              <article className="inventoryGroup" id={group.id} key={group.category}>
                <div className="inventoryGroupHeader">
                  <div>
                    <p className="eyebrow">{group.classes.join(" / ")}</p>
                    <h3>{group.category}</h3>
                  </div>
                  <div className="inventoryGroupStats">
                    <span>{group.items.length} productos</span>
                    <span>{group.available} disponibles</span>
                    <span>{group.outOfStock} agotados</span>
                  </div>
                </div>

                <div className="tableWrap inventoryTableWrap">
                  <table className="inventoryTable">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Clase</th>
                        <th>Referencia</th>
                        <th>Cantidad</th>
                        <th>Estado</th>
                        <th className="actionsHeader">Gestión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                          </td>
                          <td>{product.productClass}</td>
                          <td>{product.reference}</td>
                          <td>{product.stock}</td>
                          <td>
                            <span
                              className={
                                product.stock > 0 ? "available" : "unavailable"
                              }
                            >
                              {product.stock > 0 ? "Disponible" : "Agotado"}
                            </span>
                          </td>
                          <td className="actionsCell">
                            <button
                              className="manageButton"
                              type="button"
                              onClick={() => openStockForm(product)}
                            >
                              <RotateCcw size={15} />
                              Registrar movimiento
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {stockProduct ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form className="adminModal smallModal" onSubmit={handleStockSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Movimiento de inventario</p>
                <h2>{stockProduct.name}</h2>
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
              <strong>{stockProduct.stock}</strong>
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
                  min="1"
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
                <strong>{stockProduct.stock}</strong>
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
