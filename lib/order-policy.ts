import type { OrderWorkflowStatus } from "./order-status-policy";

export function canChangeOrderStructure(
  hasSale: boolean,
  currentStatus: OrderWorkflowStatus,
  nextStatus: OrderWorkflowStatus,
  currentCustomerId: string | null,
  nextCustomerId: string | null,
) {
  return !hasSale || (
    currentStatus === nextStatus && currentCustomerId === nextCustomerId
  );
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
