import { products } from "@/lib/products";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";

export default function CatalogPage() {
  const visibleProducts = products.filter((product) => product.visible);

  return (
    <main>
      <SiteHeader active="catalogo" />

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
