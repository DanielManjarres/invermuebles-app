import { AdminProductsManager } from "@/components/admin-products-manager";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getProducts } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <SiteHeader active="productos" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Gestión de productos</h1>
            <p>
              Administra la información del catálogo: tipo, clase, referencia,
              precios, detalles y visibilidad en la web.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminProductsManager products={products} />
    </main>
  );
}
