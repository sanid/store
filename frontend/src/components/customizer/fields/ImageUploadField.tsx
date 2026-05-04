"use client";

import type { CustomizationField } from "@/lib/types";

interface ImageUploadFieldProps {
  field: CustomizationField;
  value: string;
  onChange: (id: string, value: string) => void;
}

export default function ImageUploadField({
  field,
  value,
  onChange,
}: ImageUploadFieldProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(field.id, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-primary">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
            <img src={value} alt="Upload preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(field.id, "")}
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white"
            >
              ✕
            </button>
          </div>
        ) : (
          <label aria-label={field.label || "Upload image"} className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-muted">
            <svg
              className="h-5 w-5 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
