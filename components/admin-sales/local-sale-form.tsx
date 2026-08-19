"use client";

import { useEffect, useState } from "react";
import { Minus, PackageSearch, Plus, ReceiptText, Search, Trash2 } from "lucide-react";

import { MoneyInput } from "@/components/admin-sales/form-controls";
import { SelectMenu } from "@/components/select-menu";
import type { Product, ProductInventoryVariant } from "@/lib/products";
import {
  paymentMethodLabels,
  saleTypeLabels,
  type AdminSale,
  type PaymentMethod,
} from "@/lib/sales";

export type SaleCartItem = {
  lineId: string;
  product: Product;
  variant?: ProductInventoryVariant;
  quantity: number;
  unitPrice: number;
};

type SelectOption = {
  label: string;
  value: string;
};

type Props = {
  amountPaid: number;
  balance: number;
  cartItems: SaleCartItem[];
  cartQuantity: number;
  cartTotal: number;
  creditMonths: number;
  customerOptions: SelectOption[];
  customerQuery: string;
  estimatedCreditBalance: number;
  financedTotalWithInterest: number;
  interestPercent: number;
  isFinanced: boolean;
  isReserved: boolean;
  isSaving: boolean;
  isSistecredito: boolean;
  notes: string;
  notice: string;
  paymentMethod: PaymentMethod;
  productOptions: SelectOption[];
  productQuery: string;
  reservedMinimum: number;
  saleType: AdminSale["type"];
  selectedCustomerId: string;
  selectedProductId: string;
  sistecreditoApproval: string;
  suggestedFirstInstallment: number;
  onAddProduct: () => void;
  onAmountPaidChange: (value: number) => void;
  onCreditMonthsChange: (value: number) => void;
  onCustomerChange: (value: string) => void;
  onCustomerQueryChange: (value: string) => void;
  onInterestPercentChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onProductChange: (value: string) => void;
  onProductQueryChange: (value: string) => void;
  onRemoveItem: (lineId: string) => void;
  onSaleTypeChange: (value: string) => void;
  onSistecreditoApprovalChange: (value: string) => void;
  onSubmit: () => void;
  onUnitPriceChange: (lineId: string, value: number) => void;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
};

const saleTypeOptions = Object.entries(saleTypeLabels).map(([value, label]) => ({ label, value }));
const paymentMethodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({ label, value }));

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "COP",
  }).format(value);
}

