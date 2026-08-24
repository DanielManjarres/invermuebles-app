import { AdminMovementsBrowser } from "@/components/admin-movements/admin-movements-browser";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";
import { getStockMovements } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function AdminMovementsPage() {
  const movements = await getStockMovements();

  return (
    <main>
      <SiteHeader active="movimientos" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Historial de movimientos</h1>
            <p>
              Consulta las entradas, salidas y ajustes registrados en el
              inventario.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <AdminMovementsBrowser movements={movements} />
    </main>
  );
}
