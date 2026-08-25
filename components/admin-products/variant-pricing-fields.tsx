"use client";

import { ProductMoneyField } from "@/components/admin-products/form-controls";
import {
  DEFAULT_MARGIN_PERCENT,
  DEFAULT_TAX_RATE,
  addTax,
  calculateMarginPercent,
  splitTaxIncluded,
  suggestSalePrice,
} from "@/lib/tax-calculator";

type VariantPricingFieldsProps = {
  baseCost: number;
  onChange: (values: { baseCost: number; salePrice: number }) => void;
  salePrice: number;
};

export function VariantPricingFields({
  baseCost,
  onChange,
  salePrice,
}: VariantPricingFieldsProps) {
  const purchase = addTax(baseCost, DEFAULT_TAX_RATE);
  const sale = splitTaxIncluded(salePrice, DEFAULT_TAX_RATE);
  const margin = calculateMarginPercent(baseCost, salePrice);

  return (
    <>
      <ProductMoneyField
        label="Costo antes de IVA"
        value={baseCost}
        onChange={(nextBaseCost) =>
          onChange({
            baseCost: nextBaseCost,
            salePrice: suggestSalePrice(nextBaseCost),
          })
        }
      />
      <ProductMoneyField
        label="Precio final de venta"
        value={salePrice}
        onChange={(nextSalePrice) =>
          onChange({ baseCost, salePrice: nextSalePrice })
        }
      />
      <div className="pricingSummary">
        <span>IVA compra ({DEFAULT_TAX_RATE}%): <strong>$ {purchase.taxAmount.toLocaleString("es-CO")}</strong></span>
        <span>Costo con IVA: <strong>$ {purchase.total.toLocaleString("es-CO")}</strong></span>
        <span>Base de venta: <strong>$ {sale.baseAmount.toLocaleString("es-CO")}</strong></span>
        <span>IVA venta ({DEFAULT_TAX_RATE}%): <strong>$ {sale.taxAmount.toLocaleString("es-CO")}</strong></span>
        <span>Margen real: <strong>{margin.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%</strong></span>
        <small>Precio sugerido con margen del {DEFAULT_MARGIN_PERCENT}% sobre la venta antes de IVA. Puedes editarlo.</small>
      </div>
    </>
  );
}
