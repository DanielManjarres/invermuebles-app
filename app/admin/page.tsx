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
