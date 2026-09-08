"use client";

/**
 * A material swatch. Only one fabric in the catalog ships a photographed
 * texture, so the rest are drawn: a weave suggestion in CSS over the base
 * colour, chosen by material. It is not a substitute for a real scan, but a
 * grid of a hundred flat squares tells a customer nothing about whether they
 * are looking at felt or velvet, and this does.
 */
export default function Swatch({
  hex,
  material,
  textureUrl,
  className,
}: {
  hex: string;
  material: string;
  textureUrl?: string;
  className?: string;
}) {
  if (textureUrl) {
    return (
      <span
        className={`block overflow-hidden bg-cover bg-center ${className ?? ""}`}
        style={{ backgroundColor: hex, backgroundImage: `url(${textureUrl})` }}
      />
    );
  }

  return (
    <span
      className={`block overflow-hidden ${className ?? ""}`}
      style={{ backgroundColor: hex, ...weave(material) }}
    />
  );
}

/** Layered CSS gradients that read as the weave they are named after. */
function weave(material: string): React.CSSProperties {
  switch (material) {
    case "velvet":
      // Pile catches the light along the nap and goes dark at the edges.
      return {
        backgroundImage:
          "linear-gradient(105deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.05) 38%, rgba(0,0,0,0.16) 74%, rgba(0,0,0,0.3) 100%)",
      };
    case "wool":
      return {
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 4px)," +
          "repeating-linear-gradient(-45deg, rgba(0,0,0,0.1) 0 1px, transparent 1px 4px)",
      };
    case "blend":
      // Bouclé: loops of yarn standing proud of the ground weave.
      return {
        backgroundImage:
          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0 1.4px, transparent 1.6px)," +
          "radial-gradient(circle at 68% 22%, rgba(0,0,0,0.16) 0 1.6px, transparent 1.8px)," +
          "radial-gradient(circle at 42% 72%, rgba(255,255,255,0.24) 0 1.6px, transparent 1.8px)," +
          "radial-gradient(circle at 82% 68%, rgba(0,0,0,0.14) 0 1.4px, transparent 1.6px)",
        backgroundSize: "13px 13px, 17px 17px, 15px 15px, 19px 19px",
      };
    case "linen":
      return {
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0 1px, transparent 1px 3px)," +
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 3px)",
      };
    case "cotton":
      return {
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 2px)," +
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 2px)",
      };
    case "silk-blend":
      return {
        backgroundImage:
          "linear-gradient(60deg, rgba(255,255,255,0.34) 0%, transparent 30%, rgba(255,255,255,0.2) 52%, transparent 76%, rgba(0,0,0,0.18) 100%)",
      };
    case "leather":
      return {
        backgroundImage:
          "radial-gradient(ellipse at 28% 32%, rgba(255,255,255,0.22), transparent 58%)," +
          "radial-gradient(circle at 62% 58%, rgba(0,0,0,0.14) 0 2px, transparent 2.4px)," +
          "radial-gradient(circle at 24% 74%, rgba(0,0,0,0.1) 0 1.6px, transparent 2px)",
        backgroundSize: "100% 100%, 11px 11px, 15px 15px",
      };
    default:
      return {
        backgroundImage: "linear-gradient(150deg, rgba(255,255,255,0.16), rgba(0,0,0,0.12))",
      };
  }
}
