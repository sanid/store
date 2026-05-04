"use client";

import type { CustomizationField } from "@/lib/types";

interface NumberFieldProps {
  field: CustomizationField;
  value: number;
  onChange: (id: string, value: number) => void;
}

export default function NumberField({ field, value, onChange }: NumberFieldProps) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;

  return (
    <div>
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          id={field.id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(field.id, Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-surface-dark accent-accent"
        />
        <div className="flex items-center rounded-lg border border-border">
          <button
            type="button"
            onClick={() => onChange(field.id, Math.max(min, value - step))}
            className="px-2.5 py-1.5 text-sm text-muted hover:text-primary"
          >
            &minus;
          </button>
          <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">
            {value}
          </span>
          <button
            type="button"
            onClick={() => onChange(field.id, Math.min(max, value + step))}
            className="px-2.5 py-1.5 text-sm text-muted hover:text-primary"
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
