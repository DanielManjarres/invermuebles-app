"use client";

import { ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/use-cart";

type ProductCardProps = {
  product: Product;
  showCartAction?: boolean;
};

function createSummary(details: string) {
  const firstSentence = details.split(".")[0]?.trim();
  const summary = firstSentence && firstSentence.length >= 35 ? firstSentence : details;

  return summary.length > 120 ? `${summary.slice(0, 117).trim()}...` : summary;
}

export function ProductCard({
  product,
  showCartAction = true,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isAvailable = product.stock > 0;
  const productSummary = createSummary(product.details);

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
            {showCartAction ? (
              <button
                className="iconTextButton"
                type="button"
                disabled={!isAvailable}
                onClick={(event) => {
                  event.stopPropagation();
                  addItem({
                    category: product.category,
                    details: product.details,
                    id: product.id,
                    image: product.image,
                    name: product.name,
                    reference: product.reference,
                  });
                }}
              >
                <ShoppingCart size={17} />
                Agregar
              </button>
            ) : (
              <span className="detailsHint">Ver detalle</span>
            )}
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
              {showCartAction ? (
                <button
                  className="primaryButton"
                  type="button"
                  disabled={!isAvailable}
                  onClick={() =>
                    addItem({
                      category: product.category,
                      details: product.details,
                      id: product.id,
                      image: product.image,
                      name: product.name,
                      reference: product.reference,
                    })
                  }
                >
                  <ShoppingCart size={17} />
                  Agregar al carrito
                </button>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
