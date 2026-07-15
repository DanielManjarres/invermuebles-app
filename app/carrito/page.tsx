"use client";

import Link from "next/link";
import { Send, Trash2 } from "lucide-react";
import { useCart } from "@/components/use-cart";

const whatsappNumber = "573000000000";

export default function CartPage() {
  const { items, removeItem, clearCart } = useCart();

  const message = encodeURIComponent(
    `Hola, quiero recibir información sobre estos productos:\n\n${items
      .map((item) => `- ${item.name} (${item.reference})`)
      .join("\n")}`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

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
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.reference}</p>
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
              <a className="primaryButton fullWidth" href={whatsappUrl}>
                <Send size={18} />
                Enviar a WhatsApp
              </a>
              <button className="secondaryButton fullWidth" onClick={clearCart}>
                Vaciar carrito
              </button>
            </aside>
          </>
        )}
      </section>
    </main>
  );
}
