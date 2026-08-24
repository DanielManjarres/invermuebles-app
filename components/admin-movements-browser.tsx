"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  type MovementType,
  type StockMovement,
} from "@/lib/stock-movements";
import {
  type MovementFilterOption,
} from "@/components/admin-movements/movement-filter-menu";
import { MovementOverview } from "@/components/admin-movements/movement-overview";
import {
  MovementFilters,
  type MovementDateFilter,
} from "@/components/admin-movements/movement-filters";
import { MovementList } from "@/components/admin-movements/movement-list";

const allTypes = "all";
const allProductTypes = "all";
const allProducts = "all";
const movementsPerPage = 8;

function matchesDateFilter(movement: StockMovement, filter: MovementDateFilter) {
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
  const [activeDate, setActiveDate] = useState<MovementDateFilter>("all");
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
      <MovementOverview stats={movementStats} />

      <MovementFilters
        activeDate={activeDate}
        activeProduct={activeProduct}
        activeProductType={activeProductType}
        activeType={activeType}
        openFilter={openFilter}
        productOptions={productOptions}
        productTypeOptions={productTypeOptions}
        query={query}
        onDateChange={setActiveDate}
        onOpenFilterChange={setOpenFilter}
        onProductChange={setActiveProduct}
        onProductTypeChange={setActiveProductType}
        onQueryChange={setQuery}
        onTypeChange={setActiveType}
      />

      {notice ? (
        <div className="orderToast" role="status">
          <span>{notice}</span>
        </div>
      ) : null}

      <MovementList
        currentPage={currentPage}
        movements={paginatedMovements}
        totalMovements={filteredMovements.length}
        totalPages={totalPages}
        onCorrect={setMovementToCorrect}
        onPageChange={setCurrentPage}
      />

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
