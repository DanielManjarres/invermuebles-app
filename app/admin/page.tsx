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
            <h2>Productos registrados</h2>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Referencia</th>
                <th>Cantidad</th>
                <th>Costo</th>
                <th>Precio venta</th>
                <th>Estado</th>
                <th>Web</th>
                <th>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.reference}</td>
                  <td>{product.stock}</td>
                  <td>{product.cost.toLocaleString("es-CO")}</td>
                  <td>{product.salePrice.toLocaleString("es-CO")}</td>
                  <td>
                    <span className={product.stock > 0 ? "available" : "unavailable"}>
                      {product.stock > 0 ? "Disponible" : "Agotado"}
                    </span>
                  </td>
                  <td>{product.visible ? "Sí" : "No"}</td>
                  <td>
                    <div className="actionsCell">
                      <button className="tableAction" type="button">
                        <Pencil size={15} />
                        Editar
                      </button>
                      <button className="tableAction" type="button">
                        {product.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                        {product.visible ? "Ocultar" : "Publicar"}
                      </button>
                      <button className="tableAction" type="button">
                        <RotateCcw size={15} />
                        Stock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