function QuantityInput({
  max,
  value,
  onValueChange,
}: {
  max: number;
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [textValue, setTextValue] = useState(String(value));

  useEffect(() => setTextValue(String(value)), [value]);

  function handleChange(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "");
    setTextValue(digits);
    if (digits) onValueChange(Math.min(Math.max(1, Number(digits)), max));
  }

  return (
    <input
      aria-label="Cantidad"
      inputMode="numeric"
      type="text"
      value={textValue}
      onBlur={() => {
        const nextQuantity = textValue ? Math.min(Math.max(1, Number(textValue)), max) : 1;
        onValueChange(nextQuantity);
        setTextValue(String(nextQuantity));
      }}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}

function FlexibleNumberInput({
  allowDecimal = false,
  max,
  min,
  value,
  onValueChange,
}: {
  allowDecimal?: boolean;
  max: number;
  min: number;
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [textValue, setTextValue] = useState(String(value));

  useEffect(() => setTextValue(String(value)), [value]);

  function clamp(nextValue: number) {
    return Math.min(Math.max(min, nextValue), max);
  }

  function handleChange(nextValue: string) {
    const normalized = allowDecimal ? nextValue.replace(",", ".") : nextValue.replace(/\D/g, "");
    if (allowDecimal && !/^\d*(?:\.\d{0,2})?$/.test(normalized)) return;

    setTextValue(normalized);
    if (normalized === "" || normalized === ".") return;

    const parsedValue = Number(normalized);
    if (Number.isFinite(parsedValue)) onValueChange(clamp(parsedValue));
  }

  return (
    <input
      aria-label={allowDecimal ? "Porcentaje de interés" : "Plazo en meses"}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      type="text"
      value={textValue}
      onBlur={() => {
        const parsedValue = Number(textValue.replace(",", "."));
        const nextValue = Number.isFinite(parsedValue) ? clamp(parsedValue) : min;
        onValueChange(nextValue);
        setTextValue(String(nextValue));
      }}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}

export function AdminLocalSaleForm(props: Props) {
  const {
    amountPaid, balance, cartItems, cartQuantity, cartTotal, creditMonths, customerOptions,
    customerQuery, estimatedCreditBalance, financedTotalWithInterest, interestPercent,
    isFinanced, isReserved, isSaving, isSistecredito, notes, notice, paymentMethod,
    productOptions, productQuery, reservedMinimum, saleType, selectedCustomerId,
    selectedProductId, sistecreditoApproval, suggestedFirstInstallment, onAddProduct,
    onAmountPaidChange, onCreditMonthsChange, onCustomerChange, onCustomerQueryChange,
    onInterestPercentChange, onNotesChange, onPaymentMethodChange, onProductChange,
    onProductQueryChange, onRemoveItem, onSaleTypeChange, onSistecreditoApprovalChange,
    onSubmit, onUnitPriceChange, onUpdateQuantity,
  } = props;

  return (
    <article className="localSalePanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Venta local</p>
          <h2>Finalizar venta del almacén</h2>
          <p className="sectionLead">Agrega productos desde el catálogo administrativo, revisa cantidades, ajusta el precio real y registra la venta.</p>
        </div>
      </div>

      <div className="saleStepHeader"><span>1</span><div><strong>Datos de la venta</strong><p>Toda venta queda asociada a un cliente para conservar su historial.</p></div></div>
      <div className="saleFormGrid">
        <label>Buscar cliente<div className="searchBox compactSearchBox"><Search size={18} /><input onChange={(event) => onCustomerQueryChange(event.target.value)} placeholder="Cédula, nombre o teléfono" type="search" value={customerQuery} /></div></label>
        <label>Cliente<SelectMenu onChange={onCustomerChange} options={customerOptions} placeholder="Selecciona un cliente" value={selectedCustomerId} /></label>
        <label>Tipo de venta<SelectMenu onChange={onSaleTypeChange} options={saleTypeOptions} placeholder="Selecciona tipo" value={saleType} /></label>
      </div>

      <div className="saleStepHeader"><span>2</span><div><strong>Productos seleccionados</strong><p>También puedes buscar y agregar otro producto sin volver al catálogo.</p></div></div>
      <div className="saleProductPicker">
        <label>Buscar producto<div className="searchBox compactSearchBox"><PackageSearch size={18} /><input onChange={(event) => onProductQueryChange(event.target.value)} placeholder="Nombre, referencia, tipo o clase" type="search" value={productQuery} /></div></label>
        <label>Producto adicional<SelectMenu onChange={onProductChange} options={productOptions} placeholder="Selecciona un producto" value={selectedProductId} /></label>
        <button className="secondaryButton" disabled={!selectedProductId} type="button" onClick={onAddProduct}><Plus size={18} />Agregar</button>
      </div>

      <div className="saleCartList">
        {cartItems.length === 0 ? (
          <div className="emptyState compactEmptyState"><h2>Sin productos</h2><p>Agrega productos desde el catálogo admin para iniciar la venta.</p></div>
        ) : cartItems.map((item) => (
          <article className="saleCartItem" key={item.lineId}>
            <div className="saleCartProductInfo"><strong>{item.product.name}{item.variant ? ` · ${item.variant.name}` : ""}</strong><span>{item.variant?.reference ?? item.product.reference} · Base {formatMoney(item.variant?.salePrice ?? item.product.salePrice)}</span></div>
            <div className="saleQuantityBlock"><span>Cantidad</span><div className="quantityControl" aria-label="Cambiar cantidad">
              <button className="quantityButton" type="button" disabled={item.quantity === 1} onClick={() => onUpdateQuantity(item.lineId, item.quantity - 1)}><Minus size={16} /></button>
              <QuantityInput max={item.variant?.stock ?? item.product.stock} value={item.quantity} onValueChange={(quantity) => onUpdateQuantity(item.lineId, quantity)} />
              <button className="quantityButton" type="button" disabled={item.quantity >= (item.variant?.stock ?? item.product.stock)} onClick={() => onUpdateQuantity(item.lineId, item.quantity + 1)}><Plus size={16} /></button>
            </div></div>
            <label className="salePriceField">Precio vendido<MoneyInput value={item.unitPrice} onValueChange={(value) => onUnitPriceChange(item.lineId, value)} /></label>
            <div className="saleLineTotal"><span>Subtotal</span><strong>{formatMoney(item.unitPrice * item.quantity)}</strong></div>
            <button className="iconButton" type="button" title="Quitar producto" onClick={() => onRemoveItem(item.lineId)}><Trash2 size={18} /></button>
          </article>
        ))}
      </div>

      <div className="saleStepHeader"><span>3</span><div><strong>Condiciones de la venta</strong><p>Registra el pago inicial y la modalidad acordada con el cliente.</p></div></div>

      {saleType === "CASH" ? <div className="salePaymentGrid">
        <label>Medio de pago<SelectMenu onChange={(value) => onPaymentMethodChange(value as PaymentMethod)} options={paymentMethodOptions} placeholder="Selecciona medio" value={paymentMethod} /></label>
        <div className="saleBalanceBox"><span>Valor recibido</span><strong>{formatMoney(cartTotal)}</strong></div>
        <div className="saleBalanceBox"><span>Saldo pendiente</span><strong>{formatMoney(0)}</strong></div>
      </div> : null}

      {isFinanced ? <div className="salePaymentGrid">
        <label>Plazo en meses<FlexibleNumberInput max={120} min={1} onValueChange={onCreditMonthsChange} value={creditMonths} /></label>
        <label>Interés acordado (%)<FlexibleNumberInput allowDecimal max={100} min={0} onValueChange={onInterestPercentChange} value={interestPercent} /></label>
        <label>{saleType === "CREDIT_CASH" ? "Pago inicial" : "Primera cuota"}<MoneyInput onValueChange={onAmountPaidChange} value={amountPaid} /></label>
        <div className="saleCreditSummary">
          <div className="saleBalanceBox"><span>{saleType === "CREDIT_CASH" ? "Total financiado con interés" : "Deuda total con interés"}</span><strong>{formatMoney(financedTotalWithInterest)}</strong></div>
          <div className="saleBalanceBox"><span>{saleType === "CREDIT" ? "Saldo después de la primera cuota" : "Saldo financiado"}</span><strong>{formatMoney(estimatedCreditBalance)}</strong></div>
        </div>
        {amountPaid > 0 ? <label>Medio del pago inicial<SelectMenu onChange={(value) => onPaymentMethodChange(value as PaymentMethod)} options={paymentMethodOptions} placeholder="Selecciona medio" value={paymentMethod} /></label> : null}
        <p className="salePaymentHint">{saleType === "CREDIT" ? "Primera cuota sugerida: " + formatMoney(suggestedFirstInstallment) + ". " : ""}Se aplicará {interestPercent} % de interés sobre el saldo financiado a {creditMonths} mes(es). Los próximos abonos podrán disminuir intereses pendientes.</p>
      </div> : null}

      {isReserved ? <div className="salePaymentGrid">
        <label>Medio del abono<SelectMenu onChange={(value) => onPaymentMethodChange(value as PaymentMethod)} options={paymentMethodOptions} placeholder="Selecciona medio" value={paymentMethod} /></label>
        <label>Abono inicial<MoneyInput onValueChange={onAmountPaidChange} value={amountPaid} /></label>
        <div className="saleBalanceBox"><span>Saldo por pagar</span><strong>{formatMoney(balance)}</strong></div>
        <p className="salePaymentHint">Mínimo para separar: {formatMoney(reservedMinimum)}. El producto sigue disponible hasta completar el pago, con plazo máximo de tres meses.</p>
      </div> : null}

      {isSistecredito ? <div className="salePaymentGrid">
        <label>Número de aprobación<input onChange={(event) => onSistecreditoApprovalChange(event.target.value)} placeholder="Ej: aprobación Sistecrédito" type="text" value={sistecreditoApproval} /></label>
        <div className="saleBalanceBox"><span>Valor cubierto por Sistecrédito</span><strong>{formatMoney(cartTotal)}</strong></div>
        <div className="saleBalanceBox"><span>Saldo del cliente</span><strong>{formatMoney(0)}</strong></div>
        <p className="salePaymentHint">Al registrar la aprobación, la venta queda pagada completamente y pendiente de entrega.</p>
      </div> : null}

      <label className="saleNotes">Observaciones<textarea onChange={(event) => onNotesChange(event.target.value)} placeholder="Ej: descuento autorizado, entrega inmediata, venta de contado." rows={2} value={notes} /></label>
      {notice ? <p className="inlineNotice">{notice}</p> : null}
      <div className="saleSummaryBar">
        <div><span>{cartQuantity} unidad(es)</span><strong>{formatMoney(cartTotal)}</strong></div>
        <button className="primaryButton" disabled={cartItems.length === 0 || isSaving} type="button" onClick={onSubmit}>
          <ReceiptText size={18} />
          {isSaving ? "Guardando venta..." : isReserved ? "Registrar separado" : isFinanced ? "Crear venta a crédito" : isSistecredito ? "Registrar Sistecrédito" : "Finalizar venta"}
        </button>
      </div>
    </article>
  );
}
