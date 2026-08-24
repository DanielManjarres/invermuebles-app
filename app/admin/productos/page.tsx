import { AdminProductsManager } from "@/components/admin-products/admin-products-manager";
import { LogoutButton } from "@/components/auth/logout-button";
import { SiteHeader } from "@/components/layout/site-header";
import {
  getCatalogProductConfiguration,
  getCatalogProducts,
} from "@/lib/database-catalog-products";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getCatalogProducts(),
    getCatalogProductConfiguration(),
  ]);

  return (
    <main>
      <SiteHeader active="productos" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Gestión de productos</h1>
            <p>
              Define categorías, tipos, productos y variantes antes de gestionar
              sus existencias desde Inventario.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminProductsManager categories={categories} products={products} />
    </main>
  );
}
