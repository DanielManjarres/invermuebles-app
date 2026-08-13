export type FinancedSaleDeliveryStatus =
  | "DELIVERED"
  | "PENDING_DELIVERY"
  | "PENDING_PAYMENT";

export function getFinancedSaleDeliveryStatus(
  amountPaid: number,
  currentStatus?: string,
): FinancedSaleDeliveryStatus {
  if (currentStatus === "DELIVERED") return "DELIVERED";
  return amountPaid > 0 ? "PENDING_DELIVERY" : "PENDING_PAYMENT";
}
