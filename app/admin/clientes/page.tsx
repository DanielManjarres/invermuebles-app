import { AdminCustomersManager } from "@/components/admin-customers-manager";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getCustomers } from "@/lib/database-customers";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getCustomers();

  return (
    <main>
      <SiteHeader active="clientes" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Clientes</h1>
            <p>
              Consulta, registra y actualiza la informacion de los clientes del
              almacen.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminCustomersManager customers={customers} />
    </main>
  );
}
