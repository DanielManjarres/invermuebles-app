"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { whatsappUrl } from "@/lib/company";
import { useAdminSaleCart } from "@/components/use-admin-sale-cart";

type CatalogBrowserProps = {
  mode?: "public" | "admin";
  products: Product[];
};

const allCategories = "Todos";
const productsPerPage = 20;

function getCatalogCategory(product: Product) {
  return product.catalogCategory || product.category;
}

export function CatalogBrowser({ mode = "public", products }: CatalogBrowserProps) {
  const isAdmin = mode === "admin";
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);
  const [activeCategory, setActiveCategory] = useState(allCategories);
  const [currentPage, setCurrentPage] = useState(1);
  const adminSaleCart = useAdminSaleCart(catalogProducts);

  useEffect(() => {
    setCatalogProducts(products);
  }, [products]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, catalogProducts]);

  const availableProducts = useMemo(
    () => catalogProducts.filter((product) => product.visible && product.stock > 0),
    [catalogProducts]
  );

  const categories = useMemo(
    () => [
      allCategories,
      ...Array.from(new Set(availableProducts.map(getCatalogCategory))),
    ],
    [availableProducts]
  );

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory(allCategories);
    }
  }, [activeCategory, categories]);

  const filteredProducts =
    activeCategory === allCategories
      ? availableProducts
      : availableProducts.filter(
          (product) => getCatalogCategory(product) === activeCategory,
        );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

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
              onClick={() => {
                setActiveCategory(category);
                setCurrentPage(1);
              }}
            >
              {category}
            </button>
          ))}
        </div>
        {isAdmin ? (
          <Link className="adminSaleCartHint" href="/admin/ventas">
            <ShoppingCart size={18} />
            Venta local
            {adminSaleCart.totalQuantity > 0 ? (
              <span>{adminSaleCart.totalQuantity}</span>
            ) : null}
          </Link>
        ) : (
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
        {paginatedProducts.map((product) => (
          <ProductCard
            key={product.id}
            actionLabel="Agregar a venta"
            detailActionLabel="Agregar a venta local"
            onAdminSaleAdd={adminSaleCart.addProduct}
            product={product}
            showAdminSaleAction={isAdmin}
            showCartAction={!isAdmin}
          />
        ))}
      </div>

      {filteredProducts.length > productsPerPage ? (
        <div className="catalogPagination">
          <span>
            Mostrando {paginatedProducts.length} de {filteredProducts.length} productos
          </span>
          <div className="paginationControls">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
