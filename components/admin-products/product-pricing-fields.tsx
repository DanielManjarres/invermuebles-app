"use client";

import { ProductMoneyField } from "@/components/admin-products/form-controls";
import {
  DEFAULT_MARGIN_PERCENT,
  DEFAULT_TAX_RATE,
  calculateMarginPercent,
  splitTaxIncluded,
  suggestSalePrice,
} from "@/lib/tax-calculator";

type ProductPricingFieldsProps = {
  cost: number;
  onChange: (values: { cost: number; salePrice: number }) => void;
  salePrice: number;
};

export function ProductPricingFields({
  cost,
  onChange,
  salePrice,
}: ProductPricingFieldsProps) {
  const purchase = splitTaxIncluded(cost, DEFAULT_TAX_RATE);
  const sale = splitTaxIncluded(salePrice, DEFAULT_TAX_RATE);
  const margin = calculateMarginPercent(purchase.baseAmount, salePrice);

  return (
    <>
      <ProductMoneyField
        label="Costo de compra (IVA incluido)"
        value={cost}
        onChange={(nextCost) =>
          onChange({
            cost: nextCost,
            salePrice: suggestSalePrice(
              splitTaxIncluded(nextCost, DEFAULT_TAX_RATE).baseAmount,
            ),
          })
        }
      />
      <ProductMoneyField
        label="Precio final de venta"
        value={salePrice}
        onChange={(nextSalePrice) => onChange({ cost, salePrice: nextSalePrice })}
      />
      <div className="pricingSummary">
        <span>Base de compra: <strong>$ {purchase.baseAmount.toLocaleString("es-CO")}</strong></span>
        <span>IVA compra ({DEFAULT_TAX_RATE}%): <strong>$ {purchase.taxAmount.toLocaleString("es-CO")}</strong></span>
        <span>Base de venta: <strong>$ {sale.baseAmount.toLocaleString("es-CO")}</strong></span>
        <span>IVA venta ({DEFAULT_TAX_RATE}%): <strong>$ {sale.taxAmount.toLocaleString("es-CO")}</strong></span>
        <span>Margen real: <strong>{margin.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%</strong></span>
        <small>Precio sugerido con margen del {DEFAULT_MARGIN_PERCENT}% sobre la venta antes de IVA. Puedes editarlo.</small>
      </div>
    </>
  );
}
