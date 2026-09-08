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
  "Stil und Epoche, Materialbedarf, Arbeitsaufwand, Schwierigkeit und Unsicherheiten " +
  "sowie den geplanten Arbeitsablauf für den Kunden.";

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
    "fabricMetersMin",
    "fabricMetersMax",
    "foamLiters",
    "laborHours",
    "laborHoursMin",
    "laborHoursMax",
    "difficulty",
    "difficultyReasons",
    "condition",
    "suggestedExtras",
    "confidence",
    "summary",
    "designStyle",
    "era",
    "processSteps",
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
        "Benötigte Laufmeter bei 140 cm Warenbreite für die GESAMTE Menge, inkl. üblichem Verschnitt, ohne Musterrapport. Kundemaße haben Vorrang: leite den Bedarf aus Breite/Tiefe/Höhe ab, skaliert gegen die Referenzbreite des Objekttyps.",
    },
    fabricMetersMin: {
      type: "number",
      description:
        "Untere plausible Grenze des Stoffbedarfs. Eng halten: nur so weit unter fabricMeters, wie es realistisch ist — höchstens 15 % darunter.",
    },
    fabricMetersMax: {
      type: "number",
      description:
        "Obere plausible Grenze des Stoffbedarfs. Höchstens 15 % über fabricMeters.",
    },
    foamLiters: {
      type: "number",
      description: "Geschätzter Schaumstoffbedarf in Litern für die gesamte Menge. 0 falls nicht nötig.",
    },
    laborHours: {
      type: "number",
      description: "Reine Werkstattstunden für die GESAMTE Menge, ohne Zuschläge für Extras.",
    },
    laborHoursMin: {
      type: "number",
      description:
        "Untere plausible Grenze der Arbeitszeit, höchstens 18 % unter laborHours. Nur so weit spreizen, wie die Bilder es wirklich offen lassen.",
    },
    laborHoursMax: {
      type: "number",
      description:
        "Obere plausible Grenze der Arbeitszeit, höchstens 18 % über laborHours.",
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
    designStyle: {
      type: "string",
      description:
        "Designrichtung des Stücks in ein bis drei Wörtern, z. B. 'Mid-Century', 'Bauhaus', 'Chesterfield'. Kein bekannter Stil: knappe Charakteristik statt Stilname.",
    },
    era: {
      type: "string",
      description:
        "Zeiteinschätzung des Stücks, z. B. '1960er Jahre' oder 'Neuanfertigung'. Bei Unsicherheit mit 'wohl' formulieren.",
    },
    processSteps: {
      type: "array",
      items: { type: "string" },
      description:
        "3–6 kurze kundengerechte Arbeitsschritte für genau dieses Stück, vom Abnehmen des alten Bezugs bis zum Finish. Ohne Fachjargon.",
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
