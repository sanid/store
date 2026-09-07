"use client";

import { useId } from "react";
import type { ObjectTypeId } from "@/lib/quote/catalog";
import type { QuoteOutline } from "@/lib/quote/types";
import ObjectSilhouette from "./ObjectSilhouette";

interface Props {
  /** Line drawing the analysis produced for this piece, if it produced one. */
  outline?: QuoteOutline;
  /** Fallback shape when there is no drawing. */
  objectType: ObjectTypeId;
  /** Base colour of the selected material. */
  color: string;
  /** Optional tileable texture for the upholstered surfaces. */
  textureUrl?: string;
  frameColor?: string;
  className?: string;
  label?: string;
}

/**
 * Draws the piece the analysis recognised and dresses it in the selected
 * material. The paths come from the model but never as markup: `sanitizeOutline`
 * has already reduced them to a role plus validated path data, and this
 * component decides on its own what each role is allowed to look like.
 *
 * Without a usable drawing it falls back to the built-in schematic, so material
 * changes stay visible either way.
 */
export default function OutlineFigure({
  outline,
  objectType,
  color,
  textureUrl,
  frameColor = "#6b5b4a",
  className,
  label,
}: Props) {
  const uid = useId().replace(/:/g, "");

  if (!outline || outline.parts.length === 0) {
    return (
      <ObjectSilhouette
        objectType={objectType}
        color={color}
        textureUrl={textureUrl}
        frameColor={frameColor}
        className={className}
      />
    );
  }

  const patternId = `uf-outline-tex-${uid}`;
  const shadeId = `uf-outline-shade-${uid}`;
  const material = textureUrl ? `url(#${patternId})` : color;

  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      role="img"
      aria-label={label ? `Zeichnung: ${label}` : "Zeichnung des erkannten Objekts"}
    >
      <defs>
        {textureUrl && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="48" height="48">
            <rect width="48" height="48" fill={color} />
            <image href={textureUrl} width="48" height="48" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
        <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="133" rx="70" ry="5" fill="#000" opacity="0.06" />

      <g strokeLinejoin="round" strokeLinecap="round">
        {outline.parts.map((part, i) => {
          switch (part.role) {
            case "upholstery":
            case "cushion":
              return (
                <g key={i}>
                  <path d={part.d} fill={material} stroke="#33291f" strokeOpacity="0.55" strokeWidth="1.1" />
                  <path d={part.d} fill={`url(#${shadeId})`} stroke="none" />
                </g>
              );
            case "frame":
            case "leg":
              return (
                <path
                  key={i}
                  d={part.d}
                  fill={frameColor}
                  stroke="#33291f"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              );
            case "seam":
              return (
                <path
                  key={i}
                  d={part.d}
                  fill="none"
                  stroke="#33291f"
                  strokeOpacity="0.4"
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2"
                />
              );
            default:
              return (
                <path
                  key={i}
                  d={part.d}
                  fill="none"
                  stroke="#33291f"
                  strokeOpacity="0.45"
                  strokeWidth="0.8"
                />
              );
          }
        })}
      </g>
    </svg>
  );
}
