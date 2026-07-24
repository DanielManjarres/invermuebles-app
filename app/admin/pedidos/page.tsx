import { AdminOrdersBrowser } from "@/components/admin-orders-browser";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getOrders } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <main>
      <SiteHeader active="pedidos" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Pedidos</h1>
            <p>
              Revisa las solicitudes enviadas desde el catálogo web y da
              seguimiento antes de convertirlas en venta.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminOrdersBrowser orders={orders} />
    </main>
  );
}
