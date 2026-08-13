export type OrderWorkflowStatus =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED"
  | "CANCELLED";

const adjacentStatuses: Record<OrderWorkflowStatus, OrderWorkflowStatus[]> = {
  PENDING: ["CONTACTED"],
  CONTACTED: ["PENDING", "CONFIRMED"],
  CONFIRMED: ["CONTACTED"],
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
