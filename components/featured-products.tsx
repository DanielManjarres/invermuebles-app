"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

type FeaturedProductsProps = {
  products: Product[];
};

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);

  useEffect(() => {
    setCatalogProducts(products);
  }, [products]);

  const featured = useMemo(
    () =>
      catalogProducts
        .filter(
          (product) => product.featured && product.visible && product.stock > 0,
        )
        .slice(0, 6),
    [catalogProducts]
  );

  return (
    <div className="productGrid">
      {featured.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
