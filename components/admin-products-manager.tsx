"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  PackagePlus,
  Pencil,
  Search,
  Shapes,
  X,
} from "lucide-react";
import {
  createProductId,
  readAdminProducts,
  saveAdminProducts,
} from "@/lib/admin-products";
import type { Product } from "@/lib/products";
import { createStockMovement, saveStockMovement } from "@/lib/stock-movements";

type AdminProductsManagerProps = {
  products: Product[];
};

type ProductFormState = {
  name: string;
  reference: string;
  category: string;
  productClass: string;
  details: string;
  cost: string;
  salePrice: string;
  stock: string;
  visible: boolean;
  image: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80";

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanReference(value: string) {
  return cleanText(value).toUpperCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO");
}

function isValidImageSource(value: string) {
  const image = value.trim();

  if (!image) {
    return true;
  }

  if (image.startsWith("/") && !image.startsWith("//") && !/\s/.test(image)) {
    return true;
  }

  try {
    const url = new URL(image);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProductForm(
  form: ProductFormState,
  products: Product[],
  editingProductId: string | null
) {
  const requiredFields = [
    form.name,
    form.reference,
    form.category,
    form.productClass,
    form.details,
  ];

  if (requiredFields.some((field) => cleanText(field).length === 0)) {
    return "Completa los datos principales del producto.";
  }

  if (cleanText(form.category).toLowerCase() === "todos") {
    return "Usa un tipo de producto real, por ejemplo Muebles o Electrodomésticos.";
  }

  const cost = Number(form.cost);
  const salePrice = Number(form.salePrice);
  const stock = Number(form.stock);

  if (![cost, salePrice, stock].every(Number.isFinite)) {
    return "Costo, precio y stock deben ser números válidos.";
  }

  if (cost < 0 || salePrice < 0 || stock < 0) {
    return "Los valores y el stock no pueden ser negativos.";
  }

  if (!Number.isInteger(stock)) {
    return "El stock debe ser un número entero.";
  }

  if (salePrice < cost) {
    return "El precio de venta no debería ser menor que el costo.";
  }

  if (!isValidImageSource(form.image)) {
    return "La imagen debe ser una URL válida o una ruta interna como /productos/foto.jpg.";
  }

  const reference = cleanReference(form.reference);
  const duplicateReference = products.some(
    (product) =>
      cleanReference(product.reference) === reference &&
      product.id !== editingProductId
  );

  if (duplicateReference) {
    return "Ya existe un producto con esa referencia.";
  }

  return "";
}

function createEmptyForm(): ProductFormState {
  return {
    name: "",
    reference: "",
    category: "",
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

function formToProduct(
  form: ProductFormState,
  existingProducts: Product[],
  currentId?: string
): Product {
  return {
    id: currentId ?? createProductId(cleanText(form.name), existingProducts),
    name: cleanText(form.name),
    reference: cleanReference(form.reference),
    category: cleanText(form.category),
    productClass: cleanText(form.productClass),
    details: cleanText(form.details),
    cost: Number(form.cost),
    salePrice: Number(form.salePrice),
    stock: Number(form.stock),
    visible: form.visible,
    image: form.image.trim() || fallbackImage,
  };
}

export function AdminProductsManager({ products }: AdminProductsManagerProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [productForm, setProductForm] = useState<ProductFormState>(
    createEmptyForm()
  );
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setProductList(readAdminProducts(products));
  }, [products]);

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(productList.map((product) => product.category)))],
    [productList]
  );

  const productClasses = useMemo(
    () => Array.from(new Set(productList.map((product) => product.productClass))),
    [productList]
  );

  const formCost = Number(productForm.cost);
  const formSalePrice = Number(productForm.salePrice);
  const hasValidPrices = Number.isFinite(formCost) && Number.isFinite(formSalePrice);
  const estimatedProfit = hasValidPrices ? formSalePrice - formCost : 0;
  const estimatedMargin =
    hasValidPrices && formSalePrice > 0
      ? Math.round((estimatedProfit / formSalePrice) * 100)
      : 0;
  const imagePreview =
    isValidImageSource(productForm.image) && productForm.image.trim()
      ? productForm.image.trim()
      : fallbackImage;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return productList.filter((product) => {
      const matchesCategory =
        activeCategory === "Todos" || product.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          product.name,
          product.reference,
          product.category,
          product.productClass,
          product.details,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, productList, query]);

  const visibleCatalogProducts = productList.filter(
    (product) => product.visible && product.stock > 0
  ).length;

  function persistProducts(nextProducts: Product[]) {
    setProductList(nextProducts);
    saveAdminProducts(nextProducts);
  }

  function openCreateForm() {
    setEditingProductId(null);
    setProductForm({
      ...createEmptyForm(),
      category: categories.find((category) => category !== "Todos") ?? "",
    });
    setIsProductFormOpen(true);
    setNotice("");
    setFormError("");
  }

  function openEditForm(product: Product) {
    setEditingProductId(product.id);
    setProductForm(productToForm(product));
    setIsProductFormOpen(true);
    setNotice("");
    setFormError("");
  }

  function closeProductForm() {
    setIsProductFormOpen(false);
    setEditingProductId(null);
    setProductForm(createEmptyForm());
    setFormError("");
  }

  function toggleVisibility(product: Product) {
    const nextProducts = productList.map((item) =>
      item.id === product.id ? { ...item, visible: !item.visible } : item
    );

    persistProducts(nextProducts);
    setNotice(
      product.visible
        ? `${product.name} quedó oculto del catálogo.`
        : `${product.name} quedó visible en el catálogo.`
    );
  }

  function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateProductForm(
      productForm,
      productList,
      editingProductId
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const previousProduct = productList.find(
      (product) => product.id === editingProductId
    );
    const savedProduct = formToProduct(
      productForm,
      productList,
      editingProductId ?? undefined
    );
    const productToSave = editingProductId
      ? { ...savedProduct, stock: previousProduct?.stock ?? savedProduct.stock }
      : savedProduct;

    if (editingProductId) {
      persistProducts(
        productList.map((product) =>
          product.id === editingProductId ? productToSave : product
        )
      );
      setNotice(`${productToSave.name} fue actualizado.`);
    } else {
      persistProducts([productToSave, ...productList]);
      setActiveCategory(productToSave.category);

      if (productToSave.stock > 0) {
        saveStockMovement(
          createStockMovement({
            product: productToSave,
            type: "adjustment",
            quantity: productToSave.stock,
            previousStock: 0,
            nextStock: productToSave.stock,
            reason: "Inventario inicial",
            note: "Producto creado desde gestión de productos",
          })
        );
      }

      setNotice(`${productToSave.name} fue agregado a productos.`);
    }

    closeProductForm();
  }

  return (
    <>
      <section className="statsGrid">
        <div className="stat">
          <PackagePlus size={22} />
          <span>Total productos</span>
          <strong>{productList.length}</strong>
        </div>
        <div className="stat">
          <Eye size={22} />
          <span>Visibles en catálogo</span>
          <strong>{visibleCatalogProducts}</strong>
        </div>
        <div className="stat">
          <Shapes size={22} />
          <span>Tipos registrados</span>
          <strong>{Math.max(categories.length - 1, 0)}</strong>
        </div>
      </section>

      <section className="tableSection productsSection">
        <div className="sectionHeader inventoryHeader productsSectionHeader">
          <div>
            <p className="eyebrow">Catálogo interno</p>
            <h2>Productos registrados</h2>
          </div>
          <button
            className="primaryButton inventoryCreateButton"
            type="button"
            onClick={openCreateForm}
          >
            <PackagePlus size={18} />
            Nuevo producto
          </button>
        </div>

        <div className="inventoryToolbar productsToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por producto, referencia, tipo o clase"
              type="search"
              value={query}
            />
          </label>

          <div
            className="inventoryFilters productCategoryFilters"
            aria-label="Filtros de productos"
          >
            {categories.map((category) => (
              <button
                className={
                  activeCategory === category ? "filterButton active" : "filterButton"
                }
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {notice ? (
          <p className="inventoryNotice" aria-live="polite">
            <span>{notice}</span>
          </p>
        ) : null}

        <div className="tableWrap">
          <table className="productAdminTable">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo / clase</th>
                <th>Referencia</th>
                <th>Valores</th>
                <th>Estado web</th>
                <th className="actionsHeader">Gestión</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td>
                    <strong>{product.category}</strong>
                    <span className="reference">{product.productClass}</span>
                  </td>
                  <td>{product.reference}</td>
                  <td>
                    <span className="valueStack">
                      <span>Costo: {formatCurrency(product.cost)}</span>
                      <span>Venta: {formatCurrency(product.salePrice)}</span>
                    </span>
                  </td>
                  <td>
                    <span className={product.visible ? "available" : "unavailable"}>
                      {product.visible ? "Publicado" : "Oculto"}
                    </span>
                  </td>
                  <td className="actionsCell productActionsCell">
                    <details className="rowActionMenu">
                      <summary>
                        Gestionar
                        <ChevronDown size={15} />
                      </summary>
                      <div className="rowActionMenuContent">
                        <button
                          className="rowActionMenuItem"
                          type="button"
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil size={16} />
                          Editar producto
                        </button>
                        <button
                          className="rowActionMenuItem"
                          type="button"
                          onClick={() => toggleVisibility(product)}
                        >
                          {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                          {product.visible ? "Ocultar de la web" : "Publicar en la web"}
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
              <div className="adminFormPreview adminFormWide">
                <div className="adminFormImagePreview">
                  <img src={imagePreview} alt="Vista previa del producto" />
                </div>
                <div>
                  <span className="previewLabel">Vista previa</span>
                  <strong>{productForm.name || "Nombre del producto"}</strong>
                  <span>{productForm.reference || "Referencia"}</span>
                  <p>
                    {productForm.image.trim()
                      ? "La imagen se usará en el catálogo web."
                      : "Si no agregas imagen, se usará una imagen temporal."}
                  </p>
                </div>
              </div>

              <label>
                Nombre
                <input
                  required
                  placeholder="Ej: Sala modular gris"
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
                  placeholder="Ej: MUE-001"
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
                Tipo / categoría
                <input
                  list="product-categories"
                  required
                  placeholder="Muebles, electrodomésticos..."
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                />
                <datalist id="product-categories">
                  {categories
                    .filter((category) => category !== "Todos")
                    .map((category) => (
                      <option key={category} value={category} />
                    ))}
                </datalist>
              </label>
              <label>
                Clase
                <input
                  list="product-classes"
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
                <datalist id="product-classes">
                  {productClasses.map((productClass) => (
                    <option key={productClass} value={productClass} />
                  ))}
                </datalist>
              </label>
              <label>
                Costo
                <input
                  min="0"
                  required
                  step="1"
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
                  step="1"
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
              {!editingProductId ? (
                <label>
                  Stock inicial
                  <input
                    min="0"
                    required
                    step="1"
                    type="number"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm({ ...productForm, stock: event.target.value })
                    }
                  />
                </label>
              ) : (
                <p className="formHint adminFormWide">
                  El stock de este producto se actualiza desde Inventario,
                  registrando una entrada, salida o ajuste.
                </p>
              )}
              <div className="adminFormWide priceSummary">
                <div>
                  <span>Utilidad estimada</span>
                  <strong>
                    {hasValidPrices ? formatCurrency(Math.max(estimatedProfit, 0)) : "0"}
                  </strong>
                </div>
                <div>
                  <span>Margen aproximado</span>
                  <strong>{hasValidPrices ? `${Math.max(estimatedMargin, 0)}%` : "0%"}</strong>
                </div>
              </div>
              <label>
                Imagen
                <input
                  placeholder="https://... o /productos/foto.jpg"
                  value={productForm.image}
                  onChange={(event) =>
                    setProductForm({ ...productForm, image: event.target.value })
                  }
                />
                <span className="fieldHint">
                  Puede ser una URL externa o una ruta interna guardada en public.
                </span>
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

            {formError ? <p className="formError">{formError}</p> : null}

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
    </>
  );
}
