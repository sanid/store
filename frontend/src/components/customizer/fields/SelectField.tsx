"use client";

import type { CustomizationField } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface SelectFieldProps {
  field: CustomizationField;
  value: string;
  onChange: (id: string, value: string) => void;
}

export default function SelectField({ field, value, onChange }: SelectFieldProps) {
  const options = field.options || [];

  return (
    <div>
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
        {options.map((option) => {
          const priceAdj = field.priceModifier?.[option] || 0;
          const isSelected = value === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(field.id, option)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                isSelected
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white text-primary hover:border-accent hover:bg-accent/5"
              }`}
            >
              {option}
              {priceAdj > 0 && (
                <span className={`ml-1.5 text-xs ${isSelected ? "text-white/80" : "text-muted"}`}>
                  +{formatPrice(priceAdj)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
