"use client";

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
      <input
        inputMode="numeric"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits ? Number(digits) : 0);
        }}
        placeholder="Ej: 1.500.000"
        required={required}
        type="text"
        value={value ? `$ ${value.toLocaleString("es-CO")}` : ""}
      />
    </label>
  );
}
