"use client";

import { Check, ShoppingCart, X } from "lucide-react";
import { useId, useRef } from "react";
import { SelectMenu } from "@/components/ui/select-menu";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import type { Product, ProductInventoryVariant } from "@/lib/products";

type ProductDetailModalProps = {
  cartFeedback: string;
  detailActionLabel: string;
  isAvailable: boolean;
  onAdd: () => void;
  onClose: () => void;
  onVariantChange: (variantId: string) => void;
  product: Product;
  selectableVariants: ProductInventoryVariant[];
  selectedVariant?: ProductInventoryVariant;
  showAction: boolean;
};

export function ProductDetailModal({
  cartFeedback,
  detailActionLabel,
  isAvailable,
  onAdd,
  onClose,
  onVariantChange,
  product,
  selectableVariants,
  selectedVariant,
  showAction,
}: ProductDetailModalProps) {
  const usesVariantSelection = selectableVariants.length > 0;
  const isAddedFeedback =
    cartFeedback === "Producto agregado al carrito" ||
    cartFeedback === "Producto agregado a venta local";
  const variantOptions = selectableVariants
    .filter((variant) => variant.stock > 0)
    .map((variant) => ({
      label: `${variant.name} · ${variant.stock} disponible(s)`,
      value: variant.id,
    }));
  const plainDetails = product.details.replaceAll("**", "");
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalAccessibility({ dialogRef, onClose });

  return (
    <div className="modalOverlay" role="presentation">
      <article
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="productDetailModal"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          className="modalClose productDetailClose"
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="productDetailImage">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="productDetailInfo">
          <div className="productDetailScroll">
            <span className="tag">{product.catalogCategory || product.category}</span>
            <h2 id={titleId}>{product.name}</h2>
            {usesVariantSelection ? (
              selectedVariant ? (
                <span className="reference">{selectedVariant.reference}</span>
              ) : null
            ) : (
              <span className="reference">{product.reference}</span>
            )}
            <p id={descriptionId}>{plainDetails}</p>
            {usesVariantSelection ? (
              <label className="productVariantSelector">
                Presentación
                <SelectMenu
                  disabled={variantOptions.length === 0}
                  onChange={onVariantChange}
                  options={variantOptions}
                  placeholder="Selecciona una presentación"
                  value={selectedVariant?.id ?? ""}
                />
                {selectedVariant?.attributes.length ? (
                  <span className="productVariantAttributes">
                    {selectedVariant.attributes
                      .map(
                        (attribute) =>
                          `${attribute.name}: ${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ""}`,
                      )
                      .join(" · ")}
                  </span>
                ) : null}
              </label>
            ) : null}
            <dl className="productDetailList">
              <div>
                <dt>Clase</dt>
                <dd>{product.productClass}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {usesVariantSelection && !selectedVariant
                    ? "Selecciona una presentación"
                    : isAvailable
                      ? "Disponible"
                      : "Agotado"}
                </dd>
              </div>
            </dl>
          </div>
          {showAction ? (
            <div className="productDetailActions">
              <button
                className={`primaryButton ${cartFeedback ? "cartButtonFeedback" : ""}`}
                type="button"
                disabled={!isAvailable}
                onClick={onAdd}
              >
                {cartFeedback ? <Check size={17} /> : <ShoppingCart size={17} />}
                {cartFeedback
                  ? isAddedFeedback
                    ? "Agregado al carrito"
                    : "Cantidad actualizada"
                  : detailActionLabel}
              </button>
              {cartFeedback ? (
                <span className="cartFeedback productDetailFeedback" aria-live="polite">
                  {cartFeedback}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
