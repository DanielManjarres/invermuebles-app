import {
  Boxes,
  Eye,
  EyeOff,
  PackageCheck,
  PackageX,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { products } from "@/lib/products";
import { SiteHeader } from "@/components/site-header";
import { LogoutButton } from "@/components/logout-button";

export default function AdminPage() {
  const totalProducts = products.length;
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const visibleProducts = products.filter(
    (product) => product.visible && product.stock > 0
  ).length;
  const groupedProducts = Array.from(
    new Set(products.map((product) => product.category))
  ).map((category) => {
    const items = products.filter((product) => product.category === category);

    return {
      category,
      items,
      classes: Array.from(new Set(items.map((product) => product.productClass))),
      available: items.filter((product) => product.stock > 0).length,
      outOfStock: items.filter((product) => product.stock === 0).length,
      visible: items.filter((product) => product.visible && product.stock > 0).length,
    };
  });

  return (
    <main>
      <SiteHeader active="admin" variant="admin" />

      <section className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>Inventario básico</h1>
            <p>
              Primera versión para organizar productos, cantidades y visibilidad
              en la web.
            </p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <section className="statsGrid">
        <div className="stat">
          <Boxes size={22} />
          <span>Total productos</span>
          <strong>{totalProducts}</strong>
        </div>
        <div className="stat">
          <PackageCheck size={22} />
          <span>Visibles en web</span>
          <strong>{visibleProducts}</strong>
        </div>
        <div className="stat">
          <PackageX size={22} />
          <span>Agotados</span>
          <strong>{outOfStock}</strong>
        </div>
      </section>

      <section className="tableSection">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Control interno</p>
            <h2>Inventario por tipo de producto</h2>
          </div>
        </div>

        <div className="inventoryGroups">
          {groupedProducts.map((group) => (
            <article className="inventoryGroup" key={group.category}>
              <div className="inventoryGroupHeader">
                <div>
                  <p className="eyebrow">{group.classes.join(" / ")}</p>
                  <h3>{group.category}</h3>
                </div>
                <div className="inventoryGroupStats">
                  <span>{group.items.length} productos</span>
                  <span>{group.visible} en web</span>
                  <span>{group.outOfStock} agotados</span>
                </div>
              </div>

              <div className="tableWrap inventoryTableWrap">
                <table className="inventoryTable">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Clase</th>
                      <th>Referencia</th>
                      <th>Cantidad</th>
                      <th>Valores</th>
                      <th>Estado</th>
                      <th>Web</th>
                      <th>Gestión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                        </td>
                        <td>{product.productClass}</td>
                        <td>{product.reference}</td>
                        <td>{product.stock}</td>
                        <td>
                          <span className="priceStack">
                            <span>Costo: {product.cost.toLocaleString("es-CO")}</span>
                            <span>Venta: {product.salePrice.toLocaleString("es-CO")}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className={product.stock > 0 ? "available" : "unavailable"}
                          >
                            {product.stock > 0 ? "Disponible" : "Agotado"}
                          </span>
                        </td>
                        <td>{product.visible ? "Sí" : "No"}</td>
                        <td>
                          <div className="actionsCell">
                            <button
                              className="tableAction iconOnly"
                              title="Editar producto"
                              type="button"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="tableAction iconOnly"
                              title={product.visible ? "Ocultar de la web" : "Publicar en la web"}
                              type="button"
                            >
                              {product.visible ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                            <button
                              className="tableAction iconOnly"
                              title="Actualizar stock"
                              type="button"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
