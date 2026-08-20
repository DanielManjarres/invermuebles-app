import { AdminInventoryManager } from "@/components/admin-inventory/admin-inventory-manager";
import { SiteHeader } from "@/components/site-header";
import { LogoutButton } from "@/components/logout-button";
import { getProducts } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const products = await getProducts();

  return (
    <main>
      <SiteHeader active="admin" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Inventario</h1>
            <p>
              Controla cantidades disponibles, productos agotados y movimientos
              de stock del almacén.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminInventoryManager products={products} />
    </main>
  );
}
