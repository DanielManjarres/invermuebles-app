export const DEFAULT_TAX_RATE = 19;
export const DEFAULT_MARGIN_PERCENT = 25;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function addTax(baseAmount: number, taxRate = DEFAULT_TAX_RATE) {
  const taxAmount = roundMoney(baseAmount * (taxRate / 100));
  return {
    baseAmount: roundMoney(baseAmount),
    taxAmount,
    total: roundMoney(baseAmount + taxAmount),
  };
}

export function splitTaxIncluded(total: number, taxRate = DEFAULT_TAX_RATE) {
  const baseAmount = roundMoney(total / (1 + taxRate / 100));
  return {
    baseAmount,
    taxAmount: roundMoney(total - baseAmount),
    total: roundMoney(total),
  };
}

export function suggestSalePrice(
  baseCost: number,
  marginPercent = DEFAULT_MARGIN_PERCENT,
  taxRate = DEFAULT_TAX_RATE,
) {
  if (baseCost <= 0 || marginPercent >= 100) return 0;
  const saleBase = baseCost / (1 - marginPercent / 100);
  return Math.round(addTax(saleBase, taxRate).total);
}

export function calculateMarginPercent(baseCost: number, finalSalePrice: number, taxRate = DEFAULT_TAX_RATE) {
  if (baseCost <= 0 || finalSalePrice <= 0) return 0;
  const saleBase = splitTaxIncluded(finalSalePrice, taxRate).baseAmount;
  return roundMoney(((saleBase - baseCost) / saleBase) * 100);
}
