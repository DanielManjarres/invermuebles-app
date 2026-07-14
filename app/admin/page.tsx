import Link from "next/link";
import { Boxes, PackageCheck, PackageX } from "lucide-react";
import { products } from "@/lib/products";

export default function AdminPage() {
  const totalProducts = products.length;
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const visibleProducts = products.filter((product) => product.visible).length;

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">
          Invermuebles
        </Link>
        <nav className="nav">
          <Link href="/catalogo">Catalogo</Link>
          <Link href="/carrito">Carrito</Link>
        </nav>
      </header>

      <section className="pageHeader">
        <p className="eyebrow">Panel administrativo</p>
        <h1>Inventario basico</h1>
        <p>
          Primera version para organizar productos, cantidades y visibilidad en
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
                <th>Categoria</th>
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
                  <td>{product.visible ? "Si" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
