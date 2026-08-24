type MovementOverviewProps = {
  stats: {
    adjustment: number;
    entry: number;
    exit: number;
    total: number;
  };
};

export function MovementOverview({ stats }: MovementOverviewProps) {
  return (
    <>
      <div className="sectionHeader movementSectionHeader">
        <div>
          <p className="eyebrow">Historial interno</p>
          <h2>Movimientos de inventario</h2>
          <p className="sectionLead">
            Revisa las entradas, salidas y ajustes realizados sobre el stock.
          </p>
        </div>
      </div>

      <div className="movementSummaryGrid" aria-label="Resumen de movimientos">
        <article>
          <span>Total movimientos</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Entradas</span>
          <strong>{stats.entry}</strong>
        </article>
        <article>
          <span>Salidas</span>
          <strong>{stats.exit}</strong>
        </article>
        <article>
          <span>Ajustes</span>
          <strong>{stats.adjustment}</strong>
        </article>
      </div>
    </>
  );
}
