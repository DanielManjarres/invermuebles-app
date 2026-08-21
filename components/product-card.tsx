"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";
import { ProductDetailModal } from "@/components/product-card/product-detail-modal";
import { useCart } from "@/components/use-cart";
import type { AdminSaleCartResult } from "@/components/use-admin-sale-cart";

type ProductCardProps = {
  actionLabel?: string;
  detailActionLabel?: string;
  onAdminSaleAdd?: (product: Product, variantId?: string) => AdminSaleCartResult;
  product: Product;
  showAdminSaleAction?: boolean;
  showCartAction?: boolean;
};

function createSummary(details: string) {
  const firstSentence = details.split(".")[0]?.trim();
  const summary = firstSentence && firstSentence.length >= 35 ? firstSentence : details;

  return summary.length > 90 ? `${summary.slice(0, 87).trim()}...` : summary;
}

export function ProductCard({
  actionLabel = "Agregar",
  detailActionLabel = "Agregar al carrito",
  onAdminSaleAdd,
  product,
  showAdminSaleAction = false,
  showCartAction = true,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [cartFeedback, setCartFeedback] = useState("");
  const selectableVariants = (product.variants ?? []).filter(
    (variant) => variant.active,
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const selectedVariant = selectableVariants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const usesVariantSelection = selectableVariants.length > 0;
  const isAvailable = usesVariantSelection
    ? selectableVariants.some((variant) => variant.stock > 0)
    : product.stock > 0;
  const isSelectedVariantAvailable = usesVariantSelection
    ? Boolean(selectedVariant && selectedVariant.stock > 0)
    : product.stock > 0;
  const productSummary = createSummary(product.details);
  const isAddedFeedback =
    cartFeedback === "Producto agregado al carrito" ||
    cartFeedback === "Producto agregado a venta local";

  useEffect(() => {
    if (!cartFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => setCartFeedback(""), 1800);

    return () => window.clearTimeout(timeout);
  }, [cartFeedback]);

  useEffect(() => {
    setSelectedVariantId("");
    setCartFeedback("");
  }, [product.id]);

  function handleAddToCart() {
    if (usesVariantSelection && !selectedVariant) {
      setIsDetailOpen(true);
      return;
    }

    if (showAdminSaleAction && onAdminSaleAdd) {
      const result = onAdminSaleAdd(product, selectedVariant?.id);
      if (result.status === "requires-variant") {
        setCartFeedback("Selecciona una presentación");
        setIsDetailOpen(true);
        return;
      }
      setCartFeedback(
        result.status === "added"
          ? "Producto agregado a venta local"
          : `Cantidad actualizada: ${result.quantity}`,
      );
      return;
    }

    const result = addItem({
      category: product.catalogCategory || product.category,
      details: product.details,
      id: selectedVariant?.id ?? product.id,
      image: product.image,
      name: product.name,
      productId: product.id,
      quantity: 1,
      reference: selectedVariant?.reference ?? product.reference,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
    });

    setCartFeedback(
      result.status === "added"
        ? "Producto agregado al carrito"
        : `Cantidad actualizada: ${result.quantity}`,
    );
  }

  return (
    <>
      <article
        className="productCard"
        role="button"
        tabIndex={0}
        onClick={() => setIsDetailOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsDetailOpen(true);
          }
        }}
      >
        <div className="productImage">
          <img src={product.image} alt={product.name} loading="lazy" />
        </div>
        <div className="productInfo">
          <div>
            <span className="tag">{product.catalogCategory || product.category}</span>
            <h2>{product.name}</h2>
            <span className="reference">
              {usesVariantSelection
                ? selectedVariant?.reference ?? product.reference
                : product.reference}
            </span>
            <p>{productSummary}</p>
          </div>
          <div className="productFooter">
            <span className={isAvailable ? "available" : "unavailable"}>
              {isAvailable ? "Disponible" : "Agotado"}
            </span>
            {showCartAction || showAdminSaleAction ? (
              <button
                className={`iconTextButton ${cartFeedback ? "cartButtonFeedback" : ""}`}
                type="button"
                disabled={!isAvailable}
                onClick={(event) => {
                  event.stopPropagation();
                  if (usesVariantSelection) {
                    setIsDetailOpen(true);
                  } else {
                    handleAddToCart();
                  }
                }}
              >
                {cartFeedback ? <Check size={17} /> : <ShoppingCart size={17} />}
                {cartFeedback
                  ? isAddedFeedback
                    ? "Agregado"
                    : "Actualizado"
                  : usesVariantSelection
                    ? showAdminSaleAction
                      ? "Elegir presentación"
                      : "Ver producto"
                    : actionLabel}
              </button>
            ) : (
              <span className="detailsHint">Ver detalle</span>
            )}
            {(showCartAction || showAdminSaleAction) && cartFeedback ? (
              <span className="cartFeedback" aria-live="polite">
                {cartFeedback}
              </span>
            ) : null}
          </div>
        </div>
      </article>

      {isDetailOpen ? (
        <ProductDetailModal
          cartFeedback={cartFeedback}
          detailActionLabel={detailActionLabel}
          isAvailable={isSelectedVariantAvailable}
          onAdd={handleAddToCart}
          onClose={() => setIsDetailOpen(false)}
          onVariantChange={(variantId) => {
            setSelectedVariantId(variantId);
            setCartFeedback("");
          }}
          product={product}
          selectableVariants={selectableVariants}
          selectedVariant={selectedVariant}
          showAction={showCartAction || showAdminSaleAction}
        />
      ) : null}
    </>
  );
}
