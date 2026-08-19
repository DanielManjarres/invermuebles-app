"use client";

export function ProductMoneyField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label>
      {label}
      <input
        inputMode="numeric"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits ? Number(digits) : 0);
        }}
        placeholder="0"
        type="text"
        value={value ? value.toLocaleString("es-CO") : ""}
      />
    </label>
  );
}
