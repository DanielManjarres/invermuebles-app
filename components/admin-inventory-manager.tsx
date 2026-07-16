"use client";

import { FormEvent, MouseEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  ChevronDown,
  Eye,
  EyeOff,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type { Product } from "@/lib/products";
import {
  createMovementForm,
  movementLabels,
  movementReasonOptions,
  saveStockMovement,
  type MovementType,
  type StockMovement,
  type StockMovementFormState,
} from "@/lib/stock-movements";

type AdminInventoryManagerProps = {
  products: Product[];
};

type InventoryFilter = "all" | "available" | "outOfStock" | "web" | "hidden";

type ProductFormState = {
  name: string;
  reference: string;
  category: Product["category"];
  productClass: string;
  details: string;
  cost: string;
  salePrice: string;
  stock: string;
  visible: boolean;
  image: string;
};

type ActionMenuState = {
  product: Product;
  top: number;
  left: number;
};

const filters: Array<{ label: string; value: InventoryFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Agotados", value: "outOfStock" },
  { label: "En web", value: "web" },
  { label: "Ocultos", value: "hidden" },
];

const categoryOptions: Product["category"][] = [
  "Muebles",
  "Electrodomésticos",
  "Colchones",
  "Audio y video",
];

const fallbackImage =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80";

function createEmptyForm(): ProductFormState {
  return {
    name: "",
    reference: "",
    category: "Muebles",
    productClass: "",
    details: "",
    cost: "",
    salePrice: "",
    stock: "1",
    visible: true,
    image: "",
  };
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    reference: product.reference,
    category: product.category,
    productClass: product.productClass,
    details: product.details,
    cost: String(product.cost),
    salePrice: String(product.salePrice),
    stock: String(product.stock),
    visible: product.visible,
    image: product.image,
  };
}

function createCategoryId(category: string) {
  return `inventario-${category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase()}`;
}

