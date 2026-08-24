import type { PaymentMethod } from "@/lib/credits";

export const paymentOptions: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Efectivo", value: "CASH" },
  { label: "Transferencia", value: "TRANSFER" },
];
