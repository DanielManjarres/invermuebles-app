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
            <h2>Soluciones para vestir y equipar tu hogar</h2>
          </div>
          <p>
            En {company.name} ofrecemos muebles, electrodomésticos y productos
            para el hogar en {company.city}. Nuestro objetivo es que las
            personas puedan conocer los productos disponibles, armar su
            solicitud y continuar la atención directamente por WhatsApp.
          </p>
        </div>
        <div className="aboutHighlights">
          <article>
            <strong>Muebles</strong>
            <span>Salas, comedores, muebles para TV, poltronas y productos para renovar el hogar.</span>
          </article>
          <article>
            <strong>Electrodomésticos</strong>
            <span>Neveras, lavadoras, estufas, televisores y más productos.</span>
          </article>
          <article>
            <strong>Opciones de compra</strong>
            <span>Atención para compras de contado, crédito, separado, credicontado y Sistecrédito.</span>
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
