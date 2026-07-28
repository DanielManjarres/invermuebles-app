"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Minus,
  PackageSearch,
  Plus,
  ReceiptText,
  Search,
  Trash2,
} from "lucide-react";
import type { AdminCustomer } from "@/lib/customers";
import type { AdminOrder } from "@/lib/orders";
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
  orders: AdminOrder[];
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

function formatNumericInput(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(value);
}

type MoneyInputProps = {
  value: number;
  onValueChange: (value: number) => void;
};

function MoneyInput({ value, onValueChange }: MoneyInputProps) {
  const [textValue, setTextValue] = useState(
    value > 0 ? formatNumericInput(value) : ""
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(value > 0 ? formatNumericInput(value) : "");
    }
  }, [isFocused, value]);

  function handleChange(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "");
    setTextValue(digits);
    onValueChange(digits ? Number(digits) : 0);
  }

  return (
    <input
      aria-label="Valor en pesos"
      autoComplete="off"
      inputMode="numeric"
      onBlur={() => {
        setIsFocused(false);
        setTextValue(value > 0 ? formatNumericInput(value) : "");
      }}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={() => {
        setIsFocused(true);
        setTextValue(value > 0 ? String(value) : "");
      }}
      placeholder="0"
      type="text"
      value={textValue}
    />
  );
}

type QuantityInputProps = {
  max: number;
  value: number;
  onValueChange: (value: number) => void;
};

function QuantityInput({ max, value, onValueChange }: QuantityInputProps) {
  const [textValue, setTextValue] = useState(String(value));

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  function handleChange(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "");
    setTextValue(digits);

    if (!digits) return;

    const nextQuantity = Math.min(Math.max(1, Number(digits)), max);
    onValueChange(nextQuantity);
  }

  return (
    <input
      aria-label="Cantidad"
      inputMode="numeric"
      onBlur={() => {
        const nextQuantity = textValue
          ? Math.min(Math.max(1, Number(textValue)), max)
          : 1;
        onValueChange(nextQuantity);
        setTextValue(String(nextQuantity));
      }}
      onChange={(event) => handleChange(event.target.value)}
      type="text"
      value={textValue}
    />
  );
}

type FlexibleNumberInputProps = {
  allowDecimal?: boolean;
  max: number;
  min: number;
  onValueChange: (value: number) => void;
  value: number;
};

