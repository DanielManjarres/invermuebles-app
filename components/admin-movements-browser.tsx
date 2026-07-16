"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Layers3,
  PackageSearch,
  Search,
} from "lucide-react";
import {
  movementLabels,
  readStockMovements,
  type MovementType,
  type StockMovement,
} from "@/lib/stock-movements";

const allTypes = "all";
const allProductTypes = "all";
const allProducts = "all";

type DateFilter = "all" | "today" | "week" | "month";

type FilterOption = {
  label: string;
  value: string;
};

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

type FilterMenuProps = {
  icon: ReactNode;
  isOpen: boolean;
  label: string;
  onSelect: (value: string) => void;
  onToggle: () => void;
  options: FilterOption[];
  value: string;
};

function FilterMenu({
  icon,
  isOpen,
  label,
  onSelect,
  onToggle,
  options,
  value,
}: FilterMenuProps) {
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <label className="filterMenuLabel">
      <span>{label}</span>
      <div className={isOpen ? "filterMenu open" : "filterMenu"}>
        <button className="filterMenuButton" type="button" onClick={onToggle}>
          {icon}
          <span>{selectedOption.label}</span>
          <ChevronDown size={16} />
        </button>

        {isOpen ? (
          <div className="filterMenuList" role="listbox">
            {options.map((option) => (
              <button
                className={
                  option.value === value
                    ? "filterMenuOption active"
                    : "filterMenuOption"
                }
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
              >
                <span>{option.label}</span>
                {option.value === value ? <Check size={15} /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  );
}

export function AdminMovementsBrowser() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<MovementType | typeof allTypes>(
    allTypes
  );
  const [activeProductType, setActiveProductType] = useState(allProductTypes);
  const [activeDate, setActiveDate] = useState<DateFilter>("all");
  const [activeProduct, setActiveProduct] = useState(allProducts);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  useEffect(() => {
    setMovements(readStockMovements());
  }, []);

  const productTypes = useMemo(
    () =>
      Array.from(
        new Set(
          movements.map((movement) => movement.productCategory || "Sin tipo")
        )
      ),
    [movements]
  );

  const products = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.productName))),
    [movements]
  );

  const productTypeOptions = useMemo<FilterOption[]>(
    () => [
      { label: "Todos", value: allProductTypes },
      ...productTypes.map((type) => ({ label: type, value: type })),
    ],
    [productTypes]
  );

  const productOptions = useMemo<FilterOption[]>(
    () => [
      { label: "Todos", value: allProducts },
      ...products.map((product) => ({ label: product, value: product })),
    ],
    [products]
  );

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesType = activeType === allTypes || movement.type === activeType;
      const movementProductType = movement.productCategory || "Sin tipo";
      const matchesProductType =
        activeProductType === allProductTypes ||
        movementProductType === activeProductType;
      const matchesProduct =
        activeProduct === allProducts || movement.productName === activeProduct;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          movement.productName,
          movement.productReference,
          movementProductType,
          movement.productClass,
          movement.reason,
          movement.note,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesType &&
        matchesProductType &&
        matchesProduct &&
        matchesDateFilter(movement, activeDate) &&
        matchesQuery
      );
    });
  }, [activeDate, activeProduct, activeProductType, activeType, movements, query]);

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
            placeholder="Buscar por producto, referencia, tipo o motivo"
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
        {openFilter ? (
          <button
            className="filterMenuBackdrop"
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setOpenFilter(null)}
          />
        ) : null}

        <FilterMenu
          icon={<Layers3 size={17} />}
          isOpen={openFilter === "productType"}
          label="Tipo"
          options={productTypeOptions}
          value={activeProductType}
          onToggle={() =>
            setOpenFilter(openFilter === "productType" ? null : "productType")
          }
          onSelect={(value) => {
            setActiveProductType(value);
            setOpenFilter(null);
          }}
        />

        <FilterMenu
          icon={<CalendarDays size={17} />}
          isOpen={openFilter === "date"}
          label="Fecha"
          options={dateFilters}
          value={activeDate}
          onToggle={() => setOpenFilter(openFilter === "date" ? null : "date")}
          onSelect={(value) => {
            setActiveDate(value as DateFilter);
            setOpenFilter(null);
          }}
        />

        <FilterMenu
          icon={<PackageSearch size={17} />}
          isOpen={openFilter === "product"}
          label="Producto"
          options={productOptions}
          value={activeProduct}
          onToggle={() =>
            setOpenFilter(openFilter === "product" ? null : "product")
          }
          onSelect={(value) => {
            setActiveProduct(value);
            setOpenFilter(null);
          }}
        />
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
                <th>Movimiento</th>
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
                    {movement.productCategory || "Sin tipo"}
                    {movement.productClass ? (
                      <span className="reference">{movement.productClass}</span>
                    ) : null}
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
