import type { OrderWorkflowStatus } from "./order-status-policy";

export function canChangeOrderStructure(
  hasSale: boolean,
  currentStatus: OrderWorkflowStatus,
  nextStatus: OrderWorkflowStatus,
  currentCustomerId: string | null,
  nextCustomerId: string | null,
) {
  const customerChanged = currentCustomerId !== nextCustomerId;

  if (hasSale) {
    return currentStatus === nextStatus && !customerChanged;
  }

  return !customerChanged || currentStatus === "PENDING" || currentStatus === "CONTACTED";
}

export function canEditOrderCustomer(status: OrderWorkflowStatus, hasSale: boolean) {
  return !hasSale && status === "CONTACTED";
}

export function canDeleteOrder(hasSale: boolean) {
  return !hasSale;
}

export function canPrepareOrderSale(
  status: OrderWorkflowStatus,
  customerId: string | null,
  hasSale: boolean,
) {
  return status === "CONFIRMED" && Boolean(customerId) && !hasSale;
}
