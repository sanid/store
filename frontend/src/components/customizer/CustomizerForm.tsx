"use client";

import { useState, useCallback } from "react";
import type { CustomizationSchema, CustomizationField } from "@/lib/types";
import { calculatePriceAdjustment } from "@/lib/utils";
import TextField from "./fields/TextField";
import NumberField from "./fields/NumberField";
import ColorField from "./fields/ColorField";
import SelectField from "./fields/SelectField";
import ImageUploadField from "./fields/ImageUploadField";

interface CustomizerFormProps {
  schema: CustomizationSchema;
  basePrice: number;
  onCustomizationChange: (values: Record<string, unknown>, priceAdjustment: number) => void;
}

function getOptionValue(opt: string | import("@/lib/types").CustomizationFieldOption): string {
  return typeof opt === "string" ? opt : opt.value;
}

function getDefaultValue(field: CustomizationField): unknown {
  if (field.default !== undefined) return field.default;
  switch (field.type) {
    case "text":
    case "textarea":
      return "";
    case "number":
      return field.min ?? 0;
    case "color":
      return field.options?.[0] ? getOptionValue(field.options[0]) : "";
    case "select":
      return field.options?.[0] ? getOptionValue(field.options[0]) : "";
    case "image":
      return "";
    default:
      return "";
  }
}

export default function CustomizerForm({
  schema,
  basePrice,
  onCustomizationChange,
}: CustomizerFormProps) {
  const initialValues: Record<string, unknown> = {};
  for (const field of schema.fields) {
    initialValues[field.id] = getDefaultValue(field);
  }

  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  const updateValue = useCallback(
    (id: string, value: unknown) => {
      const next = { ...values, [id]: value };
      const adj = calculatePriceAdjustment(schema, next);
      setValues(next);
      onCustomizationChange(next, adj);
    },
    [values, schema, onCustomizationChange]
  );

  return (
    <div className="space-y-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Customize Your Product</h3>
        <p className="text-sm text-muted">
          Adjust the options below to make it yours.
        </p>
      </div>

      {schema.fields.map((field) => {
        switch (field.type) {
          case "text":
          case "textarea":
            return (
              <TextField
                key={field.id}
                field={field}
                value={String(values[field.id] || "")}
                onChange={updateValue}
              />
            );
          case "number":
            return (
              <NumberField
                key={field.id}
                field={field}
                value={Number(values[field.id] || 0)}
                onChange={updateValue}
              />
            );
          case "color":
            return (
              <ColorField
                key={field.id}
                field={field}
                value={String(values[field.id] || "")}
                onChange={updateValue}
              />
            );
          case "select":
            return (
              <SelectField
                key={field.id}
                field={field}
                value={String(values[field.id] || "")}
                onChange={updateValue}
              />
            );
          case "image":
            return (
              <ImageUploadField
                key={field.id}
                field={field}
                value={String(values[field.id] || "")}
                onChange={updateValue}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
