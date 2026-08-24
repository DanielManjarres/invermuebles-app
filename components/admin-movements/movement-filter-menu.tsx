import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type MovementFilterOption = {
  label: string;
  value: string;
};

type MovementFilterMenuProps = {
  icon: ReactNode;
  isOpen: boolean;
  label: string;
  onSelect: (value: string) => void;
  onToggle: () => void;
  options: MovementFilterOption[];
  value: string;
};

export function MovementFilterMenu({
  icon,
  isOpen,
  label,
  onSelect,
  onToggle,
  options,
  value,
}: MovementFilterMenuProps) {
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <label className="filterMenuLabel">
      <span>{label}</span>
      <div className={isOpen ? "filterMenu open" : "filterMenu"}>
        <button className="filterMenuButton" type="button" onClick={onToggle}>
          {icon}
          <span>{selectedOption.label}</span>
          <ChevronDown size={16} />
        </button>

        {isOpen ? (
          <div className="filterMenuList" role="listbox">
            {options.map((option) => (
              <button
                className={
                  option.value === value
                    ? "filterMenuOption active"
                    : "filterMenuOption"
                }
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
              >
                <span>{option.label}</span>
                {option.value === value ? <Check size={15} /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  );
}
