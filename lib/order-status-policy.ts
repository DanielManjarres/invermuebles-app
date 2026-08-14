export type OrderWorkflowStatus =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED";

const adjacentStatuses: Record<OrderWorkflowStatus, OrderWorkflowStatus[]> = {
  PENDING: ["CONTACTED"],
  CONTACTED: ["PENDING", "CONFIRMED"],
  CONFIRMED: ["CONTACTED"],
};

export function canTransitionOrderStatus(
  currentStatus: OrderWorkflowStatus,
  nextStatus: OrderWorkflowStatus,
) {
  return (
    currentStatus === nextStatus ||
    adjacentStatuses[currentStatus].includes(nextStatus)
  );
}
