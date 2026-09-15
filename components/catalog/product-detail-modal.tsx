"use client";

import { Check, ShoppingCart, X, ZoomIn } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
import type { Product } from "@/lib/products";

type ProductDetailModalProps = {
  cartFeedback: string;
  detailActionLabel: string;
  isAvailable: boolean;
  onAdd: () => void;
  onClose: () => void;
  product: Product;
  showAction: boolean;
};

type ProductImageZoomProps = {
  image: string;
  name: string;
  onClose: () => void;
};

function ProductImageZoom({ image, name, onClose }: ProductImageZoomProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({ dialogRef, onClose });

  return (
    <div className="productImageZoomOverlay" onClick={onClose} role="presentation">
      <div
        aria-label={`Imagen ampliada de ${name}`}
        aria-modal="true"
        className="productImageZoomDialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Cerrar imagen ampliada"
          className="modalClose productImageZoomClose"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
        <img alt={name} src={image} />
      </div>
    </div>
  );
}

export function ProductDetailModal({
  cartFeedback,
  detailActionLabel,
  isAvailable,
  onAdd,
  onClose,
  product,
  showAction,
}: ProductDetailModalProps) {
  const isAddedFeedback =
    cartFeedback === "Producto agregado al carrito" ||
    cartFeedback === "Producto agregado a venta local";
  const plainDetails = product.details.replaceAll("**", "");
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

  useModalAccessibility({ active: !isImageZoomOpen, dialogRef, onClose });

  return (
    <div className="modalOverlay" role="presentation">
      <article
        aria-describedby={descriptionId}
        aria-hidden={isImageZoomOpen || undefined}
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
          <button
            aria-label={`Ampliar imagen de ${product.name}`}
            className="productDetailImageButton"
            onClick={() => setIsImageZoomOpen(true)}
            type="button"
          >
            <img src={product.image} alt={product.name} />
            <span>
              <ZoomIn size={16} />
              Ampliar imagen
            </span>
          </button>
        </div>
        <div className="productDetailInfo">
          <div className="productDetailScroll">
            <div className="productDetailSummary">
              <span className="tag">{product.catalogCategory || product.category}</span>
              <h2 id={titleId}>{product.name}</h2>
              <span className="reference">{product.reference}</span>
              <p id={descriptionId}>{plainDetails}</p>
              {product.attributes?.length ? (
                <span className="productAttributes">
                  {product.attributes
                    .map(
                      (attribute) =>
                        `${attribute.name}: ${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ""}`,
                    )
                    .join(" · ")}
                </span>
              ) : null}
            </div>
            <div className="productDetailPurchase">
              <dl className="productDetailList">
                <div>
                  <dt>Clase</dt>
                  <dd>{product.productClass}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    {isAvailable ? "Disponible" : "Agotado"}
                  </dd>
                </div>
              </dl>
            </div>
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
      {isImageZoomOpen ? (
        <ProductImageZoom
          image={product.image}
          name={product.name}
          onClose={() => setIsImageZoomOpen(false)}
        />
      ) : null}
    </div>
  );
}
