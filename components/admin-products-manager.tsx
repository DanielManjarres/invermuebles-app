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
    id: currentId ?? createProductId(form.name, existingProducts),
    name: form.name.trim(),
    reference: form.reference.trim(),
    category: form.category.trim(),
    productClass: form.productClass.trim(),
    details: form.details.trim(),
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

  const visibleProducts = productList.filter((product) => product.visible).length;

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
  }

  function openEditForm(product: Product) {
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

    const savedProduct = formToProduct(
      productForm,
      productList,
      editingProductId ?? undefined
    );

    if (editingProductId) {
      persistProducts(
        productList.map((product) =>
          product.id === editingProductId ? savedProduct : product
        )
      );
      setNotice(`${savedProduct.name} fue actualizado.`);
    } else {
      persistProducts([savedProduct, ...productList]);
      setNotice(`${savedProduct.name} fue agregado a productos.`);
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
          <span>Visibles en web</span>
          <strong>{visibleProducts}</strong>
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
                <th>Precio venta</th>
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
                    {product.salePrice.toLocaleString("es-CO")}
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
                Stock inicial
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
    </>
  );
}
