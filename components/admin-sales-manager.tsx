"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ReceiptText, Search, ShoppingCart, Trash2 } from "lucide-react";
import type { AdminCustomer } from "@/lib/customers";
import type { Product } from "@/lib/products";
import {
  saleSourceLabels,
  saleStatusLabels,
  saleTypeLabels,
  type AdminSale,
} from "@/lib/sales";
import { SelectMenu } from "@/components/select-menu";

type SaleCartItem = {
  product: Product;
  quantity: number;
};

type AdminSalesManagerProps = {
  customers: AdminCustomer[];
  products: Product[];
  sales: AdminSale[];
};

const saleTypeOptions = Object.entries(saleTypeLabels).map(([value, label]) => ({
  label,
  value,
}));

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "COP",
  }).format(value);
}

function getSaleSearchText(sale: AdminSale) {
  return [
    sale.shortId,
    sale.customerName,
    sale.customerDocument,
    sale.type,
    sale.source,
    sale.notes,
    ...sale.items.flatMap((item) => [
      item.productName,
      item.productReference,
      item.productCategory,
      item.productClass,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

export function AdminSalesManager({
  customers,
  products: initialProducts,
  sales: initialSales,
}: AdminSalesManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [sales, setSales] = useState(initialSales);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [saleType, setSaleType] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState<SaleCartItem[]>([]);
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const availableProducts = useMemo(
    () => products.filter((product) => product.stock > 0),
    [products]
  );
  const productOptions = availableProducts.map((product) => ({
    label: `${product.name} - ${product.reference} (${product.stock})`,
    value: product.id,
  }));
  const customerOptions = customers.map((customer) => ({
    label: customer.document
      ? `${customer.fullName} - CC ${customer.document}`
      : customer.fullName,
    value: customer.id,
  }));
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.product.salePrice * item.quantity,
    0
  );
  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const filteredSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sales;
    }

    return sales.filter((sale) => getSaleSearchText(sale).includes(normalizedQuery));
  }, [query, sales]);
  const completedSales = sales.filter((sale) => sale.status === "COMPLETED");
  const totalSold = completedSales.reduce((total, sale) => total + sale.total, 0);

  function addSelectedProduct() {
    const product = products.find((currentProduct) => currentProduct.id === selectedProductId);

    if (!product || product.stock < 1) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.product.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.stock),
              }
            : item
        );
      }

      return [...currentItems, { product, quantity: 1 }];
    });
    setSelectedProductId("");
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: Math.min(Math.max(1, nextQuantity), item.product.stock),
            }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.product.id !== productId)
    );
  }

  async function createLocalSale() {
    if (cartItems.length === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/sales", {
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          notes,
          type: saleType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { id?: string; message?: string };

      if (!response.ok || !result.id) {
        setNotice(result.message ?? "No se pudo registrar la venta.");
        return;
      }

      const createdSale: AdminSale = {
        id: result.id,
        shortId: result.id.slice(-6).toUpperCase(),
        customerId: selectedCustomerId,
        customerName:
          customers.find((customer) => customer.id === selectedCustomerId)?.fullName ??
          "Venta sin cliente registrado",
        customerDocument:
          customers.find((customer) => customer.id === selectedCustomerId)?.document ?? "",
        orderId: "",
        orderShortId: "",
        source: "LOCAL",
        type: saleType as AdminSale["type"],
        status: "COMPLETED",
        notes,
        total: cartTotal,
        createdAt: new Date().toLocaleString("es-CO", {
          dateStyle: "short",
          timeStyle: "short",
        }),
        createdAtISO: new Date().toISOString(),
        totalQuantity: cartQuantity,
        items: cartItems.map((item) => ({
          id: `${result.id}-${item.product.id}`,
          productId: item.product.id,
          productName: item.product.name,
          productReference: item.product.reference,
          productCategory: item.product.category,
          productClass: item.product.productClass,
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
          lineTotal: item.product.salePrice * item.quantity,
        })),
      };

      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const soldItem = cartItems.find((item) => item.product.id === product.id);
          return soldItem
            ? { ...product, stock: product.stock - soldItem.quantity }
            : product;
        })
      );
      setSales((currentSales) => [createdSale, ...currentSales]);
      setCartItems([]);
      setSelectedCustomerId("");
      setSaleType("CASH");
      setNotes("");
      setNotice(`Venta #${createdSale.shortId} registrada correctamente.`);
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tableSection salesSection">
      <div className="movementSummaryGrid" aria-label="Resumen de ventas">
        <article>
          <span>Total ventas</span>
          <strong>{sales.length}</strong>
        </article>
        <article>
          <span>Ventas locales</span>
          <strong>{sales.filter((sale) => sale.source === "LOCAL").length}</strong>
        </article>
        <article>
          <span>Desde pedidos</span>
          <strong>{sales.filter((sale) => sale.source === "ORDER").length}</strong>
        </article>
        <article>
          <span>Total vendido</span>
          <strong>{formatMoney(totalSold)}</strong>
        </article>
      </div>

      <div className="salesLayout">
        <article className="localSalePanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Venta local</p>
              <h2>Registrar venta en el almacén</h2>
              <p className="sectionLead">
                Selecciona cliente, productos y tipo de venta. Al guardar se
                descuenta inventario automáticamente.
              </p>
            </div>
          </div>

          <div className="saleFormGrid">
            <label>
              Cliente
              <SelectMenu
                onChange={setSelectedCustomerId}
                options={customerOptions}
                placeholder="Venta sin cliente"
                value={selectedCustomerId}
              />
            </label>
            <label>
              Tipo de venta
              <SelectMenu
                onChange={setSaleType}
                options={saleTypeOptions}
                placeholder="Selecciona tipo"
                value={saleType}
              />
            </label>
          </div>

          <div className="saleProductPicker">
            <label>
              Producto
              <SelectMenu
                onChange={setSelectedProductId}
                options={productOptions}
                placeholder="Selecciona un producto"
                value={selectedProductId}
              />
            </label>
            <button
              className="secondaryButton"
              disabled={!selectedProductId}
              type="button"
              onClick={addSelectedProduct}
            >
              <Plus size={18} />
              Agregar
            </button>
          </div>

          <div className="saleCartList">
            {cartItems.length === 0 ? (
              <div className="emptyState compactEmptyState">
                <h2>Sin productos</h2>
                <p>Agrega productos para crear la venta local.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <article className="saleCartItem" key={item.product.id}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>
                      {item.product.reference} · {formatMoney(item.product.salePrice)}
                    </span>
                  </div>
                  <div className="quantityControl" aria-label="Cambiar cantidad">
                    <button
                      className="quantityButton"
                      type="button"
                      disabled={item.quantity === 1}
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="quantityButton"
                      type="button"
                      disabled={item.quantity >= item.product.stock}
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <strong>{formatMoney(item.product.salePrice * item.quantity)}</strong>
                  <button
                    className="iconButton"
                    type="button"
                    title="Quitar producto"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))
            )}
          </div>

          <label className="saleNotes">
            Observaciones
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: venta de contado en local, entrega inmediata."
              rows={2}
              value={notes}
            />
          </label>

          {notice ? <p className="inlineNotice">{notice}</p> : null}

          <div className="saleSummaryBar">
            <div>
              <span>{cartQuantity} unidad(es)</span>
              <strong>{formatMoney(cartTotal)}</strong>
            </div>
            <button
              className="primaryButton"
              disabled={cartItems.length === 0 || isSaving}
              type="button"
              onClick={createLocalSale}
            >
              <ReceiptText size={18} />
              {isSaving ? "Guardando venta..." : "Finalizar venta"}
            </button>
          </div>
        </article>

        <article className="salesHistoryPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Historial comercial</p>
              <h2>Ventas registradas</h2>
            </div>
          </div>

          <label className="searchBox">
            <Search size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por venta, cliente o producto"
              type="search"
              value={query}
            />
          </label>

          <div className="salesList">
            {filteredSales.length === 0 ? (
              <div className="emptyState compactEmptyState">
                <h2>No hay ventas registradas</h2>
                <p>Cuando finalices una venta, aparecerá en este historial.</p>
              </div>
            ) : (
              filteredSales.map((sale) => (
                <article className="saleHistoryCard" key={sale.id}>
                  <div>
                    <span className="saleBadge">{saleStatusLabels[sale.status]}</span>
                    <h3>Venta #{sale.shortId}</h3>
                    <p>
                      {sale.createdAt} · {saleSourceLabels[sale.source]} ·{" "}
                      {saleTypeLabels[sale.type]}
                    </p>
                  </div>
                  <div>
                    <strong>{sale.customerName}</strong>
                    <span>
                      {sale.customerDocument
                        ? `CC ${sale.customerDocument}`
                        : "Sin cédula"}
                    </span>
                  </div>
                  <div className="saleHistoryItems">
                    {sale.items.map((item) => (
                      <span key={item.id}>
                        {item.productName} x {item.quantity}
                      </span>
                    ))}
                  </div>
                  <strong>{formatMoney(sale.total)}</strong>
                </article>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
