import { AdminMovementsBrowser } from "@/components/admin-movements-browser";
import { LogoutButton } from "@/components/logout-button";
import { SiteHeader } from "@/components/site-header";

export default function AdminMovementsPage() {
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

      <AdminMovementsBrowser />
    </main>
  );
}
