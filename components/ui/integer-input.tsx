"use client";

import { useEffect, useState } from "react";

type IntegerInputProps = {
  allowEmpty?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
  max?: number;
  min?: number;
  onValueChange: (value: number | "") => void;
  required?: boolean;
  value: number | "";
};

function clampValue(value: number, min: number, max?: number) {
  return Math.min(Math.max(value, min), max ?? Number.MAX_SAFE_INTEGER);
}

export function IntegerInput({
  allowEmpty = true,
  ariaLabel,
  autoFocus = false,
  max,
  min = 0,
  onValueChange,
  required = false,
  value,
}: IntegerInputProps) {
  const [textValue, setTextValue] = useState(value === "" ? "" : String(value));

  useEffect(() => {
    setTextValue(value === "" ? "" : String(value));
  }, [value]);

  function handleChange(nextValue: string) {
    const digits = nextValue.replace(/\D/g, "");
    setTextValue(digits);

    if (!digits) {
      if (allowEmpty) onValueChange("");
      return;
    }

    onValueChange(clampValue(Number(digits), min, max));
  }

  return (
    <input
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      inputMode="numeric"
      max={max}
      min={min}
      onBlur={() => {
        if (!textValue) {
          if (allowEmpty) return;
          setTextValue(String(min));
          onValueChange(min);
          return;
        }

        const nextValue = clampValue(Number(textValue), min, max);
        setTextValue(String(nextValue));
        onValueChange(nextValue);
      }}
      onChange={(event) => handleChange(event.target.value)}
      pattern="[0-9]*"
      required={required}
      type="text"
      value={textValue}
    />
  );
}
