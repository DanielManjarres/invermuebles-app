import { ArrowRight, MessageCircle, ShoppingCart } from "lucide-react";
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
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/admin">Panel</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="heroContent">
          <p className="eyebrow">Muebles y electrodomésticos</p>
          <h1>Compra para tu hogar con atención por WhatsApp</h1>
          <p>
            Explora el catálogo, selecciona los productos que te interesan y
            continúa la venta directamente con el almacén.
          </p>
          <div className="heroActions">
            <Link className="primaryButton" href="/catalogo">
              Ver catálogo
              <ArrowRight size={18} />
            </Link>
            <Link className="secondaryButton" href="/carrito">
              <ShoppingCart size={18} />
              Carrito
            </Link>
            <a
              className="ghostButton"
              href="https://wa.me/573000000000"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Catálogo inicial</p>
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
