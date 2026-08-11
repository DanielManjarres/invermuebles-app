import type { PaymentMethod } from "@/lib/credits";

export const paymentOptions: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Efectivo", value: "CASH" },
  { label: "Transferencia", value: "TRANSFER" },
];

type MoneyInputProps = {
  id: string;
  onChange: (value: number) => void;
  value: number;
};

export function MoneyInput({ id, onChange, value }: MoneyInputProps) {
  return (
    <input
      id={id}
      inputMode="numeric"
      pattern="[0-9.]*"
      type="text"
      value={value ? new Intl.NumberFormat("es-CO").format(value) : ""}
      onChange={(event) => {
        const numericValue = Number(event.target.value.replace(/\D/g, ""));
        onChange(Number.isFinite(numericValue) ? numericValue : 0);
      }}
      placeholder="Ej: 100.000"
    />
  );
}
