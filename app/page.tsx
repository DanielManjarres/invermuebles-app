import { ArrowRight, MessageCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { FeaturedProducts } from "@/components/featured-products";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { company, whatsappUrl } from "@/lib/company";
import { getProducts } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts({ availableOnly: true, visibleOnly: true });

  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="heroContent">
          <p className="eyebrow">Hogar, confort y calidad</p>
          <h1>Muebles y electrodomésticos para tu hogar</h1>
          <p>
            Explora el catálogo de {company.name}, selecciona los
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
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="aboutBand">
        <div className="aboutContent">
          <div>
            <p className="eyebrow">Conócenos</p>
            <h2>Soluciones para vestir y equipar tu hogar</h2>
          </div>
          <p>
            En {company.name} acompañamos a las familias en la elección de
            muebles, electrodomésticos y productos para el hogar. Nuestro
            objetivo es ofrecer opciones cómodas, funcionales y de calidad,
            facilitando la consulta de productos y la atención por medios
            digitales.
          </p>
        </div>
        <div className="aboutHighlights">
          <article>
            <strong>Muebles</strong>
            <span>Salas, comedores, muebles para TV y artículos para el hogar.</span>
          </article>
          <article>
            <strong>Electrodomésticos</strong>
            <span>Neveras, lavadoras, estufas, televisores y más productos.</span>
          </article>
          <article>
            <strong>Atención asistida</strong>
            <span>Seleccionas productos en la web y continúas por WhatsApp.</span>
          </article>
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
        <FeaturedProducts products={products} />
      </section>
      <SiteFooter />
    </main>
  );
}
