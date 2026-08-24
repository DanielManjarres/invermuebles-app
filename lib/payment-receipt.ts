type ReceiptPayment = {
  amount: number;
  createdAtISO: string;
  id: string;
};

export function getPaymentReceiptNumber(paymentId: string) {
  return paymentId.slice(-8).toUpperCase();
}

export function getBalanceAfterPayment(
  currentBalance: number,
  payments: ReceiptPayment[],
  paymentId: string,
) {
  const newestFirst = [...payments].sort((first, second) =>
    second.createdAtISO.localeCompare(first.createdAtISO),
  );
  let balanceAfter = currentBalance;

  for (const payment of newestFirst) {
    if (payment.id === paymentId) return Math.max(0, balanceAfter);
    balanceAfter += payment.amount;
  }

  return Math.max(0, currentBalance);
}
