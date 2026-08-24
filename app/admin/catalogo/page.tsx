import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { LogoutButton } from "@/components/auth/logout-button";
import { SiteHeader } from "@/components/layout/site-header";
import { getProducts } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const products = await getProducts({ availableOnly: true, visibleOnly: true });

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
