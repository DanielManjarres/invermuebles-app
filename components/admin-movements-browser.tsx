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
const allCategories = "all";
const allUsers = "all";

type DateFilter = "all" | "today" | "week" | "month";

const dateFilters: Array<{ label: string; value: DateFilter }> = [
  { label: "Todas las fechas", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "week" },
  { label: "Últimos 30 días", value: "month" },
];

function matchesDateFilter(movement: StockMovement, filter: DateFilter) {
  if (filter === "all") {
    return true;
  }

  const movementDate = movement.createdAtISO
    ? new Date(movement.createdAtISO)
    : null;

  if (!movementDate || Number.isNaN(movementDate.getTime())) {
    return false;
  }

  const today = new Date();
  const startDate = new Date(today);

  if (filter === "today") {
    return movementDate.toDateString() === today.toDateString();
  }

  startDate.setDate(today.getDate() - (filter === "week" ? 7 : 30));
  return movementDate >= startDate;
}

export function AdminMovementsBrowser() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<MovementType | typeof allTypes>(
    allTypes
  );
  const [activeCategory, setActiveCategory] = useState(allCategories);
  const [activeDate, setActiveDate] = useState<DateFilter>("all");
  const [activeUser, setActiveUser] = useState(allUsers);

  useEffect(() => {
    setMovements(readStockMovements());
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          movements.map((movement) => movement.productCategory || "Sin categoría")
        )
      ),
    [movements]
  );

  const users = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.user))),
    [movements]
  );

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesType = activeType === allTypes || movement.type === activeType;
      const movementCategory = movement.productCategory || "Sin categoría";
      const matchesCategory =
        activeCategory === allCategories || movementCategory === activeCategory;
      const matchesUser = activeUser === allUsers || movement.user === activeUser;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          movement.productName,
          movement.productReference,
          movementCategory,
          movement.reason,
          movement.note,
          movement.user,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesType &&
        matchesCategory &&
        matchesUser &&
        matchesDateFilter(movement, activeDate) &&
        matchesQuery
      );
    });
  }, [activeCategory, activeDate, activeType, activeUser, movements, query]);

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

      <div className="movementFiltersPanel">
        <label>
          Categoría
          <select
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
          >
            <option value={allCategories}>Todas</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <select
            value={activeDate}
            onChange={(event) => setActiveDate(event.target.value as DateFilter)}
          >
            {dateFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Usuario
          <select
            value={activeUser}
            onChange={(event) => setActiveUser(event.target.value)}
          >
            <option value={allUsers}>Todos</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </label>
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
                <th>Categoría</th>
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
                    <td>{movement.productCategory || "Sin categoría"}</td>
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
