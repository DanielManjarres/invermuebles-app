"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Minus,
  PackageSearch,
  Plus,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import type { AdminCustomer } from "@/lib/customers";
import type { Product } from "@/lib/products";
import {
  paymentMethodLabels,
  saleSourceLabels,
  saleStatusLabels,
  saleTypeLabels,
  type AdminSale,
  type PaymentMethod,
} from "@/lib/sales";
import { SelectMenu } from "@/components/select-menu";
import {
  clearAdminSaleCart,
  useAdminSaleCart,
} from "@/components/use-admin-sale-cart";

type SaleCartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
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

const paymentMethodOptions = Object.entries(paymentMethodLabels).map(
  ([value, label]) => ({
    label,
    value,
  })
);

const sourceFilters = [
  { label: "Todas", value: "ALL" },
  { label: "Locales", value: "LOCAL" },
  { label: "Desde pedidos", value: "ORDER" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "COP",
  }).format(value);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getSaleSearchText(sale: AdminSale) {
  return [
    sale.shortId,
    sale.customerName,
    sale.customerDocument,
    sale.type,
    sale.paymentMethod,
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
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleType, setSaleType] = useState("CASH");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState<SaleCartItem[]>([]);
  const [hasLoadedAdminCart, setHasLoadedAdminCart] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const adminSaleCart = useAdminSaleCart(products);

  const availableProducts = useMemo(
    () => products.filter((product) => product.stock > 0),
    [products]
  );

  const customerOptions = useMemo(() => {
    const search = normalizeText(customerQuery);

    return customers
      .filter((customer) =>
        [customer.fullName, customer.document, customer.phone, customer.city]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
      .map((customer) => ({
        label: customer.document
          ? `${customer.fullName} - CC ${customer.document}`
          : customer.fullName,
        value: customer.id,
      }));
  }, [customerQuery, customers]);

  const productOptions = useMemo(() => {
    const search = normalizeText(productQuery);
    const selectedIds = new Set(cartItems.map((item) => item.product.id));

    return availableProducts
      .filter((product) => !selectedIds.has(product.id))
      .filter((product) =>
        [product.name, product.reference, product.category, product.productClass]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
      .map((product) => ({
        label: `${product.name} - ${product.reference} (${product.stock})`,
        value: product.id,
      }));
  }, [availableProducts, cartItems, productQuery]);

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );
  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const requiresCustomer = ["CREDIT", "RESERVED", "CREDIT_CASH", "SISTECREDITO"].includes(
    saleType
  );
  const balance = Math.max(cartTotal - amountPaid, 0);
  const completedSales = sales.filter((sale) => sale.status === "COMPLETED");
  const totalSold = completedSales.reduce((total, sale) => total + sale.total, 0);

  const filteredSales = useMemo(() => {
    const search = normalizeText(historyQuery);

    return sales.filter((sale) => {
      const matchesSearch = search ? getSaleSearchText(sale).includes(search) : true;
      const matchesSource =
        sourceFilter === "ALL" ? true : sale.source === sourceFilter;

      return matchesSearch && matchesSource;
    });
  }, [historyQuery, sales, sourceFilter]);

  useEffect(() => {
    if (hasLoadedAdminCart) {
      return;
    }

    setCartItems(
      adminSaleCart.detailedItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.product.salePrice,
      }))
    );
    setHasLoadedAdminCart(true);

    if (adminSaleCart.detailedItems.length > 0) {
      setNotice("Productos cargados desde el catálogo administrativo.");
    }
  }, [adminSaleCart.detailedItems, hasLoadedAdminCart]);

  useEffect(() => {
    if (saleType === "CASH" || saleType === "SISTECREDITO") {
      setAmountPaid(cartTotal);
    }
  }, [cartTotal, saleType]);

  function changeSaleType(nextType: string) {
    setSaleType(nextType);

    if (nextType === "CASH") {
      setPaymentMethod("CASH");
      setAmountPaid(cartTotal);
      return;
    }

    if (nextType === "SISTECREDITO") {
      setPaymentMethod("SISTECREDITO");
      setAmountPaid(cartTotal);
      return;
    }

    if (nextType === "CREDIT" || nextType === "RESERVED") {
      setPaymentMethod("PENDING");
      setAmountPaid(0);
      return;
    }

    setPaymentMethod("CASH");
    setAmountPaid(0);
  }

  function addSelectedProduct() {
    const product = products.find((currentProduct) => currentProduct.id === selectedProductId);

    if (!product || product.stock < 1) {
      return;
    }

    setCartItems((currentItems) => [
      ...currentItems,
      { product, quantity: 1, unitPrice: product.salePrice },
    ]);
    setSelectedProductId("");
    setProductQuery("");
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

  function updateUnitPrice(productId: string, nextValue: string) {
    const nextPrice = Number(nextValue);

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              unitPrice: Number.isFinite(nextPrice) && nextPrice >= 0 ? nextPrice : 0,
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

    if (requiresCustomer && !selectedCustomerId) {
      setNotice(
        "Selecciona un cliente para ventas a credito, separado, credicontado o Sistecredito."
      );
      return;
    }

    if (amountPaid > cartTotal) {
      setNotice("El valor recibido no puede ser mayor al total de la venta.");
      return;
    }

    if (saleType === "CASH" && amountPaid < cartTotal) {
      setNotice("En ventas de contado, el valor recibido debe cubrir el total.");
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
            unitPrice: item.unitPrice,
          })),
          notes,
          paymentMethod,
          amountPaid,
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

      const selectedCustomer = customers.find(
        (customer) => customer.id === selectedCustomerId
      );
      const createdSale: AdminSale = {
        id: result.id,
        shortId: result.id.slice(-6).toUpperCase(),
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.fullName ?? "Venta sin cliente registrado",
        customerDocument: selectedCustomer?.document ?? "",
        orderId: "",
        orderShortId: "",
        source: "LOCAL",
        type: saleType as AdminSale["type"],
        status: "COMPLETED",
        paymentMethod,
        amountPaid,
        balance,
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
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
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
      clearAdminSaleCart();
      setSelectedCustomerId("");
      setSaleType("CASH");
      setPaymentMethod("CASH");
      setAmountPaid(0);
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
              <h2>Finalizar venta del almacén</h2>
              <p className="sectionLead">
                Agrega productos desde el catálogo administrativo, revisa
                cantidades, ajusta el precio real y registra la venta.
              </p>
            </div>
          </div>

          <div className="saleStepHeader">
            <span>1</span>
            <div>
              <strong>Datos de la venta</strong>
              <p>El cliente puede quedar vacío si es una venta rápida.</p>
            </div>
          </div>

          <div className="saleFormGrid">
            <label>
              Buscar cliente
              <div className="searchBox compactSearchBox">
                <Search size={18} />
                <input
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Cédula, nombre o teléfono"
                  type="search"
                  value={customerQuery}
                />
              </div>
            </label>
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
                onChange={changeSaleType}
                options={saleTypeOptions}
                placeholder="Selecciona tipo"
                value={saleType}
              />
            </label>
          </div>

          <div className="saleStepHeader">
            <span>2</span>
            <div>
              <strong>Productos seleccionados</strong>
              <p>También puedes buscar y agregar otro producto sin volver al catálogo.</p>
            </div>
          </div>

          <div className="saleProductPicker">
            <label>
              Buscar producto
              <div className="searchBox compactSearchBox">
                <PackageSearch size={18} />
                <input
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Nombre, referencia, tipo o clase"
                  type="search"
                  value={productQuery}
                />
              </div>
            </label>
            <label>
              Producto adicional
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
                <p>Agrega productos desde el catálogo admin para iniciar la venta.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <article className="saleCartItem" key={item.product.id}>
                  <div className="saleCartProductInfo">
                    <strong>{item.product.name}</strong>
                    <span>
                      {item.product.reference} · Base {formatMoney(item.product.salePrice)}
                    </span>
                  </div>
                  <div className="saleQuantityBlock">
                    <span>Cantidad</span>
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
                  </div>
                  <label className="salePriceField">
                    Precio vendido
                    <input
                      min="0"
                      onChange={(event) =>
                        updateUnitPrice(item.product.id, event.target.value)
                      }
                      type="number"
                      value={item.unitPrice}
                    />
                  </label>
                  <div className="saleLineTotal">
                    <span>Subtotal</span>
                    <strong>{formatMoney(item.unitPrice * item.quantity)}</strong>
                  </div>
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

          <div className="saleStepHeader">
            <span>3</span>
            <div>
              <strong>Medio de pago</strong>
              <p>Registra por donde paga el cliente y si queda saldo pendiente.</p>
            </div>
          </div>

          <div className="salePaymentGrid">
            <label>
              Medio de pago
              <SelectMenu
                onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                options={paymentMethodOptions}
                placeholder="Selecciona medio"
                value={paymentMethod}
              />
            </label>
            <label>
              Valor recibido / abono
              <input
                min="0"
                onChange={(event) =>
                  setAmountPaid(event.target.value ? Number(event.target.value) : 0)
                }
                type="number"
                value={amountPaid}
              />
            </label>
            <div className="saleBalanceBox">
              <span>Saldo pendiente</span>
              <strong>{formatMoney(balance)}</strong>
            </div>
          </div>

          {requiresCustomer ? (
            <p className="salePaymentHint">
              Este tipo de venta debe quedar asociado a un cliente.
            </p>
          ) : null}

          <label className="saleNotes">
            Observaciones
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: descuento autorizado, entrega inmediata, venta de contado."
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
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Buscar por venta, cliente o producto"
              type="search"
              value={historyQuery}
            />
          </label>

          <div className="filterGroup saleHistoryFilters" aria-label="Filtrar ventas">
            {sourceFilters.map((filter) => (
              <button
                className={
                  sourceFilter === filter.value ? "filterButton active" : "filterButton"
                }
                key={filter.value}
                type="button"
                onClick={() => setSourceFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

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
                      {saleTypeLabels[sale.type]} ·{" "}
                      {paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod}
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
                  <div className="salePaymentSummary">
                    <strong>{formatMoney(sale.total)}</strong>
                    <span>Recibido: {formatMoney(sale.amountPaid)}</span>
                    {sale.balance > 0 ? (
                      <span>Saldo: {formatMoney(sale.balance)}</span>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
