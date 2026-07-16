"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import type { Product } from "@/lib/products";

type AdminInventoryManagerProps = {
  products: Product[];
};

type InventoryFilter = "all" | "available" | "outOfStock" | "web" | "hidden";

const filters: Array<{ label: string; value: InventoryFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Agotados", value: "outOfStock" },
  { label: "En web", value: "web" },
  { label: "Ocultos", value: "hidden" },
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

  if (filter === "web") {
    return product.visible && product.stock > 0;
  }

  if (filter === "hidden") {
    return !product.visible;
  }

  return true;
}

export function AdminInventoryManager({ products }: AdminInventoryManagerProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("all");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
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
  }, [activeFilter, products, query]);

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
            visible: items.filter(
              (product) => product.visible && product.stock > 0
            ).length,
          };
        }
      ),
    [filteredProducts]
  );

  return (
    <section className="tableSection">
      <div className="sectionHeader inventoryHeader">
        <div>
          <p className="eyebrow">Control interno</p>
          <h2>Inventario por tipo de producto</h2>
        </div>
        <button className="primaryButton" type="button">
          <Plus size={18} />
          Nuevo producto
        </button>
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

      <div className="actionLegend" aria-label="Leyenda de gestión">
        <span>
          <Pencil size={15} />
          Editar
        </span>
        <span>
          <EyeOff size={15} />
          Ocultar/Publicar
        </span>
        <span>
          <RotateCcw size={15} />
          Stock
        </span>
      </div>

      {groupedProducts.length > 0 ? (
        <nav className="inventoryShortcuts" aria-label="Atajos del inventario">
          {groupedProducts.map((group) => (
            <a className="inventoryShortcut" href={`#${group.id}`} key={group.id}>
              <span>{group.category}</span>
              <small>
                {group.items.length} productos
                {group.outOfStock > 0 ? ` · ${group.outOfStock} agotado(s)` : ""}
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
                  <span>{group.visible} en web</span>
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
                      <th>Valores</th>
                      <th>Estado</th>
                      <th>Web</th>
                      <th>Gestión</th>
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
                          <span className="priceStack">
                            <span>Costo: {product.cost.toLocaleString("es-CO")}</span>
                            <span>
                              Venta: {product.salePrice.toLocaleString("es-CO")}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              product.stock > 0 ? "available" : "unavailable"
                            }
                          >
                            {product.stock > 0 ? "Disponible" : "Agotado"}
                          </span>
                        </td>
                        <td>{product.visible ? "Sí" : "No"}</td>
                        <td>
                          <div className="actionsCell">
                            <button
                              className="tableAction iconOnly"
                              title="Editar producto"
                              type="button"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="tableAction iconOnly"
                              title={
                                product.visible
                                  ? "Ocultar de la web"
                                  : "Publicar en la web"
                              }
                              type="button"
                            >
                              {product.visible ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                            <button
                              className="tableAction iconOnly"
                              title="Actualizar stock"
                              type="button"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </div>
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
  );
}
