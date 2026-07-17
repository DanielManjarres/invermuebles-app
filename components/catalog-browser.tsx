"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { whatsappUrl } from "@/lib/company";
import { readAdminProducts } from "@/lib/admin-products";

type CatalogBrowserProps = {
  mode?: "public" | "admin";
  products: Product[];
};

const allCategories = "Todos";

export function CatalogBrowser({ mode = "public", products }: CatalogBrowserProps) {
  const isAdmin = mode === "admin";
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);
  const [activeCategory, setActiveCategory] = useState(allCategories);

  useEffect(() => {
    setCatalogProducts(readAdminProducts(products));
  }, [products]);

  const availableProducts = useMemo(
    () => catalogProducts.filter((product) => product.visible && product.stock > 0),
    [catalogProducts]
  );

  const categories = useMemo(
    () => [
      allCategories,
      ...Array.from(new Set(availableProducts.map((product) => product.category))),
    ],
    [availableProducts]
  );

  const filteredProducts =
    activeCategory === allCategories
      ? availableProducts
      : availableProducts.filter((product) => product.category === activeCategory);

  return (
    <section className="catalogSection">
      <div className="catalogTools">
        <div className="filterGroup" aria-label="Filtrar por categoría">
          {categories.map((category) => (
            <button
              className={
                category === activeCategory ? "filterButton active" : "filterButton"
              }
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {isAdmin ? null : (
          <a
            className="whatsappHint"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} />
            Consultar por WhatsApp
          </a>
        )}
      </div>

      <div className="productGrid">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showCartAction={!isAdmin}
          />
        ))}
      </div>
    </section>
  );
}
