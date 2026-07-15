import { Boxes, PackageCheck, PackageX } from "lucide-react";
import { products } from "@/lib/products";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function AdminPage() {
  const totalProducts = products.length;
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const visibleProducts = products.filter((product) => product.visible).length;

  return (
    <main>
      <SiteHeader active="admin" />

      <section className="pageHeader">
        <p className="eyebrow">Panel administrativo</p>
        <h1>Inventario básico</h1>
        <p>
          Primera versión para organizar productos, cantidades y visibilidad en
          la web.
        </p>
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
                <th>Web</th>
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
                  <td>{product.visible ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
