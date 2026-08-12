import { AdminCreditsManager } from "@/components/admin-credits-manager";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getCredits } from "@/lib/database-credits";
import { getCustomers } from "@/lib/database-customers";
import { getSales } from "@/lib/database-sales";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const [credits, customers, sales] = await Promise.all([
    getCredits(),
    getCustomers(),
    getSales(),
  ]);

  return (
    <main className="creditsPage">
      <SiteHeader active="cartera" variant="admin" />

      <section className="pageHeader customersPageHeader">
        <div className="container pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Cartera</h1>
            <p>Consulta clientes, cuentas, saldos pendientes y pagos realizados.</p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <div className="creditsPageContent">
        <div className="creditsPageHeading">
          <p className="eyebrow">Seguimiento financiero</p>
          <h2>Cuentas y pagos</h2>
          <p>Busca un cliente para consultar sus cuentas y registrar abonos.</p>
        </div>
        <AdminCreditsManager
          initialCredits={credits}
          initialCustomers={customers}
          initialSales={sales}
        />
      </div>
    </main>
  );
}
