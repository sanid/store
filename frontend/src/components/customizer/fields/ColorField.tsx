"use client";

import type { CustomizationField, CustomizationFieldOption } from "@/lib/types";

interface ColorFieldProps {
  field: CustomizationField;
  value: string;
  onChange: (id: string, value: string) => void;
}

const COLOR_NAMES: Record<string, string> = {
  "#FF0000": "Red",
  "#00FF00": "Green",
  "#0000FF": "Blue",
  "#000000": "Black",
  "#FFFFFF": "White",
  "#FFC0CB": "Pink",
  "#FFA500": "Orange",
  "#FFFF00": "Yellow",
  "#800080": "Purple",
  "#A52A2A": "Brown",
  "#808080": "Gray",
  "#C0C0C0": "Silver",
  "#000080": "Navy",
  "#008000": "Forest",
  "#D2B48C": "Natural",
  "#8B7355": "Oak",
  "#4A4A4A": "Anthracite",
  "#2F4F4F": "Dark Slate",
  "#6B8E23": "Olive",
  "#A0522D": "Sienna",
};

function normalizeColorOptions(
  options: string[] | CustomizationFieldOption[] | undefined
): Array<{ value: string; label: string }> {
  if (!options) return [];
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: COLOR_NAMES[o] || o } : { value: o.value, label: o.label || COLOR_NAMES[o.value] || o.value }
  );
}

export default function ColorField({ field, value, onChange }: ColorFieldProps) {
  const options = normalizeColorOptions(field.options);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(field.id, color.value)}
            aria-label={color.label}
            aria-pressed={value === color.value}
            className={`group relative h-9 w-9 cursor-pointer rounded-full border-2 transition-all ${
              value === color.value
                ? "border-accent ring-2 ring-accent/30 scale-110"
                : "border-border hover:border-muted hover:scale-110"
            }`}
            style={{ backgroundColor: color.value }}
          >
            {color.value === "#FFFFFF" && (
              <span className="absolute inset-0 rounded-full border border-border" />
            )}
            {value === color.value && (
              <svg
                className={`absolute inset-0 m-auto h-4 w-4 ${
                  color.value === "#FFFFFF" || color.value === "#FFFF00"
                    ? "text-primary"
                    : "text-white"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
      {value && (
        <p className="mt-1.5 text-xs text-muted">
          {options.find((o) => o.value === value)?.label || COLOR_NAMES[value] || value}
        </p>
      )}
    </div>
  );
}
