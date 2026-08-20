import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  PackageX,
  Search,
} from "lucide-react";

export type InventoryFilter =
  | "all"
  | "available"
  | "lowStock"
  | "outOfStock";

type InventoryStatsProps = {
  availableReferences: number;
  lowStockReferences: number;
  outOfStock: number;
  totalReferences: number;
};

type InventoryToolbarProps = {
  activeFilter: InventoryFilter;
  onFilterChange: (filter: InventoryFilter) => void;
  onQueryChange: (query: string) => void;
  query: string;
};

const filters: Array<{ label: string; value: InventoryFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Stock bajo", value: "lowStock" },
  { label: "Agotados", value: "outOfStock" },
];

export function InventoryStats({
  availableReferences,
  lowStockReferences,
  outOfStock,
  totalReferences,
}: InventoryStatsProps) {
  return (
    <section className="statsGrid">
      <div className="stat">
        <Boxes size={22} />
        <span>Total referencias</span>
        <strong>{totalReferences}</strong>
      </div>
      <div className="stat">
        <PackageCheck size={22} />
        <span>Disponibles</span>
        <strong>{availableReferences}</strong>
      </div>
      <div className="stat">
        <AlertTriangle size={22} />
        <span>Stock bajo</span>
        <strong>{lowStockReferences}</strong>
      </div>
      <div className="stat">
        <PackageX size={22} />
        <span>Agotados</span>
        <strong>{outOfStock}</strong>
      </div>
    </section>
  );
}

export function InventoryToolbar({
  activeFilter,
  onFilterChange,
  onQueryChange,
  query,
}: InventoryToolbarProps) {
  return (
    <div className="inventoryToolbar">
      <label className="searchBox">
        <Search size={18} />
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por producto, variante, referencia o ubicación"
          type="search"
          value={query}
        />
      </label>

      <div className="inventoryFilters" aria-label="Filtros del inventario">
        {filters.map((filter) => (
          <button
            className={
              activeFilter === filter.value
                ? "filterButton active"
                : "filterButton"
            }
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