function createProductId(name: string, existingProducts: Product[]) {
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

function formToProduct(
  form: ProductFormState,
  existingProducts: Product[],
  currentId?: string
): Product {
  return {
    id: currentId ?? createProductId(form.name, existingProducts),
    name: form.name.trim(),
    reference: form.reference.trim(),
    category: form.category,
    productClass: form.productClass.trim(),
    details: form.details.trim(),
    cost: Number(form.cost),
    salePrice: Number(form.salePrice),
    stock: Number(form.stock),
    visible: form.visible,
    image: form.image.trim() || fallbackImage,
  };
}

export function AdminInventoryManager({ products }: AdminInventoryManagerProps) {
  const [inventory, setInventory] = useState<Product[]>(products);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("all");
  const [productForm, setProductForm] = useState<ProductFormState>(
    createEmptyForm()
  );
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockMovementForm, setStockMovementForm] =
    useState<StockMovementFormState>(createMovementForm());
  const [stockError, setStockError] = useState("");
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [notice, setNotice] = useState("");

  const totalProducts = inventory.length;
  const outOfStock = inventory.filter((product) => product.stock === 0).length;
  const visibleProducts = inventory.filter(
    (product) => product.visible && product.stock > 0
  ).length;

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
            visible: items.filter(
              (product) => product.visible && product.stock > 0
            ).length,
          };
        }
      ),
    [filteredProducts]
  );

  function openCreateForm() {
    setEditingProductId(null);
    setProductForm(createEmptyForm());
    setIsProductFormOpen(true);
    setNotice("");
  }

  function openEditForm(product: Product) {
    setActionMenu(null);
    setEditingProductId(product.id);
    setProductForm(productToForm(product));
    setIsProductFormOpen(true);
    setNotice("");
  }

  function closeProductForm() {
    setIsProductFormOpen(false);
    setEditingProductId(null);
    setProductForm(createEmptyForm());
  }

  function openStockForm(product: Product) {
    setActionMenu(null);
    setStockProduct(product);
    setStockMovementForm(createMovementForm());
    setStockError("");
    setNotice("");
  }

  function toggleVisibility(product: Product) {
    setActionMenu(null);
    setInventory((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id ? { ...item, visible: !item.visible } : item
      )
    );
    setNotice(
      product.visible
        ? `${product.name} quedó oculto del catálogo.`
        : `${product.name} quedó visible en el catálogo.`
    );
  }

  function toggleActionMenu(
    event: MouseEvent<HTMLButtonElement>,
    product: Product
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;

    setActionMenu((currentMenu) =>
      currentMenu?.product.id === product.id
        ? null
        : {
            product,
            top: rect.bottom + 8,
            left: Math.max(
              12,
              Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
            ),
          }
    );
  }

  function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const savedProduct = formToProduct(
      productForm,
      inventory,
      editingProductId ?? undefined
    );

    if (editingProductId) {
      setInventory((currentProducts) =>
        currentProducts.map((product) =>
          product.id === editingProductId ? savedProduct : product
        )
      );
      setNotice(`${savedProduct.name} fue actualizado.`);
    } else {
      setInventory((currentProducts) => [savedProduct, ...currentProducts]);
      setNotice(`${savedProduct.name} fue agregado al inventario.`);
    }

    closeProductForm();
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

    const movement: StockMovement = {
      id: `${stockProduct.id}-${Date.now()}`,
      productName: stockProduct.name,
      productReference: stockProduct.reference,
      type: stockMovementForm.type,
      quantity,
      previousStock,
      nextStock,
      reason: stockMovementForm.reason,
      note: stockMovementForm.note.trim(),
      createdAt: new Date().toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      user: "Administrador",
    };

    setInventory((currentProducts) =>
      currentProducts.map((product) =>
        product.id === stockProduct.id ? { ...product, stock: nextStock } : product
      )
    );
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
          <span>Visibles en web</span>
          <strong>{visibleProducts}</strong>
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
          <button
            className="primaryButton inventoryCreateButton"
            type="button"
            onClick={openCreateForm}
          >
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

        {notice ? (
          <p className="inventoryNotice" aria-live="polite">
            <span>{notice}</span>
            <Link href="/admin/movimientos">Ver movimientos</Link>
          </p>
        ) : null}

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
            Movimiento
          </span>
        </div>

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
                            <span className="priceStack">
                              <span>
                                Costo: {product.cost.toLocaleString("es-CO")}
                              </span>
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
                          <td className="actionsCell">
                            <button
                              className={
                                actionMenu?.product.id === product.id
                                  ? "manageButton active"
                                  : "manageButton"
                              }
                              type="button"
                              onClick={(event) => toggleActionMenu(event, product)}
                            >
                              Gestionar
                              <ChevronDown size={15} />
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

      {actionMenu ? (
        <>
          <button
            className="floatingMenuBackdrop"
            type="button"
            aria-label="Cerrar menú de gestión"
            onClick={() => setActionMenu(null)}
          />
          <div
            className="manageMenuContent floatingManageMenu"
            style={{ left: actionMenu.left, top: actionMenu.top }}
          >
            <button
              className="manageMenuItem"
              type="button"
              onClick={() => openEditForm(actionMenu.product)}
            >
              <Pencil size={16} />
              Editar producto
            </button>
            <button
              className="manageMenuItem"
              type="button"
              onClick={() => toggleVisibility(actionMenu.product)}
            >
              {actionMenu.product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {actionMenu.product.visible ? "Ocultar de la web" : "Publicar en la web"}
            </button>
            <button
              className="manageMenuItem"
              type="button"
              onClick={() => openStockForm(actionMenu.product)}
            >
              <RotateCcw size={16} />
              Registrar movimiento
            </button>
          </div>
        </>
      ) : null}

      {isProductFormOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form className="adminModal" onSubmit={handleProductSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">
                  {editingProductId ? "Editar producto" : "Nuevo producto"}
                </p>
                <h2>{editingProductId ? productForm.name : "Registrar producto"}</h2>
              </div>
              <button
                className="modalClose"
                type="button"
                aria-label="Cerrar"
                onClick={closeProductForm}
              >
                <X size={20} />
              </button>
            </div>

            <div className="adminFormGrid">
              <label>
                Nombre
                <input
                  required
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm({ ...productForm, name: event.target.value })
                  }
                />
              </label>
              <label>
                Referencia
                <input
                  required
                  value={productForm.reference}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      reference: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Tipo
                <select
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value as Product["category"],
                    })
                  }
                >
                  {categoryOptions.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Clase
                <input
                  required
                  placeholder="Sala, televisor, nevera..."
                  value={productForm.productClass}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      productClass: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Costo
                <input
                  min="0"
                  required
                  type="number"
                  value={productForm.cost}
                  onChange={(event) =>
                    setProductForm({ ...productForm, cost: event.target.value })
                  }
                />
              </label>
              <label>
                Precio venta
                <input
                  min="0"
                  required
                  type="number"
                  value={productForm.salePrice}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      salePrice: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Cantidad
                <input
                  min="0"
                  required
                  type="number"
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm({ ...productForm, stock: event.target.value })
                  }
                />
              </label>
              <label>
                Imagen
                <input
                  placeholder="URL de la imagen"
                  value={productForm.image}
                  onChange={(event) =>
                    setProductForm({ ...productForm, image: event.target.value })
                  }
                />
              </label>
              <label className="adminFormWide">
                Detalles
                <textarea
                  required
                  rows={3}
                  value={productForm.details}
                  onChange={(event) =>
                    setProductForm({ ...productForm, details: event.target.value })
                  }
                />
              </label>
              <label className="checkRow adminFormWide">
                <input
                  checked={productForm.visible}
                  type="checkbox"
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      visible: event.target.checked,
                    })
                  }
                />
                Mostrar en catálogo web
              </label>
            </div>

            <div className="modalActions">
              <button className="secondaryButton" type="button" onClick={closeProductForm}>
                Cancelar
              </button>
              <button className="primaryButton" type="submit">
                Guardar producto
              </button>
            </div>
          </form>
        </div>
      ) : null}

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
                onClick={() => {
                  setStockProduct(null);
                  setStockError("");
                }}
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
                onClick={() => {
                  setStockProduct(null);
                  setStockError("");
                }}
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
