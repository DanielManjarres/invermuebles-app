import { Check, ShoppingCart, X } from "lucide-react";
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

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <article className="productDetailModal">
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
          <span className="tag">{product.catalogCategory || product.category}</span>
          <h2>{product.name}</h2>
          <span className="reference">
            {usesVariantSelection
              ? selectedVariant?.reference ?? product.reference
              : product.reference}
          </span>
          <p>{product.details}</p>
          {usesVariantSelection ? (
            <label className="productVariantSelector">
              Presentación
              <select
                value={selectedVariant?.id ?? ""}
                onChange={(event) => onVariantChange(event.target.value)}
              >
                {selectableVariants.map((variant) => (
                  <option
                    disabled={variant.stock <= 0}
                    key={variant.id}
                    value={variant.id}
                  >
                    {variant.name} · {variant.reference} · {variant.stock} disponible(s)
                  </option>
                ))}
              </select>
              {selectedVariant?.attributes.length ? (
                <span>
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
              <dd>{isAvailable ? "Disponible" : "Agotado"}</dd>
            </div>
          </dl>
          {showAction ? (
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
          ) : null}
          {showAction && cartFeedback ? (
            <span className="cartFeedback productDetailFeedback" aria-live="polite">
              {cartFeedback}
            </span>
          ) : null}
        </div>
      </article>
    </div>
  );
}
