import Link from "next/link";
import { products } from "@/lib/products";
import { CatalogBrowser } from "@/components/catalog-browser";

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
        <p className="eyebrow">Catálogo web</p>
        <h1>Elige productos y continúa por WhatsApp</h1>
        <p>
          Los precios se confirman directamente con el almacén. Puedes filtrar
          por categoría y agregar productos al carrito para enviar la solicitud.
        </p>
      </section>

      <CatalogBrowser products={visibleProducts} />
    </main>
  );
}
