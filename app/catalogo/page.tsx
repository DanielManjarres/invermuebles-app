import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getProducts } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await getProducts({ availableOnly: true, visibleOnly: true });

  return (
    <main>
      <SiteHeader active="catalogo" />

      <section className="pageHeader">
        <p className="eyebrow">Catálogo web</p>
        <h1>Elige productos y continúa por WhatsApp</h1>
        <p>
          Los precios, disponibilidad y forma de pago se confirman directamente
          con el almacén. Puedes filtrar por categoría y agregar productos al
          carrito para enviar la solicitud por WhatsApp.
        </p>
      </section>

      <CatalogBrowser products={products} />
      <SiteFooter />
    </main>
  );
}
