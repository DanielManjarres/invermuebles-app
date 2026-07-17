"use client";

import Link from "next/link";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useCart } from "@/components/use-cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { whatsappUrl } from "@/lib/company";

function summarizeDetails(details?: string) {
  if (!details) {
    return "";
  }

  return details.length > 110 ? `${details.slice(0, 107).trim()}...` : details;
}

export default function CartPage() {
  const { items, removeItem, clearCart } = useCart();

  const message = encodeURIComponent(
    `Hola, quiero recibir información sobre estos productos de Invermuebles del Quindío:\n\n${items
      .map(
        (item, index) =>
          `${index + 1}. ${item.name}\nReferencia: ${item.reference}${
            item.category ? `\nTipo: ${item.category}` : ""
          }`
      )
      .join("\n\n")}\n\nQuedo atento(a) para confirmar precio, disponibilidad y forma de pago.`
  );
  const cartWhatsappUrl = `${whatsappUrl}?text=${message}`;

  return (
    <main>
      <SiteHeader active="carrito" />

      <section className="pageHeader">
        <p className="eyebrow">Pedido por WhatsApp</p>
        <h1>Carrito</h1>
        <p>Selecciona productos y continúa la venta con el almacén.</p>
      </section>

      <section className="cartLayout">
        {items.length === 0 ? (
          <div className="emptyState">
            <h2>No hay productos seleccionados</h2>
            <p>Agrega productos desde el catálogo para crear una solicitud.</p>
            <Link className="primaryButton" href="/catalogo">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="cartList">
              {items.map((item) => (
                <article className="cartItem" key={item.id}>
                  <div className="cartItemMedia">
                    {item.image ? (
                      <img src={item.image} alt={item.name} loading="lazy" />
                    ) : null}
                  </div>
                  <div className="cartItemInfo">
                    {item.category ? <span className="tag">{item.category}</span> : null}
                    <h2>{item.name}</h2>
                    <span className="reference">{item.reference}</span>
                    {item.details ? <p>{summarizeDetails(item.details)}</p> : null}
                  </div>
                  <button
                    className="iconButton"
                    type="button"
                    title="Quitar producto"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>

            <aside className="summaryPanel">
              <h2>Resumen</h2>
              <p>{items.length} producto(s) seleccionados.</p>
              <p>
                El almacén confirmará precio, disponibilidad y forma de pago por
                WhatsApp.
              </p>
              <a
                className="primaryButton fullWidth"
                href={cartWhatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Send size={18} />
                Enviar pedido por WhatsApp
              </a>
              <Link className="secondaryButton fullWidth" href="/catalogo">
                <ArrowLeft size={18} />
                Seguir viendo catálogo
              </Link>
              <button className="secondaryButton fullWidth" onClick={clearCart}>
                Vaciar carrito
              </button>
            </aside>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
