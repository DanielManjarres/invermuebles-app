"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  movementLabels,
  readStockMovements,
  type MovementType,
  type StockMovement,
} from "@/lib/stock-movements";

const allTypes = "all";

export function AdminMovementsBrowser() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<MovementType | typeof allTypes>(
    allTypes
  );

  useEffect(() => {
    setMovements(readStockMovements());
  }, []);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesType = activeType === allTypes || movement.type === activeType;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          movement.productName,
          movement.productReference,
          movement.reason,
          movement.note,
          movement.user,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [activeType, movements, query]);

  return (
    <section className="tableSection movementSection">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Historial interno</p>
          <h2>Movimientos de inventario</h2>
        </div>
      </div>

      <div className="inventoryToolbar">
        <label className="searchBox">
          <Search size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por producto, referencia, motivo o usuario"
            type="search"
            value={query}
          />
        </label>

        <div className="inventoryFilters" aria-label="Filtros de movimientos">
          <button
            className={activeType === allTypes ? "filterButton active" : "filterButton"}
            type="button"
            onClick={() => setActiveType(allTypes)}
          >
            Todos
          </button>
          {(Object.keys(movementLabels) as MovementType[]).map((type) => (
            <button
              className={activeType === type ? "filterButton active" : "filterButton"}
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
            >
              {movementLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {filteredMovements.length === 0 ? (
        <div className="emptyState">
          <h2>No hay movimientos registrados</h2>
          <p>
            Cuando registres una entrada, salida o ajuste desde el inventario,
            aparecerá en esta pantalla.
          </p>
        </div>
      ) : (
        <div className="tableWrap">
          <table className="movementTable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Stock</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id}>
                  <td>{movement.createdAt}</td>
                  <td>
                    <strong>{movement.productName}</strong>
                    <span className="reference">{movement.productReference}</span>
                  </td>
                  <td>
                    <span className={`movementBadge ${movement.type}`}>
                      {movementLabels[movement.type]}
                    </span>
                  </td>
                  <td>
                    {movement.type === "entry"
                      ? `+${movement.quantity}`
                      : movement.type === "exit"
                        ? `-${movement.quantity}`
                        : movement.quantity}
                  </td>
                  <td>
                    {movement.previousStock} → {movement.nextStock}
                  </td>
                  <td>
                    <span className="movementReason">
                      {movement.reason}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </span>
                  </td>
                  <td>{movement.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
