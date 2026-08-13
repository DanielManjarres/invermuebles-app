export type OrderWorkflowStatus =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED"
  | "CANCELLED";

const adjacentStatuses: Record<OrderWorkflowStatus, OrderWorkflowStatus[]> = {
  PENDING: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONTACTED", "CANCELLED"],
  CANCELLED: [],
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
