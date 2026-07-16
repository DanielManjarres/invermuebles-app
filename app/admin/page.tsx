import { Boxes, PackageCheck, PackageX } from "lucide-react";
import { products } from "@/lib/products";
import { AdminInventoryManager } from "@/components/admin-inventory-manager";
import { SiteHeader } from "@/components/site-header";
import { LogoutButton } from "@/components/logout-button";

export default function AdminPage() {
  const totalProducts = products.length;
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const visibleProducts = products.filter(
    (product) => product.visible && product.stock > 0
  ).length;

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

      <section className="statsGrid">
        <div className="stat">
          <Boxes size={22} />
          <span>Total productos</span>
          <strong>{totalProducts}</strong>
        </div>
        <div className="stat">
          <PackageCheck size={22} />
          <span>Visibles en web</span>
          <strong>{visibleProducts}</strong>
        </div>
        <div className="stat">
          <PackageX size={22} />
          <span>Agotados</span>
          <strong>{outOfStock}</strong>
        </div>
      </section>

      <AdminInventoryManager products={products} />
    </main>
  );
}
