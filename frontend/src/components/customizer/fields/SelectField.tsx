"use client";

import type { CustomizationField, CustomizationFieldOption } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface SelectFieldProps {
  field: CustomizationField;
  value: string;
  onChange: (id: string, value: string) => void;
}

function normalizeOptions(
  options: string[] | CustomizationFieldOption[] | undefined
): CustomizationFieldOption[] {
  if (!options) return [];
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
}

export default function SelectField({ field, value, onChange }: SelectFieldProps) {
  const options = normalizeOptions(field.options);

  return (
    <div>
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(field.id, option.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                isSelected
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white text-primary hover:border-accent hover:bg-accent/5"
              }`}
            >
              {option.label || option.value}
              {option.priceModifier != null && option.priceModifier > 0 && (
                <span className={`ml-1.5 text-xs ${isSelected ? "text-white/80" : "text-muted"}`}>
                  +{formatPrice(option.priceModifier)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
