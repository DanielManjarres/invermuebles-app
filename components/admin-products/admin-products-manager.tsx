"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, PackagePlus, Pencil, Search, Trash2, X } from "lucide-react";
import type {
  CatalogCategory,
  CatalogProductRecord,
} from "@/lib/catalog-products";
import { ProductFormModal } from "@/components/admin-products/product-form-modal";

type AdminProductsManagerProps = {
  categories: CatalogCategory[];
  products: CatalogProductRecord[];
};

function formatCurrency(value: number) {
  return `$ ${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

export function AdminProductsManager({
  categories,
  products,
}: AdminProductsManagerProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [editingProduct, setEditingProduct] =
    useState<CatalogProductRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [productToDelete, setProductToDelete] =
    useState<CatalogProductRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const stats = useMemo(() => {
    const variants = products.flatMap((product) => product.variants);
    return {
      lowStock: variants.filter(
        (variant) =>
          variant.stock > 0 && variant.stock <= variant.minimumStock,
      ).length,
      outOfStock: variants.filter((variant) => variant.stock === 0).length,
      variants: variants.length,
      visible: products.filter((product) => product.visible).length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return products.filter((product) => {
      if (categoryId !== "all" && product.categoryId !== categoryId) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        product.name,
        product.brand,
        product.model,
        product.categoryName,
        product.productTypeName,
        ...product.variants.flatMap((variant) => [variant.name, variant.reference]),
      ].some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery));
    });
  }, [categoryId, products, query]);

  async function deleteProduct() {
    if (!productToDelete) return;
    setDeleteError("");
    setIsDeleting(true);
    const response = await fetch(`/api/products/${productToDelete.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setIsDeleting(false);
    const result = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    if (!response?.ok) {
      setDeleteError(result.message ?? "No se pudo eliminar el producto.");
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <section className="statsGrid catalogProductStats">
        <div className="stat">
          <span>Total productos</span>
          <strong>{products.length}</strong>
        </div>
        <div className="stat">
          <span>Variantes</span>
          <strong>{stats.variants}</strong>
        </div>
        <div className="stat">
          <span>Visibles en catálogo</span>
          <strong>{stats.visible}</strong>
        </div>
        <div className="stat">
          <span>Bajo stock / agotadas</span>
          <strong>
            {stats.lowStock} / {stats.outOfStock}
          </strong>
        </div>
      </section>

      <section className="tableSection productsSection catalogProductsSection">
        <div className="sectionHeader productsSectionHeader">
          <div>
            <p className="eyebrow">Catálogo interno</p>
            <h2>Productos registrados</h2>
            <p>Administra productos y consulta sus variantes comerciales.</p>
          </div>
          <button
            className="primaryButton"
            type="button"
            onClick={() => setIsCreating(true)}
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
              placeholder="Buscar por producto, marca, modelo o referencia"
              type="search"
              value={query}
            />
          </label>
          <div className="inventoryFilters productCategoryFilters">
            <button
              className={categoryId === "all" ? "filterButton active" : "filterButton"}
              type="button"
              onClick={() => setCategoryId("all")}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                className={
                  categoryId === category.id ? "filterButton active" : "filterButton"
                }
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length ? (
          <div className="catalogProductList">
            {filteredProducts.map((product) => {
              const totalStock = product.variants.reduce(
                (total, variant) => total + variant.stock,
                0,
              );
              const defaultVariant =
                product.variants.find((variant) => variant.isDefault) ??
                product.variants[0];
              return (
                <article className="catalogProductRow" key={product.id}>
                  <div className="catalogProductIdentity">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" />
                    ) : (
                      <span className="catalogProductImagePlaceholder">
                        <PackagePlus size={22} />
                      </span>
                    )}
                    <div>
                      <div className="catalogProductBadges">
                        <span className={product.visible ? "available" : "unavailable"}>
                          {product.visible ? (
                            <Eye size={13} />
                          ) : (
                            <EyeOff size={13} />
                          )}
                          {product.visible ? "Publicado" : "Oculto"}
                        </span>
                        <span>{product.categoryName} / {product.productTypeName}</span>
                      </div>
                      <h3>{product.name}</h3>
                      <p>
                        {[product.brand, product.model].filter(Boolean).join(" · ") ||
                          "Sin marca ni modelo registrados"}
                      </p>
                    </div>
                  </div>

                  <div className="catalogProductSummary">
                    <div>
                      <span>Variantes</span>
                      <strong>{product.variants.length}</strong>
                    </div>
                    <div>
                      <span>Stock total</span>
                      <strong>{totalStock}</strong>
                    </div>
                    <div>
                      <span>Precio base</span>
                      <strong>
                        {defaultVariant ? formatCurrency(defaultVariant.salePrice) : "Sin variante"}
                      </strong>
                    </div>
                  </div>

                  <div className="catalogProductActions">
                    <button
                      className="secondaryButton"
                      type="button"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Pencil size={16} />
                      Editar datos
                    </button>
                    <button
                      className="dangerButton"
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setProductToDelete(product);
                      }}
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="emptyState">
            <PackagePlus size={34} />
            <strong>No se encontraron productos</strong>
            <span>Cambia la búsqueda o registra un producto nuevo.</span>
          </div>
        )}
      </section>

      {isCreating ? (
        <ProductFormModal categories={categories} onClose={() => setIsCreating(false)} />
      ) : null}
      {editingProduct ? (
        <ProductFormModal
          categories={categories}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      ) : null}

      {productToDelete ? (
        <div className="adminModalBackdrop" role="dialog" aria-modal="true">
          <div className="adminModal smallModal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Eliminar producto</p>
                <h2>{productToDelete.name}</h2>
              </div>
              <button
                className="modalClose"
                type="button"
                onClick={() => setProductToDelete(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>
              Esta acción es permanente y solo se permitirá si no existen pedidos,
              ventas ni movimientos posteriores al inventario inicial.
            </p>
            {deleteError ? <p className="formError">{deleteError}</p> : null}
            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setProductToDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                disabled={isDeleting}
                type="button"
                onClick={deleteProduct}
              >
                <Trash2 size={16} />
                {isDeleting ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
