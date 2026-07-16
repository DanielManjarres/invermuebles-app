import { products } from "@/lib/products";
import { AdminInventoryManager } from "@/components/admin-inventory-manager";
import { SiteHeader } from "@/components/site-header";
import { LogoutButton } from "@/components/logout-button";

export default function AdminPage() {
  return (
    <main>
      <SiteHeader active="admin" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Inventario básico</h1>
            <p>
              Primera versión para organizar productos, cantidades y visibilidad
              en la web.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminInventoryManager products={products} />
    </main>
  );
}
