"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart } from "@/components/use-cart";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const isAvailable = product.stock > 0;

  return (
    <article className="productCard">
      <div className="productImage">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="productInfo">
        <div>
          <span className="tag">{product.category}</span>
          <h2>{product.name}</h2>
          <span className="reference">{product.reference}</span>
          <p>{product.details}</p>
        </div>
        <div className="productFooter">
          <span className={isAvailable ? "available" : "unavailable"}>
            {isAvailable ? "Disponible" : "Agotado"}
          </span>
          <button
            className="iconTextButton"
            type="button"
            disabled={!isAvailable}
            onClick={() =>
              addItem({
                id: product.id,
                name: product.name,
                reference: product.reference,
              })
            }
          >
            <ShoppingCart size={17} />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
