"use client";

import { Check, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/use-cart";
import type { AdminSaleCartResult } from "@/components/use-admin-sale-cart";

type ProductCardProps = {
  actionLabel?: string;
  detailActionLabel?: string;
  onAdminSaleAdd?: (product: Product) => AdminSaleCartResult;
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
  const isAvailable = product.stock > 0;
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

  function handleAddToCart() {
    if (showAdminSaleAction && onAdminSaleAdd) {
      const result = onAdminSaleAdd(product);
      setCartFeedback(
        result.status === "added"
          ? "Producto agregado a venta local"
          : `Cantidad actualizada: ${result.quantity}`,
      );
      return;
    }

    const result = addItem({
      category: product.category,
      details: product.details,
      id: product.id,
      image: product.image,
      name: product.name,
      quantity: 1,
      reference: product.reference,
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
            <span className="tag">{product.category}</span>
            <h2>{product.name}</h2>
            <span className="reference">{product.reference}</span>
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
                  handleAddToCart();
                }}
              >
                {cartFeedback ? <Check size={17} /> : <ShoppingCart size={17} />}
                {cartFeedback
                  ? isAddedFeedback
                    ? "Agregado"
                    : "Actualizado"
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
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <article className="productDetailModal">
            <button
              className="modalClose productDetailClose"
              type="button"
              aria-label="Cerrar"
              onClick={() => setIsDetailOpen(false)}
            >
              <X size={20} />
            </button>
            <div className="productDetailImage">
              <img src={product.image} alt={product.name} />
            </div>
            <div className="productDetailInfo">
              <span className="tag">{product.category}</span>
              <h2>{product.name}</h2>
              <span className="reference">{product.reference}</span>
              <p>{product.details}</p>
              <dl className="productDetailList">
                <div>
                  <dt>Clase</dt>
                  <dd>{product.productClass}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{isAvailable ? "Disponible" : "Agotado"}</dd>
                </div>
              </dl>
              {showCartAction || showAdminSaleAction ? (
                <button
                  className={`primaryButton ${cartFeedback ? "cartButtonFeedback" : ""}`}
                  type="button"
                  disabled={!isAvailable}
                  onClick={handleAddToCart}
                >
                  {cartFeedback ? <Check size={17} /> : <ShoppingCart size={17} />}
                  {cartFeedback
                    ? isAddedFeedback
                      ? "Agregado al carrito"
                      : "Cantidad actualizada"
                    : detailActionLabel}
                </button>
              ) : null}
              {(showCartAction || showAdminSaleAction) && cartFeedback ? (
                <span className="cartFeedback productDetailFeedback" aria-live="polite">
                  {cartFeedback}
                </span>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
