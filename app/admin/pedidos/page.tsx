import { AdminOrdersBrowser } from "@/components/admin-orders/admin-orders-browser";
import { LogoutButton } from "@/components/auth/logout-button";
import { SiteHeader } from "@/components/layout/site-header";
import { getCustomers } from "@/lib/database-customers";
import { getOrders } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);

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

      <AdminOrdersBrowser customers={customers} orders={orders} />
    </main>
  );
}
