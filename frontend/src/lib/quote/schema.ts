import { EXTRAS, OBJECT_TYPES, SERVICES } from "./catalog";

const OBJECT_IDS = OBJECT_TYPES.map((t) => t.id);
const SERVICE_IDS = SERVICES.map((s) => s.id);
const EXTRA_IDS = EXTRAS.filter((e) => !e.perOrder).map((e) => e.id);

/**
 * JSON Schema the model must fill in. Strict on purpose: every provider is
 * configured to reject anything that doesn't match, so the route only ever
 * validates *values* (are the numbers plausible?), never the shape.
 *
 * Note there is no price field anywhere — the model estimates work and
 * material, and our own pricing code turns that into money.
 */
export const ANALYSIS_SCHEMA_NAME = "polster_analyse";

export const ANALYSIS_SCHEMA_DESCRIPTION =
  "Erfasse die Werkstatt-Einschätzung für das abgebildete Objekt: Klassifikation, " +
  "Materialbedarf, Arbeitsaufwand, Schwierigkeit und Unsicherheiten.";

export const ANALYSIS_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "objectType",
    "objectLabel",
    "service",
    "quantity",
    "materialKind",
    "fabricMeters",
    "foamLiters",
    "laborHours",
    "difficulty",
    "difficultyReasons",
    "condition",
    "suggestedExtras",
    "confidence",
    "summary",
    "assumptions",
    "riskFlags",
    "followUpQuestions",
  ],
  properties: {
    objectType: {
      type: "string",
      enum: OBJECT_IDS,
      description:
        "Erkannter Möbel-/Objekttyp. Weicht ggf. von der Nutzerangabe ab — dann in assumptions erwähnen.",
    },
    objectLabel: {
      type: "string",
      description:
        "Kurze deutsche Bezeichnung des konkreten Objekts, z. B. 'Freischwinger mit gepolsterter Sitzfläche'.",
    },
    service: {
      type: "string",
      enum: SERVICE_IDS,
      description: "Passende Leistungsart für die sichtbare Aufgabe.",
    },
    quantity: {
      type: "integer",
      description: "Anzahl gleichartiger Stücke, die kalkuliert werden sollen.",
    },
    materialKind: {
      type: "string",
      enum: ["fabric", "leather"],
      description: "Bezugsmaterial des Bestands bzw. das naheliegende Neumaterial.",
    },
    fabricMeters: {
      type: "number",
      description:
        "Benötigte Laufmeter bei 140 cm Warenbreite für die GESAMTE Menge, inkl. üblichem Verschnitt, ohne Musterrapport.",
    },
    foamLiters: {
      type: "number",
      description: "Geschätzter Schaumstoffbedarf in Litern für die gesamte Menge. 0 falls nicht nötig.",
    },
    laborHours: {
      type: "number",
      description: "Reine Werkstattstunden für die GESAMTE Menge, ohne Zuschläge für Extras.",
    },
    difficulty: {
      type: "integer",
      enum: [1, 2, 3, 4, 5],
      description:
        "1 = einfach (glatte Fläche, gerade Nähte), 5 = sehr anspruchsvoll (Rundungen, Kapitonierung, alte Unterfederung).",
    },
    difficultyReasons: {
      type: "array",
      items: { type: "string" },
      description: "Kurze deutsche Stichpunkte, was den Aufwand treibt. 1–4 Einträge.",
    },
    condition: {
      type: "string",
      enum: ["good", "worn", "damaged", "severe"],
      description: "Sichtbarer Zustand des Objekts.",
    },
    suggestedExtras: {
      type: "array",
      items: { type: "string", enum: EXTRA_IDS },
      description: "Zusatzarbeiten, die anhand der Bilder nötig oder sehr wahrscheinlich sind.",
    },
    confidence: {
      type: "number",
      description:
        "0–1. Wie sicher ist die Einschätzung? Unter 0,5 bei unklaren, verdeckten oder unscharfen Bildern.",
    },
    summary: {
      type: "string",
      description: "1–2 Sätze auf Deutsch: was erkannt wurde und was gemacht werden müsste.",
    },
    assumptions: {
      type: "array",
      items: { type: "string" },
      description: "Getroffene Annahmen auf Deutsch, z. B. zu Maßen oder verdeckten Bereichen.",
    },
    riskFlags: {
      type: "array",
      items: { type: "string" },
      description:
        "Risiken, die den Preis nach oben treiben können, auf Deutsch. Leeres Array wenn keine.",
    },
    followUpQuestions: {
      type: "array",
      items: { type: "string" },
      description: "Fragen auf Deutsch, deren Antwort die Schätzung deutlich schärfen würde. 0–3 Einträge.",
    },
  },
};
