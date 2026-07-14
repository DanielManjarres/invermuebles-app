import Link from "next/link";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export default function CatalogPage() {
  const visibleProducts = products.filter((product) => product.visible);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">
          Invermuebles
        </Link>
        <nav className="nav">
          <Link href="/carrito">Carrito</Link>
          <Link href="/admin">Panel</Link>
        </nav>
      </header>

      <section className="pageHeader">
        <p className="eyebrow">Catalogo web</p>
        <h1>Productos disponibles</h1>
        <p>
          Los precios se confirman directamente con el almacen por WhatsApp.
        </p>
      </section>

      <section className="section">
        <div className="productGrid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
