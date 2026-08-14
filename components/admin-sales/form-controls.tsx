"use client";

import { useEffect, useState } from "react";

type MoneyInputProps = {
  value: number;
  onValueChange: (value: number) => void;
};

function formatNumericInput(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
}

export function MoneyInput({ value, onValueChange }: MoneyInputProps) {
  const [textValue, setTextValue] = useState(value > 0 ? formatNumericInput(value) : "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setTextValue(value > 0 ? formatNumericInput(value) : "");
  }, [isFocused, value]);

  function handleChange(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "");
    setTextValue(digits);
    onValueChange(digits ? Number(digits) : 0);
  }

  return (
    <input
      aria-label="Valor en pesos"
      autoComplete="off"
      inputMode="numeric"
      onBlur={() => {
        setIsFocused(false);
        setTextValue(value > 0 ? formatNumericInput(value) : "");
      }}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={() => {
        setIsFocused(true);
        setTextValue(value > 0 ? String(value) : "");
      }}
      placeholder="0"
      type="text"
      value={textValue}
    />
  );
}
