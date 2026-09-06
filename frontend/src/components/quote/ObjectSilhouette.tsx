"use client";

import type { ObjectTypeId } from "@/lib/quote/catalog";

interface Props {
  objectType: ObjectTypeId;
  /** Base colour of the selected material. */
  color: string;
  /** Optional tileable texture for the upholstered surfaces. */
  textureUrl?: string;
  /** Rendered on frames and legs. */
  frameColor?: string;
  className?: string;
}

/**
 * Stylised silhouette of the detected object, upholstered in whatever material
 * is currently selected. It is a schematic, not a render of the customer's own
 * piece — it exists so a material change is immediately visible on something
 * shaped roughly like the thing being quoted.
 */
export default function ObjectSilhouette({
  objectType,
  color,
  textureUrl,
  frameColor = "#6b5b4a",
  className,
}: Props) {
  const fill = textureUrl ? `url(#uf-quote-texture)` : color;

  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      role="img"
      aria-label={`Schematische Darstellung: ${LABELS[objectType]}`}
    >
      <defs>
        {textureUrl && (
          <pattern id="uf-quote-texture" patternUnits="userSpaceOnUse" width="60" height="60">
            <rect width="60" height="60" fill={color} />
            <image href={textureUrl} width="60" height="60" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
        <linearGradient id="uf-quote-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="132" rx="72" ry="6" fill="#000" opacity="0.07" />
      <Shape objectType={objectType} fill={fill} frameColor={frameColor} />
    </svg>
  );
}

const LABELS: Record<ObjectTypeId, string> = {
  chair: "Stuhl",
  stool: "Hocker",
  armchair: "Sessel",
  bench: "Bank",
  "sofa-2": "Sofa, 2-Sitzer",
  "sofa-3": "Sofa, 3-Sitzer",
  "corner-sofa": "Ecksofa",
  headboard: "Kopfteil",
  "cushion-set": "Kissen",
  window: "Fenstertextil",
  other: "Objekt",
};

function Shape({
  objectType,
  fill,
  frameColor,
}: {
  objectType: ObjectTypeId;
  fill: string;
  frameColor: string;
}) {
  const shade = "url(#uf-quote-shade)";

  switch (objectType) {
    case "chair":
      return (
        <g>
          <rect x="72" y="26" width="56" height="42" rx="7" fill={fill} />
          <rect x="72" y="26" width="56" height="42" rx="7" fill={shade} />
          <rect x="64" y="70" width="72" height="16" rx="6" fill={fill} />
          <rect x="68" y="86" width="6" height="38" rx="3" fill={frameColor} />
          <rect x="126" y="86" width="6" height="38" rx="3" fill={frameColor} />
        </g>
      );

    case "stool":
      return (
        <g>
          <rect x="60" y="58" width="80" height="24" rx="10" fill={fill} />
          <rect x="60" y="58" width="80" height="24" rx="10" fill={shade} />
          <rect x="68" y="82" width="6" height="42" rx="3" fill={frameColor} />
          <rect x="126" y="82" width="6" height="42" rx="3" fill={frameColor} />
        </g>
      );

    case "armchair":
      return (
        <g>
          <rect x="58" y="24" width="84" height="48" rx="12" fill={fill} />
          <rect x="58" y="24" width="84" height="48" rx="12" fill={shade} />
          <rect x="44" y="52" width="20" height="42" rx="9" fill={fill} />
          <rect x="136" y="52" width="20" height="42" rx="9" fill={fill} />
          <rect x="52" y="72" width="96" height="24" rx="9" fill={fill} />
          <rect x="58" y="96" width="8" height="26" rx="4" fill={frameColor} />
          <rect x="134" y="96" width="8" height="26" rx="4" fill={frameColor} />
        </g>
      );

    case "bench":
      return (
        <g>
          <rect x="30" y="60" width="140" height="24" rx="9" fill={fill} />
          <rect x="30" y="60" width="140" height="24" rx="9" fill={shade} />
          <rect x="40" y="84" width="7" height="40" rx="3" fill={frameColor} />
          <rect x="153" y="84" width="7" height="40" rx="3" fill={frameColor} />
        </g>
      );

    case "sofa-2":
    case "sofa-3": {
      const seats = objectType === "sofa-3" ? 3 : 2;
      const inset = 26;
      const width = 200 - inset * 2;
      const seatW = width / seats;
      return (
        <g>
          <rect x={inset} y="30" width={width} height="42" rx="11" fill={fill} />
          <rect x={inset} y="30" width={width} height="42" rx="11" fill={shade} />
          <rect x={inset - 12} y="50" width="18" height="44" rx="8" fill={fill} />
          <rect x={inset + width - 6} y="50" width="18" height="44" rx="8" fill={fill} />
          {Array.from({ length: seats }).map((_, i) => (
            <rect
              key={i}
              x={inset + i * seatW + 2}
              y="72"
              width={seatW - 4}
              height="24"
              rx="7"
              fill={fill}
              stroke="#000"
              strokeOpacity="0.08"
            />
          ))}
          <rect x={inset + 6} y="96" width="8" height="24" rx="4" fill={frameColor} />
          <rect x={inset + width - 14} y="96" width="8" height="24" rx="4" fill={frameColor} />
        </g>
      );
    }

    case "corner-sofa":
      return (
        <g>
          <rect x="18" y="34" width="112" height="38" rx="10" fill={fill} />
          <rect x="18" y="34" width="112" height="38" rx="10" fill={shade} />
          <rect x="130" y="34" width="52" height="62" rx="10" fill={fill} />
          <rect x="130" y="34" width="52" height="62" rx="10" fill={shade} />
          <rect x="22" y="72" width="104" height="24" rx="7" fill={fill} stroke="#000" strokeOpacity="0.08" />
          <rect x="26" y="96" width="8" height="22" rx="4" fill={frameColor} />
          <rect x="166" y="96" width="8" height="22" rx="4" fill={frameColor} />
        </g>
      );

    case "headboard":
      return (
        <g>
          <rect x="34" y="18" width="132" height="66" rx="10" fill={fill} />
          <rect x="34" y="18" width="132" height="66" rx="10" fill={shade} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <circle key={`${r}-${c}`} cx={58 + c * 28} cy={36 + r * 20} r="2.4" fill="#000" opacity="0.2" />
            )),
          )}
          <rect x="34" y="84" width="132" height="10" rx="4" fill={frameColor} />
          <rect x="44" y="94" width="7" height="28" rx="3" fill={frameColor} />
          <rect x="149" y="94" width="7" height="28" rx="3" fill={frameColor} />
        </g>
      );

    case "cushion-set":
      return (
        <g>
          <rect x="30" y="52" width="66" height="62" rx="12" fill={fill} />
          <rect x="30" y="52" width="66" height="62" rx="12" fill={shade} />
          <rect x="102" y="42" width="68" height="72" rx="12" fill={fill} />
          <rect x="102" y="42" width="68" height="72" rx="12" fill={shade} />
        </g>
      );

    case "window":
      return (
        <g>
          <rect x="56" y="16" width="88" height="102" rx="3" fill="#e7e5e2" />
          <rect x="62" y="22" width="76" height="90" rx="2" fill="#cfd9de" />
          <path d="M40 12 h34 c0 40 -10 66 -4 106 h-30 z" fill={fill} />
          <path d="M40 12 h34 c0 40 -10 66 -4 106 h-30 z" fill={shade} />
          <path d="M160 12 h-34 c0 40 10 66 4 106 h30 z" fill={fill} />
          <path d="M160 12 h-34 c0 40 10 66 4 106 h30 z" fill={shade} />
          <rect x="34" y="8" width="132" height="6" rx="3" fill={frameColor} />
        </g>
      );

    default:
      return (
        <g>
          <rect x="52" y="34" width="96" height="62" rx="12" fill={fill} />
          <rect x="52" y="34" width="96" height="62" rx="12" fill={shade} />
          <rect x="62" y="96" width="8" height="26" rx="4" fill={frameColor} />
          <rect x="130" y="96" width="8" height="26" rx="4" fill={frameColor} />
        </g>
      );
  }
}
