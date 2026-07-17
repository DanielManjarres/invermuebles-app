import { CatalogBrowser } from "@/components/catalog-browser";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { products } from "@/lib/products";

export default function AdminCatalogPage() {
  return (
    <main>
      <SiteHeader active="adminCatalogo" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Vista del catálogo</h1>
            <p>
              Revisa cómo se presentan los productos publicados sin salir del
              panel administrativo.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <CatalogBrowser mode="admin" products={products} />
    </main>
  );
}