function FlexibleNumberInput({
  allowDecimal = false,
  max,
  min,
  onValueChange,
  value,
}: FlexibleNumberInputProps) {
  const [textValue, setTextValue] = useState(String(value));

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  function clamp(nextValue: number) {
    return Math.min(Math.max(min, nextValue), max);
  }

  function handleChange(nextValue: string) {
    const normalized = allowDecimal
      ? nextValue.replace(",", ".")
      : nextValue.replace(/\D/g, "");

    if (allowDecimal && !/^\d*(?:\.\d{0,2})?$/.test(normalized)) {
      return;
    }

    setTextValue(normalized);

    if (normalized === "" || normalized === ".") {
      return;
    }

    const parsedValue = Number(normalized);
    if (Number.isFinite(parsedValue)) {
      onValueChange(clamp(parsedValue));
    }
  }

  return (
    <input
      aria-label={allowDecimal ? "Porcentaje de interés" : "Plazo en meses"}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      onBlur={() => {
        const parsedValue = Number(textValue.replace(",", "."));
        const nextValue = Number.isFinite(parsedValue) ? clamp(parsedValue) : min;
        onValueChange(nextValue);
        setTextValue(String(nextValue));
      }}
      onChange={(event) => handleChange(event.target.value)}
      type="text"
      value={textValue}
    />
  );
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
  orders,
  products: initialProducts,
  sales: initialSales,
}: AdminSalesManagerProps) {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get("pedido") ?? "";
  const [products] = useState(initialProducts);
  const [sales] = useState(initialSales);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleType, setSaleType] = useState<AdminSale["type"]>("CASH");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState(0);
  const [creditMonths, setCreditMonths] = useState(6);
  const [interestPercent, setInterestPercent] = useState(20);
  const [sistecreditoApproval, setSistecreditoApproval] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState<SaleCartItem[]>([]);
  const [hasLoadedAdminCart, setHasLoadedAdminCart] = useState(false);
  const [preparedOrderId, setPreparedOrderId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const adminSaleCart = useAdminSaleCart(products);

  const preparedOrder = useMemo(
    () => orders.find((order) => order.id === orderIdFromUrl),
    [orderIdFromUrl, orders]
  );

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
  const isFinanced = saleType === "CREDIT" || saleType === "CREDIT_CASH";
  const isReserved = saleType === "RESERVED";
  const isSistecredito = saleType === "SISTECREDITO";
  const financeBase =
    saleType === "CREDIT_CASH" ? Math.max(cartTotal - amountPaid, 0) : cartTotal;
  const interestRate = interestPercent / 100;
  const estimatedCreditDebt = isFinanced
    ? Math.max(financeBase * (1 + interestRate) - (saleType === "CREDIT" ? amountPaid : 0), 0)
    : 0;
  const reservedMinimum = cartTotal * 0.1;
  const balance = Math.max(cartTotal - amountPaid, 0);
  const activeSales = sales.filter((sale) => sale.status !== "CANCELLED");
  const totalSold = activeSales.reduce((total, sale) => total + sale.total, 0);

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

    if (orderIdFromUrl) {
      if (!preparedOrder || preparedOrder.status !== "CONFIRMED" || preparedOrder.saleId) {
        setNotice("El pedido seleccionado no esta disponible para preparar una venta.");
      } else {
        setCartItems(
          preparedOrder.items.flatMap((item) => {
            const product = products.find((currentProduct) => currentProduct.id === item.productId);
            return product
              ? [{ product, quantity: item.quantity, unitPrice: product.salePrice }]
              : [];
          })
        );
        setPreparedOrderId(preparedOrder.id);
        setSelectedCustomerId(preparedOrder.customerId);
        setNotes(preparedOrder.notes || "Venta preparada desde pedido web.");
        setNotice("Pedido cargado. Define la modalidad, precios y condiciones antes de finalizar.");
      }
    } else {
      setCartItems(
        adminSaleCart.detailedItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
        }))
      );
    }
    setHasLoadedAdminCart(true);

    if (!orderIdFromUrl && adminSaleCart.detailedItems.length > 0) {
      setNotice("Productos cargados desde el catálogo administrativo.");
    }
  }, [
    adminSaleCart.detailedItems,
    hasLoadedAdminCart,
    orderIdFromUrl,
    preparedOrder,
    products,
  ]);

  useEffect(() => {
    if (saleType === "CASH" || saleType === "SISTECREDITO") {
      setAmountPaid(cartTotal);
    }
    if (saleType === "RESERVED" && amountPaid === 0 && cartTotal > 0) {
      setAmountPaid(Math.ceil(cartTotal * 0.1));
    }
  }, [amountPaid, cartTotal, saleType]);

  function changeSaleType(nextType: string) {
    setSaleType(nextType as AdminSale["type"]);
    setSistecreditoApproval("");

    if (nextType === "CASH") {
      setPaymentMethod("CASH");
      setAmountPaid(cartTotal);
      return;
    }

    if (nextType === "SISTECREDITO") {
      setPaymentMethod("CASH");
      setAmountPaid(cartTotal);
      return;
    }

    if (nextType === "RESERVED") {
      setPaymentMethod("CASH");
      setAmountPaid(Math.ceil(cartTotal * 0.1));
      return;
    }

    if (nextType === "CREDIT") {
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
    if (cartItems.length === 0 || isSaving) return;

    if (!selectedCustomerId) {
      setNotice("Selecciona el cliente que realiza la compra.");
      return;
    }

    if (amountPaid > cartTotal) {
      setNotice("El pago inicial no puede ser mayor al total de la venta.");
      return;
    }

    if (saleType === "CASH" && amountPaid !== cartTotal) {
      setNotice("En contado se debe registrar el valor completo de la venta.");
      return;
    }

    if (isReserved && amountPaid < reservedMinimum) {
      setNotice("El separado requiere un abono minimo del 10 % del total.");
      return;
    }

    if (saleType === "CREDIT_CASH" && amountPaid <= 0) {
      setNotice("El credicontado requiere registrar un pago inicial.");
      return;
    }

    if (isSistecredito && !sistecreditoApproval.trim()) {
      setNotice("Registra el numero de aprobacion de Sistecredito.");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/sales", {
        body: JSON.stringify({
          customerId: selectedCustomerId,
          creditMonths: isFinanced ? creditMonths : undefined,
          interestRate: isFinanced ? interestPercent : undefined,
          initialPayment: amountPaid,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          notes,
          orderId: preparedOrderId || undefined,
          paymentMethod: amountPaid > 0 && !isSistecredito ? paymentMethod : undefined,
          sistecreditoApproval: isSistecredito ? sistecreditoApproval.trim() : undefined,
          type: saleType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as {
        id?: string;
        message?: string;
        stockApplied?: boolean;
      };

      if (!response.ok || !result.id) {
        setNotice(result.message ?? "No se pudo registrar la venta.");
        return;
      }

      setNotice(result.message ?? "Venta registrada correctamente.");
      clearAdminSaleCart();
      window.setTimeout(() => {
        window.location.assign("/admin/ventas");
      }, 700);
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
              <p>Toda venta queda asociada a un cliente para conservar su historial.</p>
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
                placeholder="Selecciona un cliente"
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
                      <QuantityInput
                        max={item.product.stock}
                        onValueChange={(nextQuantity) =>
                          updateQuantity(item.product.id, nextQuantity)
                        }
                        value={item.quantity}
                      />
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
                    <MoneyInput
                      onValueChange={(nextPrice) =>
                        updateUnitPrice(item.product.id, String(nextPrice))
                      }
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
              <strong>Condiciones de la venta</strong>
              <p>Registra el pago inicial y la modalidad acordada con el cliente.</p>
            </div>
          </div>

          {saleType === "CASH" ? (
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
              <div className="saleBalanceBox">
                <span>Valor recibido</span>
                <strong>{formatMoney(cartTotal)}</strong>
              </div>
              <div className="saleBalanceBox">
                <span>Saldo pendiente</span>
                <strong>{formatMoney(0)}</strong>
              </div>
            </div>
          ) : null}

          {isFinanced ? (
            <div className="salePaymentGrid">
              <label>
                Plazo en meses
                <FlexibleNumberInput
                  max={120}
                  min={1}
                  onValueChange={setCreditMonths}
                  value={creditMonths}
                />
              </label>
              <label>
                Interés acordado (%)
                <FlexibleNumberInput
                  allowDecimal
                  max={100}
                  min={0}
                  onValueChange={setInterestPercent}
                  value={interestPercent}
                />
              </label>
              <label>
                {saleType === "CREDIT_CASH" ? "Pago inicial" : "Abono inicial"}
                <MoneyInput
                  onValueChange={setAmountPaid}
                  value={amountPaid}
                />
              </label>
              <div className="saleBalanceBox">
                <span>Deuda estimada</span>
                <strong>{formatMoney(estimatedCreditDebt)}</strong>
              </div>
              {amountPaid > 0 ? (
                <label>
                  Medio del pago inicial
                  <SelectMenu
                    onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                    options={paymentMethodOptions}
                    placeholder="Selecciona medio"
                    value={paymentMethod}
                  />
                </label>
              ) : null}
              <p className="salePaymentHint">
                Se aplicará {interestPercent} % de interés sobre el saldo financiado a {creditMonths} mes(es). Los próximos abonos podrán disminuir intereses pendientes.
              </p>
            </div>
          ) : null}

          {isReserved ? (
            <div className="salePaymentGrid">
              <label>
                Medio del abono
                <SelectMenu
                  onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  options={paymentMethodOptions}
                  placeholder="Selecciona medio"
                  value={paymentMethod}
                />
              </label>
              <label>
                Abono inicial
                <MoneyInput
                  onValueChange={setAmountPaid}
                  value={amountPaid}
                />
              </label>
              <div className="saleBalanceBox">
                <span>Saldo por pagar</span>
                <strong>{formatMoney(balance)}</strong>
              </div>
              <p className="salePaymentHint">
                Mínimo para separar: {formatMoney(reservedMinimum)}. El producto sigue disponible hasta completar el pago, con plazo máximo de tres meses.
              </p>
            </div>
          ) : null}

          {isSistecredito ? (
            <div className="salePaymentGrid">
              <label>
                Número de aprobación
                <input
                  onChange={(event) => setSistecreditoApproval(event.target.value)}
                  placeholder="Ej: aprobación Sistecrédito"
                  type="text"
                  value={sistecreditoApproval}
                />
              </label>
              <div className="saleBalanceBox">
                <span>Valor cubierto por Sistecrédito</span>
                <strong>{formatMoney(cartTotal)}</strong>
              </div>
              <div className="saleBalanceBox">
                <span>Saldo del cliente</span>
                <strong>{formatMoney(0)}</strong>
              </div>
              <p className="salePaymentHint">
                Al registrar la aprobación, la venta queda pagada completamente y pendiente de entrega.
              </p>
            </div>
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
              {isSaving
                ? "Guardando venta..."
                : isReserved
                  ? "Registrar separado"
                  : isFinanced
                    ? "Crear venta a crédito"
                    : isSistecredito
                      ? "Registrar Sistecrédito"
                      : "Finalizar venta"}
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
                      {saleTypeLabels[sale.type]}
                      {sale.paymentMethod
                        ? ` · ${paymentMethodLabels[sale.paymentMethod]}`
                        : ""}
                      {sale.creditMonths && sale.interestRate !== null
                        ? ` · ${sale.creditMonths} meses · ${sale.interestRate} % interés`
                        : ""}
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
