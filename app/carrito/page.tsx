"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/use-cart";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { whatsappUrl } from "@/lib/company";

function summarizeDetails(details?: string) {
  if (!details) {
    return "";
  }

  return details.length > 110 ? `${details.slice(0, 107).trim()}...` : details;
}

export default function CartPage() {
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sentOrderId, setSentOrderId] = useState("");
  const {
    items,
    removeItem,
    increaseItemQuantity,
    decreaseItemQuantity,
    clearCart,
  } = useCart();
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const unitText =
    totalQuantity === 1 ? "unidad seleccionada" : "unidades seleccionadas";
  const productText = items.length === 1 ? "producto" : "productos";
  const orderAlreadySent = sentOrderId.length > 0;

  function handleCartChange(action: () => void) {
    setSentOrderId("");
    setFeedback("");
    action();
  }

  function buildWhatsappMessage(orderId?: string) {
    return encodeURIComponent(
      `Hola, quiero consultar información y disponibilidad de estos productos de Invermuebles del Quindío:${
        orderId ? `\nSolicitud web: #${orderId.slice(-6).toUpperCase()}` : ""
      }\n\n${items
      .map(
        (item, index) =>
          `${index + 1}. ${item.name}${item.variantName ? ` · ${item.variantName}` : ""}\nReferencia: ${item.reference}${
            item.category ? `\nTipo: ${item.category}` : ""
          }\nCantidad solicitada: ${item.quantity}`
      )
      .join("\n\n")}\n\nQuedo atento(a) para confirmar precio, disponibilidad y forma de pago.`
    );
  }

  async function handleSendOrder() {
    if (items.length === 0 || isSending || orderAlreadySent) {
      return;
    }

    setIsSending(true);
    setFeedback("");
    const whatsappWindow = window.open("about:blank", "_blank");

    if (whatsappWindow) {
      whatsappWindow.opener = null;
    }

    try {
      const response = await fetch("/api/orders", {
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
          })),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        id?: string;
        message?: string;
      };

      if (!response.ok || !result.id) {
        whatsappWindow?.close();
        setFeedback(result.message ?? "No se pudo registrar el pedido.");
        return;
      }

      const cartWhatsappUrl = `${whatsappUrl}?text=${buildWhatsappMessage(result.id)}`;
      if (whatsappWindow) {
        whatsappWindow.location.href = cartWhatsappUrl;
      } else {
        window.open(cartWhatsappUrl, "_blank", "noopener,noreferrer");
      }
      setSentOrderId(result.id);
      setFeedback("Pedido registrado. Se abrió WhatsApp para continuar la atención.");
      clearCart();
    } catch {
      whatsappWindow?.close();
      setFeedback("No se pudo conectar con el sistema. Intenta de nuevo.");
    } finally {
      setIsSending(false);
    }
  }

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
            <h2>
              {orderAlreadySent
                ? `Pedido #${sentOrderId.slice(-6).toUpperCase()} registrado`
                : "No hay productos seleccionados"}
            </h2>
            <p>
              {orderAlreadySent
                ? feedback
                : "Agrega productos desde el catálogo para crear una solicitud."}
            </p>
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
                    {item.variantName ? (
                      <strong className="cartVariantName">{item.variantName}</strong>
                    ) : null}
                    <span className="reference">{item.reference}</span>
                    {item.details ? <p>{summarizeDetails(item.details)}</p> : null}
                  </div>
                  <div className="cartItemActions">
                    <div className="quantityControl" aria-label="Cambiar cantidad">
                      <button
                        className="quantityButton"
                        type="button"
                        aria-label="Bajar cantidad"
                        disabled={item.quantity === 1}
                        onClick={() =>
                          handleCartChange(() => decreaseItemQuantity(item.id))
                        }
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        className="quantityButton"
                        type="button"
                        aria-label="Subir cantidad"
                        disabled={
                          item.availableStock !== undefined &&
                          item.quantity >= item.availableStock
                        }
                        onClick={() =>
                          handleCartChange(() => increaseItemQuantity(item.id))
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      className="iconButton"
                      type="button"
                      title="Quitar producto"
                      onClick={() => handleCartChange(() => removeItem(item.id))}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside className="summaryPanel">
              <h2>Resumen</h2>
              <p>
                {totalQuantity} {unitText} en {items.length} {productText}.
              </p>
              <p>
                El almacén confirmará precio, disponibilidad y forma de pago por
                WhatsApp.
              </p>
              {feedback ? <p className="cartFeedbackMessage">{feedback}</p> : null}
              <button
                className="primaryButton fullWidth"
                disabled={isSending || orderAlreadySent}
                onClick={handleSendOrder}
                type="button"
              >
                <Send size={18} />
                {isSending
                  ? "Registrando pedido..."
                  : orderAlreadySent
                    ? "Pedido registrado"
                    : "Enviar pedido por WhatsApp"}
              </button>
              <Link className="secondaryButton fullWidth" href="/catalogo">
                <ArrowLeft size={18} />
                Seguir viendo catálogo
              </Link>
              <button
                className="secondaryButton fullWidth"
                onClick={() => handleCartChange(clearCart)}
              >
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
