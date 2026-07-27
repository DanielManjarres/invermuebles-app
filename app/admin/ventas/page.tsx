import { AdminSalesManager } from "@/components/admin-sales-manager";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getCustomers } from "@/lib/database-customers";
import { getProducts } from "@/lib/database-products";
import { getSales } from "@/lib/database-sales";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const [customers, products, sales] = await Promise.all([
    getCustomers(),
    getProducts(),
    getSales(),
  ]);

  return (
    <main>
      <SiteHeader active="ventas" variant="admin" />

      <section className="pageHeader customersPageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Ventas</h1>
            <p>
              Registra ventas locales y consulta las ventas creadas desde
              pedidos confirmados.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminSalesManager customers={customers} products={products} sales={sales} />
    </main>
  );
}
