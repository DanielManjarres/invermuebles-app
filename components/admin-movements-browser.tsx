"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Layers3,
  PackageSearch,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  movementLabels,
  type MovementType,
  type StockMovement,
} from "@/lib/stock-movements";
import { isProtectedStockMovement } from "@/lib/stock-movement-policy";
import {
  MovementFilterMenu,
  type MovementFilterOption,
} from "@/components/admin-movements/movement-filter-menu";

const allTypes = "all";
const allProductTypes = "all";
const allProducts = "all";
const movementsPerPage = 8;

type DateFilter = "all" | "today" | "week" | "month";

const dateFilters: Array<{ label: string; value: DateFilter }> = [
  { label: "Todas las fechas", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Ultimos 7 dias", value: "week" },
  { label: "Ultimos 30 dias", value: "month" },
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

function getSignedQuantity(movement: StockMovement) {
  if (movement.type === "entry") {
    return `+${movement.quantity}`;
  }

  if (movement.type === "exit") {
    return `-${movement.quantity}`;
  }

  return movement.quantity;
}

function canCorrectMovement(movement: StockMovement) {
  return !isProtectedStockMovement(movement);
}

type AdminMovementsBrowserProps = {
  movements: StockMovement[];
};

export function AdminMovementsBrowser({
  movements: initialMovements,
}: AdminMovementsBrowserProps) {
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<MovementType | typeof allTypes>(
    allTypes
  );
  const [activeProductType, setActiveProductType] = useState(allProductTypes);
  const [activeDate, setActiveDate] = useState<DateFilter>("all");
  const [activeProduct, setActiveProduct] = useState(allProducts);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [movementToCorrect, setMovementToCorrect] =
    useState<StockMovement | null>(null);
  const [correctingMovementId, setCorrectingMovementId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setMovements(initialMovements);
  }, [initialMovements]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeDate, activeProduct, activeProductType, activeType, query]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (!target.closest(".filterMenu")) {
        setOpenFilter(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenFilter(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
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

  const productTypeOptions = useMemo<MovementFilterOption[]>(
    () => [
      { label: "Todos", value: allProductTypes },
      ...productTypes.map((type) => ({ label: type, value: type })),
    ],
    [productTypes]
  );

  const productOptions = useMemo<MovementFilterOption[]>(
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

  const movementStats = useMemo(
    () => ({
      total: filteredMovements.length,
      entry: filteredMovements.filter((movement) => movement.type === "entry")
        .length,
      exit: filteredMovements.filter((movement) => movement.type === "exit")
        .length,
      adjustment: filteredMovements.filter(
        (movement) => movement.type === "adjustment"
      ).length,
    }),
    [filteredMovements]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovements.length / movementsPerPage)
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * movementsPerPage,
    currentPage * movementsPerPage
  );

  async function correctMovement(movement: StockMovement) {
    setCorrectingMovementId(movement.id);

    try {
      const response = await fetch(`/api/stock-movements/${movement.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setNotice(result.message ?? "No se pudo corregir el movimiento.");
        setMovementToCorrect(null);
        return;
      }

      setMovementToCorrect(null);
      setNotice(result.message ?? "Movimiento corregido y conservado en el historial.");
      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setCorrectingMovementId("");
    }
  }

  return (
    <section className="tableSection movementSection">
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
          <strong>{movementStats.total}</strong>
        </article>
        <article>
          <span>Entradas</span>
          <strong>{movementStats.entry}</strong>
        </article>
        <article>
          <span>Salidas</span>
          <strong>{movementStats.exit}</strong>
        </article>
        <article>
          <span>Ajustes</span>
          <strong>{movementStats.adjustment}</strong>
        </article>
      </div>

      <div className="inventoryToolbar movementToolbar">
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
            className={
              activeType === allTypes ? "filterButton active" : "filterButton"
            }
            type="button"
            onClick={() => setActiveType(allTypes)}
          >
            Todos
          </button>
          {(Object.keys(movementLabels) as MovementType[]).map((type) => (
            <button
              className={
                activeType === type ? "filterButton active" : "filterButton"
              }
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

        <MovementFilterMenu
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

        <MovementFilterMenu
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

        <MovementFilterMenu
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

      {notice ? (
        <div className="orderToast" role="status">
          <span>{notice}</span>
        </div>
      ) : null}

      {filteredMovements.length === 0 ? (
        <div className="emptyState">
          <h2>No hay movimientos registrados</h2>
          <p>
            Cuando registres una entrada, salida o ajuste desde el inventario,
            aparecera en esta pantalla.
          </p>
        </div>
      ) : (
        <>
          <div className="movementResultsBar">
            <span>
              Mostrando {paginatedMovements.length} de{" "}
              {filteredMovements.length} movimiento(s)
            </span>
            <span>
              Pagina {currentPage} de {totalPages}
            </span>
          </div>

          <div className="movementList">
            {paginatedMovements.map((movement) => (
              <article className="movementCard" key={movement.id}>
                <div className="movementCardMain">
                  <span className={`movementBadge ${movement.type}`}>
                    {movementLabels[movement.type]}
                  </span>
                  <div>
                    <h3>{movement.productName}</h3>
                    <p>
                      {movement.productReference} -{" "}
                      {movement.productCategory || "Sin tipo"}
                      {movement.productClass ? ` / ${movement.productClass}` : ""}
                    </p>
                  </div>
                </div>

                <dl className="movementCardData">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{movement.createdAt}</dd>
                  </div>
                  <div>
                    <dt>Cantidad</dt>
                    <dd>{getSignedQuantity(movement)}</dd>
                  </div>
                  <div>
                    <dt>Stock</dt>
                    <dd>
                      {movement.previousStock} → {movement.nextStock}
                    </dd>
                  </div>
                  <div className="movementUserCell">
                    <dt>Usuario</dt>
                    <dd>{movement.user}</dd>
                    {canCorrectMovement(movement) ? (
                      <button
                        aria-label="Corregir movimiento"
                        className="movementCorrectionLink"
                        title="Corregir movimiento"
                        type="button"
                        onClick={() => setMovementToCorrect(movement)}
                      >
                        <Undo2 size={13} />
                        Corregir
                      </button>
                    ) : null}
                  </div>
                </dl>

                <p className="movementReason">
                  <strong>{movement.reason}</strong>
                  {movement.note ? ` - ${movement.note}` : ""}
                </p>
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="paginationControls">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}

      {movementToCorrect ? (
        <div className="modalOverlay" role="presentation">
          <div className="adminModal recordDeleteModal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Correccion de registros</p>
                <h2>Corregir movimiento</h2>
              </div>
              <button
                aria-label="Cerrar confirmacion"
                className="modalClose"
                type="button"
                onClick={() => setMovementToCorrect(null)}
              >
                x
              </button>
            </div>

            <div className="recordDeleteWarning">
              <Trash2 size={20} />
              <p>
                El registro original se conservara. El sistema creara un
                movimiento inverso para devolver el stock al estado anterior.
              </p>
            </div>

            <div className="recordDeleteTarget">
              <span>Movimiento seleccionado</span>
              <strong>{movementToCorrect.productName}</strong>
              <small>
                Stock {movementToCorrect.previousStock} -&gt; {movementToCorrect.nextStock}
              </small>
            </div>

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setMovementToCorrect(null)}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                disabled={correctingMovementId === movementToCorrect.id}
                type="button"
                onClick={() => correctMovement(movementToCorrect)}
              >
                <Trash2 size={18} />
                {correctingMovementId === movementToCorrect.id
                  ? "Corrigiendo..."
                  : "Confirmar correccion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
