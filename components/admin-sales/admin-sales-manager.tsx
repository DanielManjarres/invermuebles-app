"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AdminCustomer } from "@/lib/customers";
import type { AdminOrder } from "@/lib/orders";
import type { Product, ProductInventoryVariant } from "@/lib/products";
import {
  AdminLocalSaleForm,
  type SaleCartItem,
} from "@/components/admin-sales/local-sale-form";
import { AdminSalesHistory } from "@/components/admin-sales/sales-history";
import { AdminSalesModals } from "@/components/admin-sales/sales-modals";
import { NumberingSetupModal } from "@/components/admin-sales/numbering-setup-modal";
import type { InitialSaleNumbering } from "@/lib/document-numbering";
import { type AdminSale, type PaymentMethod } from "@/lib/sales";
import {
  clearAdminSaleCart,
  useAdminSaleCart,
} from "@/components/admin-sales/use-admin-sale-cart";

type AdminSalesManagerProps = {
  customers: AdminCustomer[];
  orders: AdminOrder[];
  products: Product[];
  sales: AdminSale[];
};

type SaleChoice = {
  lineId: string;
  product: Product;
  variant: ProductInventoryVariant | undefined;
};

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
      item.variantName,
      item.productReference,
      ...item.variantAttributes.map((attribute) => attribute.value),
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
  const customerFromUrl = searchParams.get("cliente") ?? "";
  const [products] = useState(initialProducts);
  const [sales, setSales] = useState(initialSales);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleType, setSaleType] = useState<AdminSale["type"]>("CASH");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState(0);
  const [creditMonths, setCreditMonths] = useState(6);
  const [interestPercent, setInterestPercent] = useState(20);
  const [hasAdjustedCreditPayment, setHasAdjustedCreditPayment] = useState(false);
  const [sistecreditoApproval, setSistecreditoApproval] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState(customerFromUrl);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState<SaleCartItem[]>([]);
  const [hasLoadedAdminCart, setHasLoadedAdminCart] = useState(false);
  const [preparedOrderId, setPreparedOrderId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saleToDelete, setSaleToDelete] = useState<AdminSale | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState("");
  const [deliveringSaleId, setDeliveringSaleId] = useState("");
  const [saleToUpdateDelivery, setSaleToUpdateDelivery] = useState<AdminSale | null>(null);
  const [deliveryAction, setDeliveryAction] = useState<"DELIVER" | "UNDO_DELIVERY">("DELIVER");
  const [saleDeleteConfirmation, setSaleDeleteConfirmation] = useState("");
  const [saleToFinance, setSaleToFinance] = useState<AdminSale | null>(null);
  const [financeMonths, setFinanceMonths] = useState(6);
  const [financeInterestRate, setFinanceInterestRate] = useState(20);
  const [financeInitialPayment, setFinanceInitialPayment] = useState(0);
  const [financePaymentMethod, setFinancePaymentMethod] = useState<PaymentMethod | "">("");
  const [financeStatus, setFinanceStatus] = useState<"ACTIVE" | "OVERDUE">("ACTIVE");
  const [isFinancingSale, setIsFinancingSale] = useState(false);
  const [showNumberingSetup, setShowNumberingSetup] = useState(false);
  const adminSaleCart = useAdminSaleCart(products);

  const preparedOrder = useMemo(
    () => orders.find((order) => order.id === orderIdFromUrl),
    [orderIdFromUrl, orders]
  );

  const saleChoices = useMemo<SaleChoice[]>(
    () =>
      products.flatMap<SaleChoice>((product) => {
        if (product.variants?.length) {
          return product.variants
            .filter((variant) => variant.active && variant.stock > 0)
            .map((variant) => ({ lineId: variant.id, product, variant }));
        }

        return product.stock > 0
          ? [{ lineId: product.id, product, variant: undefined }]
          : [];
      }),
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
    const selectedIds = new Set(cartItems.map((item) => item.lineId));

    return saleChoices
      .filter((choice) => !selectedIds.has(choice.lineId))
      .filter(({ product, variant }) =>
        [
          product.name,
          variant?.name,
          variant?.reference ?? product.reference,
          product.category,
          product.productClass,
          ...(variant?.attributes.map((attribute) => attribute.value) ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      )
      .map(({ lineId, product, variant }) => ({
        label: `${product.name}${variant ? ` - ${variant.name}` : ""} - ${variant?.reference ?? product.reference} (${variant?.stock ?? product.stock})`,
        value: lineId,
      }));
  }, [cartItems, productQuery, saleChoices]);

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
  const financedTotalWithInterest = isFinanced
    ? financeBase * (1 + interestRate)
    : 0;
  const suggestedFirstInstallment =
    creditMonths > 0 ? Math.ceil(financedTotalWithInterest / creditMonths) : 0;
  const estimatedCreditBalance = isFinanced
    ? Math.max(
        financedTotalWithInterest - (saleType === "CREDIT" ? amountPaid : 0),
        0
      )
    : 0;
  const reservedMinimum = cartTotal * 0.1;
  const balance = Math.max(cartTotal - amountPaid, 0);
  const totalSold = sales.reduce((total, sale) => total + sale.total, 0);

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
            const variant = item.variantId
              ? product?.variants?.find((currentVariant) => currentVariant.id === item.variantId)
              : undefined;
            return product
              ? [{
                  lineId: variant?.id ?? product.id,
                  product,
                  variant,
                  quantity: item.quantity,
                  unitPrice: variant?.salePrice ?? product.salePrice,
                }]
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
          lineId: item.lineId,
          product: item.product,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: item.variant?.salePrice ?? item.product.salePrice,
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

  useEffect(() => {
    if (saleType === "CREDIT" && !hasAdjustedCreditPayment && cartTotal > 0) {
      setAmountPaid(suggestedFirstInstallment);
    }
  }, [
    cartTotal,
    hasAdjustedCreditPayment,
    saleType,
    suggestedFirstInstallment,
  ]);

  function changeSaleType(nextType: string) {
    setSaleType(nextType as AdminSale["type"]);
    setSistecreditoApproval("");
    setHasAdjustedCreditPayment(false);

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
      setAmountPaid(suggestedFirstInstallment);
      return;
    }

    setPaymentMethod("CASH");
    setAmountPaid(0);
  }

  function addSelectedProduct() {
    const choice = saleChoices.find((item) => item.lineId === selectedProductId);

    if (!choice) {
      return;
    }

    setCartItems((currentItems) => [
      ...currentItems,
      {
        lineId: choice.lineId,
        product: choice.product,
        variant: choice.variant,
        quantity: 1,
        unitPrice: choice.variant?.salePrice ?? choice.product.salePrice,
      },
    ]);
    setSelectedProductId("");
    setProductQuery("");
  }

  function updateQuantity(lineId: string, nextQuantity: number) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              quantity: Math.min(
                Math.max(1, nextQuantity),
                item.variant?.stock ?? item.product.stock,
              ),
            }
          : item
      )
    );
  }

  function updateUnitPrice(lineId: string, nextValue: string) {
    const nextPrice = Number(nextValue);

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              unitPrice: Number.isFinite(nextPrice) && nextPrice >= 0 ? nextPrice : 0,
            }
          : item
      )
    );
  }

  function removeItem(lineId: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.lineId !== lineId)
    );
    if (!orderIdFromUrl) {
      adminSaleCart.removeProduct(lineId);
    }
  }

  async function createLocalSale(numbering?: InitialSaleNumbering) {
    if (cartItems.length === 0 || isSaving) return false;

    if (!selectedCustomerId) {
      setNotice("Selecciona el cliente que realiza la compra.");
      return false;
    }

    const maximumInitialPayment =
      saleType === "CREDIT" ? financedTotalWithInterest : cartTotal;

    if (amountPaid > maximumInitialPayment) {
      setNotice(
        saleType === "CREDIT"
          ? "La primera cuota no puede ser mayor a la deuda total con intereses."
          : "El pago inicial no puede ser mayor al total de la venta."
      );
      return false;
    }

    if (saleType === "CASH" && amountPaid !== cartTotal) {
      setNotice("En contado se debe registrar el valor completo de la venta.");
      return false;
    }

    if (isReserved && amountPaid < reservedMinimum) {
      setNotice("El separado requiere un abono minimo del 10 % del total.");
      return false;
    }

    if (saleType === "CREDIT_CASH" && amountPaid <= 0) {
      setNotice("El credicontado requiere registrar un pago inicial.");
      return false;
    }

    if (isSistecredito && !sistecreditoApproval.trim()) {
      setNotice("Registra el numero de aprobacion de Sistecredito.");
      return false;
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
            variantId: item.variant?.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          notes,
          numbering,
          orderId: preparedOrderId || undefined,
          paymentMethod: amountPaid > 0 && !isSistecredito ? paymentMethod : undefined,
          sistecreditoApproval: isSistecredito ? sistecreditoApproval.trim() : undefined,
          type: saleType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const responseText = await response.text();
      let result: {
        code?: string;
        id?: string;
        message?: string;
        stockApplied?: boolean;
      };

      try {
        result = JSON.parse(responseText) as typeof result;
      } catch {
        result = {
          message: response.ok
            ? "El servidor devolvió una respuesta inválida."
            : `No se pudo registrar la venta (error ${response.status}).`,
        };
      }

      if (!response.ok || !result.id) {
        if (result.code === "NUMBERING_REQUIRED") {
          setShowNumberingSetup(true);
        }
        setNotice(result.message ?? "No se pudo registrar la venta.");
        return false;
      }

      setNotice(result.message ?? "Venta registrada correctamente.");
      clearAdminSaleCart();
      window.setTimeout(() => {
        window.location.assign("/admin/ventas");
      }, 700);
      return true;
    } catch {
      setNotice("No se pudo conectar con el sistema.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSale(sale: AdminSale) {
    if (deletingSaleId || saleDeleteConfirmation !== "ELIMINAR") return;

    setDeletingSaleId(sale.id);

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setNotice(result.message ?? "No se pudo eliminar la venta.");
        setSaleToDelete(null);
        setSaleDeleteConfirmation("");
        return;
      }

      setSales((currentSales) =>
        currentSales.filter((currentSale) => currentSale.id !== sale.id)
      );
      setSaleToDelete(null);
      setSaleDeleteConfirmation("");
      setNotice(result.message ?? `Venta N.º ${sale.shortId} eliminada permanentemente.`);
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setDeletingSaleId("");
    }
  }

  async function updateSaleDelivery(sale: AdminSale) {
    if (deliveringSaleId) return;

    setDeliveringSaleId(sale.id);
    setNotice("");

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: deliveryAction }),
      });
      const result = (await response.json()) as {
        message?: string;
        status?: AdminSale["status"];
      };

      if (!response.ok || !result.status) {
        throw new Error(result.message ?? "No se pudo actualizar la entrega.");
      }

      setSales((currentSales) =>
        currentSales.map((currentSale) =>
          currentSale.id === sale.id
            ? { ...currentSale, status: result.status! }
            : currentSale,
        ),
      );
      setSaleToUpdateDelivery(null);
      setNotice(result.message ?? `Entrega de la venta #${sale.shortId} actualizada.`);
    } catch (deliveryError) {
      setNotice(
        deliveryError instanceof Error
          ? deliveryError.message
          : "No se pudo actualizar la entrega.",
      );
    } finally {
      setDeliveringSaleId("");
    }
  }

  function openCreditConfiguration(sale: AdminSale) {
    setSaleToFinance(sale);
    setFinanceMonths(6);
    setFinanceInterestRate(20);
    setFinanceInitialPayment(0);
    setFinancePaymentMethod("");
    setFinanceStatus("ACTIVE");
    setNotice("");
  }

  async function configureCredit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saleToFinance || isFinancingSale) return;

    setIsFinancingSale(true);
    setNotice("");

    try {
      const response = await fetch(`/api/sales/${saleToFinance.id}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialPayment: financeInitialPayment,
          interestRate: financeInterestRate,
          method: financePaymentMethod || undefined,
          months: financeMonths,
          status: financeStatus,
        }),
      });
      const result = (await response.json()) as {
        amountPaid?: number;
        balance?: number;
        creditId?: string;
        creditMonths?: number;
        interestRate?: number;
        message?: string;
        status?: AdminSale["status"];
      };

      if (!response.ok || !result.creditId) {
        throw new Error(result.message ?? "No se pudo configurar el crédito.");
      }

      setSales((currentSales) =>
        currentSales.map((sale) =>
          sale.id === saleToFinance.id
            ? {
                ...sale,
                amountPaid: result.amountPaid ?? 0,
                balance: result.balance ?? sale.balance,
                creditId: result.creditId!,
                creditMonths: result.creditMonths ?? financeMonths,
                interestRate: result.interestRate ?? financeInterestRate,
                paymentMethod: financeInitialPayment > 0 ? financePaymentMethod || null : null,
                status: result.status ?? sale.status,
              }
            : sale,
        ),
      );
      setSaleToFinance(null);
      setNotice(result.message ?? "Crédito configurado nuevamente.");
    } catch (configurationError) {
      setNotice(
        configurationError instanceof Error
          ? configurationError.message
          : "No se pudo configurar el crédito.",
      );
    } finally {
      setIsFinancingSale(false);
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
        <AdminLocalSaleForm
          amountPaid={amountPaid}
          balance={balance}
          cartItems={cartItems}
          cartQuantity={cartQuantity}
          cartTotal={cartTotal}
          creditMonths={creditMonths}
          customerOptions={customerOptions}
          customerQuery={customerQuery}
          estimatedCreditBalance={estimatedCreditBalance}
          financedTotalWithInterest={financedTotalWithInterest}
          interestPercent={interestPercent}
          isFinanced={isFinanced}
          isReserved={isReserved}
          isSaving={isSaving}
          isSistecredito={isSistecredito}
          notes={notes}
          notice={notice}
          paymentMethod={paymentMethod}
          productOptions={productOptions}
          productQuery={productQuery}
          reservedMinimum={reservedMinimum}
          saleType={saleType}
          selectedCustomerId={selectedCustomerId}
          selectedProductId={selectedProductId}
          sistecreditoApproval={sistecreditoApproval}
          suggestedFirstInstallment={suggestedFirstInstallment}
          onAddProduct={addSelectedProduct}
          onAmountPaidChange={(value) => {
            if (saleType === "CREDIT") setHasAdjustedCreditPayment(true);
            setAmountPaid(value);
          }}
          onCreditMonthsChange={setCreditMonths}
          onCustomerChange={setSelectedCustomerId}
          onCustomerQueryChange={setCustomerQuery}
          onInterestPercentChange={setInterestPercent}
          onNotesChange={setNotes}
          onPaymentMethodChange={setPaymentMethod}
          onProductChange={setSelectedProductId}
          onProductQueryChange={setProductQuery}
          onRemoveItem={removeItem}
          onSaleTypeChange={changeSaleType}
          onSistecreditoApprovalChange={setSistecreditoApproval}
          onSubmit={createLocalSale}
          onUnitPriceChange={(productId, value) => updateUnitPrice(productId, String(value))}
          onUpdateQuantity={updateQuantity}
        />
        <AdminSalesHistory
          deliveringSaleId={deliveringSaleId}
          query={historyQuery}
          sales={filteredSales}
          sourceFilter={sourceFilter}
          onDelete={(sale) => {
            setSaleToDelete(sale);
            setSaleDeleteConfirmation("");
          }}
          onDeliveryAction={(sale, action) => {
            setSaleToUpdateDelivery(sale);
            setDeliveryAction(action);
          }}
          onFinance={openCreditConfiguration}
          onQueryChange={setHistoryQuery}
          onSourceFilterChange={setSourceFilter}
        />
      </div>

      <AdminSalesModals
        deleteConfirmation={saleDeleteConfirmation}
        deletingSaleId={deletingSaleId}
        deliveringSaleId={deliveringSaleId}
        financeInitialPayment={financeInitialPayment}
        financeInterestRate={financeInterestRate}
        financeMethod={financePaymentMethod}
        financeMonths={financeMonths}
        financeStatus={financeStatus}
        financing={isFinancingSale}
        deliveryAction={deliveryAction}
        deliverySale={saleToUpdateDelivery}
        saleToDelete={saleToDelete}
        saleToFinance={saleToFinance}
        onDeleteClose={() => {
          setSaleToDelete(null);
          setSaleDeleteConfirmation("");
        }}
        onDeleteConfirm={deleteSale}
        onDeleteConfirmationChange={setSaleDeleteConfirmation}
        onDeliveryClose={() => setSaleToUpdateDelivery(null)}
        onDeliveryConfirm={() => {
          if (saleToUpdateDelivery) void updateSaleDelivery(saleToUpdateDelivery);
        }}
        onFinanceClose={() => setSaleToFinance(null)}
        onFinanceInitialPaymentChange={setFinanceInitialPayment}
        onFinanceInterestRateChange={setFinanceInterestRate}
        onFinanceMethodChange={setFinancePaymentMethod}
        onFinanceMonthsChange={setFinanceMonths}
        onFinanceStatusChange={setFinanceStatus}
        onFinanceSubmit={configureCredit}
      />
      {showNumberingSetup ? (
        <NumberingSetupModal
          isSaving={isSaving}
          onClose={() => setShowNumberingSetup(false)}
          onSubmit={createLocalSale}
        />
      ) : null}
    </section>
  );
}
