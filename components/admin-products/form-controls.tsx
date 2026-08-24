"use client";

import { MoneyInput } from "@/components/ui/money-input";

export function ProductMoneyField({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  required?: boolean;
  value: number;
}) {
  return (
    <label>
      {label}{required ? " *" : ""}
      <MoneyInput
        ariaLabel={label}
        currencyPrefix
        onValueChange={onChange}
        placeholder="Ej: 1.500.000"
        required={required}
        value={value}
      />
    </label>
  );
}
