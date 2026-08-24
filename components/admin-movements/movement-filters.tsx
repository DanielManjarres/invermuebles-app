import { CalendarDays, Layers3, PackageSearch, Search } from "lucide-react";
import {
  MovementFilterMenu,
  type MovementFilterOption,
} from "@/components/admin-movements/movement-filter-menu";
import { movementLabels, type MovementType } from "@/lib/stock-movements";

export type MovementDateFilter = "all" | "today" | "week" | "month";

const dateFilters: Array<{ label: string; value: MovementDateFilter }> = [
  { label: "Todas las fechas", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "week" },
  { label: "Últimos 30 días", value: "month" },
];

type MovementFiltersProps = {
  activeDate: MovementDateFilter;
  activeProduct: string;
  activeProductType: string;
  activeType: MovementType | "all";
  onDateChange: (value: MovementDateFilter) => void;
  onOpenFilterChange: (value: string | null) => void;
  onProductChange: (value: string) => void;
  onProductTypeChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onTypeChange: (value: MovementType | "all") => void;
  openFilter: string | null;
  productOptions: MovementFilterOption[];
  productTypeOptions: MovementFilterOption[];
  query: string;
};

export function MovementFilters({
  activeDate,
  activeProduct,
  activeProductType,
  activeType,
  onDateChange,
  onOpenFilterChange,
  onProductChange,
  onProductTypeChange,
  onQueryChange,
  onTypeChange,
  openFilter,
  productOptions,
  productTypeOptions,
  query,
}: MovementFiltersProps) {
  return (
    <>
      <div className="inventoryToolbar movementToolbar">
        <label className="searchBox">
          <Search size={18} />
          <input
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por producto, referencia, tipo o motivo"
            type="search"
            value={query}
          />
        </label>

        <div className="inventoryFilters" aria-label="Filtros de movimientos">
          <button
            className={activeType === "all" ? "filterButton active" : "filterButton"}
            type="button"
            onClick={() => onTypeChange("all")}
          >
            Todos
          </button>
          {(Object.keys(movementLabels) as MovementType[]).map((type) => (
            <button
              className={activeType === type ? "filterButton active" : "filterButton"}
              key={type}
              type="button"
              onClick={() => onTypeChange(type)}
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
            onClick={() => onOpenFilterChange(null)}
          />
        ) : null}

        <MovementFilterMenu
          icon={<Layers3 size={17} />}
          isOpen={openFilter === "productType"}
          label="Tipo"
          options={productTypeOptions}
          value={activeProductType}
          onToggle={() =>
            onOpenFilterChange(openFilter === "productType" ? null : "productType")
          }
          onSelect={(value) => {
            onProductTypeChange(value);
            onOpenFilterChange(null);
          }}
        />

        <MovementFilterMenu
          icon={<CalendarDays size={17} />}
          isOpen={openFilter === "date"}
          label="Fecha"
          options={dateFilters}
          value={activeDate}
          onToggle={() =>
            onOpenFilterChange(openFilter === "date" ? null : "date")
          }
          onSelect={(value) => {
            onDateChange(value as MovementDateFilter);
            onOpenFilterChange(null);
          }}
        />

        <MovementFilterMenu
          icon={<PackageSearch size={17} />}
          isOpen={openFilter === "product"}
          label="Producto"
          options={productOptions}
          value={activeProduct}
          onToggle={() =>
            onOpenFilterChange(openFilter === "product" ? null : "product")
          }
          onSelect={(value) => {
            onProductChange(value);
            onOpenFilterChange(null);
          }}
        />
      </div>
    </>
  );
}
