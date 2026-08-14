export type ReservedPaymentResult = {
  amountPaid: number;
  balance: number;
  status: "PENDING_DELIVERY" | "PENDING_PAYMENT";
};

export function calculateReservedPayment(
  currentBalance: number,
  currentAmountPaid: number,
  paymentAmount: number,
): ReservedPaymentResult {
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("INVALID_PAYMENT_AMOUNT");
  }

  if (paymentAmount > currentBalance) {
    throw new Error("PAYMENT_OVER_BALANCE");
  }

  const balance = Math.max(0, currentBalance - paymentAmount);

  return {
    amountPaid: currentAmountPaid + paymentAmount,
    balance,
    status: balance === 0 ? "PENDING_DELIVERY" : "PENDING_PAYMENT",
  };
}
