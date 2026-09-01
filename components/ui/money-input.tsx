"use client";

import { useEffect, useState } from "react";

type MoneyInputProps = {
  ariaLabel?: string;
  currencyPrefix?: boolean;
  id?: string;
  onValueChange: (value: number) => void;
  placeholder?: string;
  required?: boolean;
  value: number;
};

function formatValue(value: number, currencyPrefix: boolean) {
  const formattedValue = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(value);

  return currencyPrefix ? `$ ${formattedValue}` : formattedValue;
}

export function MoneyInput({
  ariaLabel = "Valor en pesos",
  currencyPrefix = false,
  id,
  onValueChange,
  placeholder = "0",
  required = false,
  value,
}: MoneyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState(
    value > 0 ? formatValue(value, currencyPrefix) : "",
  );

  useEffect(() => {
    if (!isFocused) {
      setTextValue(value > 0 ? formatValue(value, currencyPrefix) : "");
    }
  }, [currencyPrefix, isFocused, value]);

  function handleChange(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "");
    setTextValue(digits);
    onValueChange(digits ? Number(digits) : 0);
  }

  return (
    <input
      aria-label={ariaLabel}
      autoComplete="off"
      id={id}
      inputMode="numeric"
      onBlur={() => {
        setIsFocused(false);
        setTextValue(value > 0 ? formatValue(value, currencyPrefix) : "");
      }}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={() => {
        setIsFocused(true);
        setTextValue(value > 0 ? String(value) : "");
      }}
      placeholder={placeholder}
      required={required}
      type="text"
      value={textValue}
    />
  );
}
