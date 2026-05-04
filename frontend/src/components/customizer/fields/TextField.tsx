"use client";

import type { CustomizationField } from "@/lib/types";

interface TextFieldProps {
  field: CustomizationField;
  value: string;
  onChange: (id: string, value: string) => void;
}

export default function TextField({ field, value, onChange }: TextFieldProps) {
  if (field.type === "textarea") {
    return (
      <div>
        <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-primary">
          {field.label}
          {field.required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <textarea
          id={field.id}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          required={field.required}
          rows={3}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {field.maxLength && (
          <p className="mt-1 text-xs text-muted">
            {String(value).length}/{field.maxLength}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type="text"
        id={field.id}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        required={field.required}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {field.maxLength && (
        <p className="mt-1 text-xs text-muted">
          {String(value).length}/{field.maxLength}
        </p>
      )}
    </div>
  );
}
