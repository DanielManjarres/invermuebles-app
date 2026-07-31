import { AdminCreditsManager } from "@/components/admin-credits-manager";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getCreditStats, getCredits } from "@/lib/database-credits";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const [credits, stats] = await Promise.all([getCredits(), getCreditStats()]);

  return (
    <main>
      <SiteHeader active="cartera" variant="admin" />

      <section className="pageHeader customersPageHeader">
        <div className="container pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Cartera</h1>
            <p>Consulta los créditos, saldos pendientes y pagos realizados por los clientes.</p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <div className="creditsPageContent">
        <div className="creditsPageHeading">
          <p className="eyebrow">Seguimiento financiero</p>
          <h2>Créditos y pagos</h2>
          <p>Selecciona una cuenta para revisar su estado y registrar un nuevo abono.</p>
        </div>
        <AdminCreditsManager initialCredits={credits} initialStats={stats} />
      </div>
    </main>
  );
}
