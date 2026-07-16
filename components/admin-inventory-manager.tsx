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
import { readAdminProducts, saveAdminProducts } from "@/lib/admin-products";
import type { Product } from "@/lib/products";
import {
  createMovementForm,
  createStockMovement,
  movementLabels,
  movementReasonOptions,
  saveStockMovement,
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
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setInventory(readAdminProducts(products));
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
      quantity: "1",
      reason: movementReasonOptions[type][0],
      note: "",
    });
    setStockError("");
  }

  function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stockProduct) {
      return;
    }

    const quantity = Math.max(0, Number(stockMovementForm.quantity));

    if (quantity <= 0) {
      setStockError("La cantidad debe ser mayor a cero.");
      return;
    }

    const previousStock = stockProduct.stock;
    const nextStock =
      stockMovementForm.type === "entry"
        ? previousStock + quantity
        : stockMovementForm.type === "exit"
          ? previousStock - quantity
          : quantity;

    if (nextStock < 0) {
      setStockError("La salida no puede ser mayor a la cantidad disponible.");
      return;
    }

    const movement = createStockMovement({
      product: stockProduct,
      type: stockMovementForm.type,
      quantity,
      previousStock,
      nextStock,
      reason: stockMovementForm.reason,
      note: stockMovementForm.note.trim(),
    });

    const nextInventory = inventory.map((product) =>
      product.id === stockProduct.id ? { ...product, stock: nextStock } : product
    );

    setInventory(nextInventory);
    saveAdminProducts(nextInventory);
    saveStockMovement(movement);
    setNotice(
      `${movementLabels[movement.type]} registrada para ${stockProduct.name}. Stock actual: ${nextStock}.`
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
                <select
                  value={stockMovementForm.reason}
                  onChange={(event) =>
                    setStockMovementForm({
                      ...stockMovementForm,
                      reason: event.target.value,
                    })
                  }
                >
                  {movementReasonOptions[stockMovementForm.type].map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </label>
              <label className="adminFormWide">
                Observación
                <textarea
                  placeholder="Opcional"
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

            {stockError ? <p className="formError">{stockError}</p> : null}

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={closeStockForm}
              >
                Cancelar
              </button>
              <button className="primaryButton" type="submit">
                Guardar movimiento
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
