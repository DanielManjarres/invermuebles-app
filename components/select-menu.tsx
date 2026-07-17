"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SelectMenuOption = {
  label: string;
  value: string;
};

type SelectMenuProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder: string;
  value: string;
};

export function SelectMenu({
  disabled = false,
  onChange,
  options,
  placeholder,
  value,
}: SelectMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={isOpen ? "selectMenu open" : "selectMenu"} ref={menuRef}>
      <button
        className="selectMenuButton"
        disabled={disabled}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && !disabled ? (
        <div className="selectMenuList" role="listbox">
          <button
            className={!value ? "selectMenuOption active" : "selectMenuOption"}
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            <span>{placeholder}</span>
            {!value ? <Check size={15} /> : null}
          </button>
          {options.map((option) => (
            <button
              className={
                option.value === value
                  ? "selectMenuOption active"
                  : "selectMenuOption"
              }
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={15} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
