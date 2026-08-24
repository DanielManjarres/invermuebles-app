import { ArrowRight, MessageCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { FeaturedProducts } from "@/components/catalog/featured-products";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { company, whatsappUrl } from "@/lib/company";
import { getProducts } from "@/lib/database-products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts({
    availableOnly: true,
    featuredOnly: true,
    visibleOnly: true,
  });

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
            WhatsApp. El almacén confirma precio, disponibilidad y forma de
            pago antes de cerrar el pedido.
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
            <h2>Todo para el hogar en un solo lugar</h2>
          </div>
          <p>
            En {company.name} encuentras muebles, electrodomésticos, colchones
            y productos para renovar tu hogar. Atendemos en {company.city} y
            también por WhatsApp, para que puedas consultar disponibilidad,
            formas de pago y separar los productos que te interesan.
          </p>
        </div>
        <div className="aboutHighlights">
          <article>
            <strong>Productos para el hogar</strong>
            <span>Salas, comedores, colchones, muebles para TV, poltronas y más opciones para tu casa.</span>
          </article>
          <article>
            <strong>Electrodomésticos</strong>
            <span>Neveras, lavadoras, estufas, televisores, bafles y equipos para el uso diario.</span>
          </article>
          <article>
            <strong>Compra acompañada</strong>
            <span>Te orientamos por WhatsApp y en el almacén. Manejamos contado, crédito, separado y Sistecrédito.</span>
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
