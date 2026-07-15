import { ArrowRight, MessageCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  const featured = products.filter((product) => product.visible).slice(0, 6);

  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="heroContent">
          <p className="eyebrow">Hogar, confort y calidad</p>
          <h1>Muebles y electrodomésticos para tu hogar</h1>
          <p>
            Explora el catálogo de Invermuebles del Quindío, selecciona los
            productos que te interesan y continúa la venta directamente por
            WhatsApp.
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
