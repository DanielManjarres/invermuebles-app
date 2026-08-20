"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Layers3,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type {
  CatalogCategory,
  CatalogProductRecord,
  CatalogProductVariant,
} from "@/lib/catalog-products";
import { ProductFormModal } from "@/components/admin-products/product-form-modal";
import { VariantFormModal } from "@/components/admin-products/variant-form-modal";
import { TaxonomyManager } from "@/components/admin-products/taxonomy-manager";
import { MAX_FEATURED_PRODUCTS } from "@/lib/featured-product-policy";

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [editingProduct, setEditingProduct] =
    useState<CatalogProductRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [managingProduct, setManagingProduct] =
    useState<CatalogProductRecord | null>(null);
  const [editingVariant, setEditingVariant] =
    useState<CatalogProductVariant | null>(null);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [productToDelete, setProductToDelete] =
    useState<CatalogProductRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [featuredProductId, setFeaturedProductId] = useState<string | null>(null);
  const [featuredError, setFeaturedError] = useState("");

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
      featured: products.filter((product) => product.featured).length,
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
  const managingProductType = useMemo(() => {
    if (!managingProduct) return null;
    return categories
      .find((category) => category.id === managingProduct.categoryId)
      ?.productTypes.find(
        (productType) => productType.id === managingProduct.productTypeId,
      );
  }, [categories, managingProduct]);

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

  async function toggleFeatured(product: CatalogProductRecord) {
    setFeaturedError("");
    setFeaturedProductId(product.id);
    const response = await fetch(`/api/products/${product.id}/featured`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !product.featured }),
    }).catch(() => null);
    const result = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    setFeaturedProductId(null);
    if (!response?.ok) {
      setFeaturedError(result.message ?? "No se pudo actualizar el producto destacado.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <TaxonomyManager categories={categories} />
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
            <p>
              Administra productos y consulta sus variantes comerciales. Destacados en
              inicio: {stats.featured} de {MAX_FEATURED_PRODUCTS}.
            </p>
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

        {featuredError ? <p className="formMessage error">{featuredError}</p> : null}

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
                        {product.featured ? (
                          <span className="available">
                            <Star size={13} />
                            En inicio
                          </span>
                        ) : null}
                        {!product.productTypeId ? (
                          <span className="unavailable">Pendiente de migración</span>
                        ) : null}
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
                      disabled={!product.visible || featuredProductId === product.id}
                      title={
                        product.visible
                          ? undefined
                          : "Publica el producto antes de destacarlo en el inicio."
                      }
                      type="button"
                      onClick={() => void toggleFeatured(product)}
                    >
                      <Star size={16} />
                      {featuredProductId === product.id
                        ? "Guardando"
                        : product.featured
                          ? "Quitar de inicio"
                          : "Destacar en inicio"}
                    </button>
                    <button
                      className="secondaryButton"
                      type="button"
                      onClick={() => {
                        setEditingVariant(null);
                        setManagingProduct(product);
                      }}
                    >
                      <Layers3 size={16} />
                      Variantes
                    </button>
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

        {managingProduct ? (
          <section className="catalogVariantManager">
            <div className="catalogVariantHeader">
              <div>
                <p className="eyebrow">Variantes de {managingProduct.name}</p>
                <h3>Presentaciones del producto</h3>
                <p>
                  Los cambios de stock se realizan desde Inventario para conservar el
                  historial.
                </p>
              </div>
              <div className="catalogVariantHeaderActions">
                <button
                  className="primaryButton"
                  disabled={!managingProductType}
                  type="button"
                  onClick={() => setIsCreatingVariant(true)}
                >
                  <Plus size={16} />
                  Nueva variante
                </button>
                <button
                  className="modalClose"
                  aria-label="Cerrar variantes"
                  type="button"
                  onClick={() => setManagingProduct(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="catalogVariantGrid">
              {managingProduct.variants.map((variant) => (
                <button
                  aria-label={`Editar variante ${variant.name}`}
                  className="catalogVariantCard"
                  key={variant.id}
                  type="button"
                  onClick={() => setEditingVariant(variant)}
                >
                  <span className="catalogVariantIdentity">
                    <strong>{variant.name}</strong>
                    <small>{variant.reference}</small>
                  </span>
                  <span className="catalogVariantMetric">
                    <small>Precio</small>
                    <strong>{formatCurrency(variant.salePrice)}</strong>
                  </span>
                  <span className="catalogVariantMetric">
                    <small>Stock</small>
                    <strong>{variant.stock}</strong>
                  </span>
                  <span className="catalogVariantBadges">
                    {variant.isDefault ? (
                      <span className="catalogVariantDefault">Predeterminada</span>
                    ) : null}
                    <span className={variant.active ? "available" : "unavailable"}>
                      {variant.active ? "Activa" : "Inactiva"}
                    </span>
                  </span>
                  <span className="catalogVariantEdit">
                    <Pencil size={16} />
                    Editar variante
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
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
      {managingProduct && managingProductType && isCreatingVariant ? (
        <VariantFormModal
          product={managingProduct}
          productType={managingProductType}
          onClose={() => setIsCreatingVariant(false)}
        />
      ) : null}
      {managingProduct && managingProductType && editingVariant ? (
        <VariantFormModal
          product={managingProduct}
          productType={managingProductType}
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
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
