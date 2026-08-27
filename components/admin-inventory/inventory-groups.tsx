import { RotateCcw } from "lucide-react";

export type InventoryItem = {
  active: boolean;
  category: string;
  isLegacy: boolean;
  key: string;
  location: string;
  minimumStock: number;
  productId: string;
  productName: string;
  productType: string;
  reference: string;
  stock: number;
  variantId?: string;
  variantName: string;
};

type InventoryGroup = {
  available: number;
  category: string;
  id: string;
  items: InventoryItem[];
  lowStock: number;
  outOfStock: number;
  productTypes: string[];
};

type InventoryGroupsProps = {
  groups: InventoryGroup[];
  onOpenMovement: (item: InventoryItem) => void;
};

function getStockStatus(item: InventoryItem) {
  if (!item.active) return { className: "unavailable", label: "Inactiva" };
  if (item.stock === 0) return { className: "unavailable", label: "Agotado" };
  if (item.stock <= item.minimumStock) {
    return { className: "stockLow", label: "Stock bajo" };
  }
  return { className: "available", label: "Disponible" };
}

export function InventoryGroups({
  groups,
  onOpenMovement,
}: InventoryGroupsProps) {
  if (groups.length === 0) {
    return (
      <div className="emptyState">
        <h2>No se encontraron referencias</h2>
        <p>Cambia la búsqueda o selecciona otro filtro del inventario.</p>
      </div>
    );
  }

  return (
    <>
      <nav className="inventoryShortcuts" aria-label="Atajos del inventario">
        {groups.map((group) => (
          <a className="inventoryShortcut" href={`#${group.id}`} key={group.id}>
            <span>{group.category}</span>
            <small>
              {group.items.length} referencia(s)
              {group.outOfStock > 0
                ? ` · ${group.outOfStock} agotado(s)`
                : ""}
            </small>
          </a>
        ))}
      </nav>

      <div className="inventoryGroups">
        {groups.map((group) => (
          <article className="inventoryGroup" id={group.id} key={group.category}>
            <div className="inventoryGroupHeader">
              <div>
                <p className="eyebrow">{group.category}</p>
                <h3>{group.productTypes.join(" / ")}</h3>
              </div>
              <div className="inventoryGroupStats">
                <span>{group.items.length} referencias</span>
                <span>{group.available} disponibles</span>
                <span>{group.lowStock} con stock bajo</span>
                <span>{group.outOfStock} agotados</span>
              </div>
            </div>

            <div className="tableWrap inventoryTableWrap">
              <table className="inventoryTable">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Variante</th>
                    <th>Tipo</th>
                    <th>Referencia</th>
                    <th>Ubicación</th>
                    <th>Cantidad</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th className="actionsHeader">Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => {
                    const status = getStockStatus(item);

                    return (
                      <tr key={item.key}>
                        <td>
                          <strong>{item.productName}</strong>
                        </td>
                        <td>
                          {item.variantName}
                          {item.isLegacy ? (
                            <small className="inventoryLegacyNote">
                              Sin migrar
                            </small>
                          ) : null}
                        </td>
                        <td>{item.productType}</td>
                        <td>{item.reference}</td>
                        <td>{item.location || "Sin registrar"}</td>
                        <td>{item.stock}</td>
                        <td>{item.minimumStock}</td>
                        <td>
                          <span className={status.className}>{status.label}</span>
                        </td>
                        <td className="actionsCell">
                          <button
                            className="manageButton"
                            type="button"
                            onClick={() => onOpenMovement(item)}
                          >
                            <RotateCcw size={15} />
                            Registrar movimiento
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
