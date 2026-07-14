import { ArrowRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export default function HomePage() {
  const featured = products.filter((product) => product.visible).slice(0, 6);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">
          Invermuebles
        </Link>
        <nav className="nav">
          <Link href="/catalogo">Catalogo</Link>
          <Link href="/admin">Panel</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="heroContent">
          <p className="eyebrow">Muebles y electrodomesticos</p>
          <h1>Productos para el hogar en Invermuebles del Quindio</h1>
          <p>
            Consulta productos disponibles, arma tu pedido y continua la venta
            por WhatsApp con el almacen.
          </p>
          <div className="heroActions">
            <Link className="primaryButton" href="/catalogo">
              Ver catalogo
              <ArrowRight size={18} />
            </Link>
            <Link className="secondaryButton" href="/carrito">
              <ShoppingCart size={18} />
              Carrito
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Catalogo inicial</p>
            <h2>Productos destacados</h2>
          </div>
          <Link className="textLink" href="/catalogo">
            Ver todos
          </Link>
        </div>
        <div className="productGrid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
