import { AdminCreditsManager } from "@/components/admin-credits-manager";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getCreditStats, getCredits } from "@/lib/database-credits";
import { getCustomers } from "@/lib/database-customers";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const [credits, customers, stats] = await Promise.all([
    getCredits(),
    getCustomers(),
    getCreditStats(),
  ]);

  return (
    <main>
      <SiteHeader active="cartera" variant="admin" />

      <section className="pageHeader customersPageHeader">
        <div className="container pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Cartera</h1>
            <p>Consulta clientes, créditos, saldos pendientes y pagos realizados.</p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <div className="creditsPageContent">
        <div className="creditsPageHeading">
          <p className="eyebrow">Seguimiento financiero</p>
          <h2>Créditos y pagos</h2>
          <p>Busca un cliente para consultar sus créditos y registrar abonos.</p>
        </div>
        <AdminCreditsManager
          initialCredits={credits}
          initialCustomers={customers}
          initialStats={stats}
        />
      </div>
    </main>
  );
}
