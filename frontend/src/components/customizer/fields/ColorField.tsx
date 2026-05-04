"use client";

import type { CustomizationField } from "@/lib/types";

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
};

export default function ColorField({ field, value, onChange }: ColorFieldProps) {
  const options = field.options || [];

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(field.id, color)}
            aria-label={COLOR_NAMES[color] || color}
            aria-pressed={value === color}
            className={`group relative h-9 w-9 cursor-pointer rounded-full border-2 transition-all ${
              value === color
                ? "border-accent ring-2 ring-accent/30 scale-110"
                : "border-border hover:border-muted hover:scale-110"
            }`}
            style={{ backgroundColor: color }}
          >
            {color === "#FFFFFF" && (
              <span className="absolute inset-0 rounded-full border border-border" />
            )}
            {value === color && (
              <svg
                className={`absolute inset-0 m-auto h-4 w-4 ${
                  color === "#FFFFFF" || color === "#FFFF00"
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
          Selected: {COLOR_NAMES[value] || value}
        </p>
      )}
    </div>
  );
}
