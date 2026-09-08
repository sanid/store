"use client";

import { useCallback, useMemo, useState } from "react";
import { getFabric } from "@/lib/curtains";
import {
  CONDITIONS,
  EXTRAS,
  LEATHER_GRADES,
  OBJECT_TYPES,
  SERVICES,
} from "@/lib/quote/catalog";
import type { ConditionId, ExtraId, ObjectTypeId, ServiceId } from "@/lib/quote/catalog";
import { scoreInput } from "@/lib/quote/estimate";
import { UPHOLSTERY_FABRICS, priceQuote } from "@/lib/quote/pricing";
import type { QuoteResponse, QuoteSelection } from "@/lib/quote/types";
import { formatPrice } from "@/lib/utils";
import BuildProgress from "./BuildProgress";
import MaterialPicker from "./MaterialPicker";
import ObjectSilhouette from "./ObjectSilhouette";
import PhotoUpload from "./PhotoUpload";
import PieceStage from "./PieceStage";
import SubmitDialog from "./SubmitDialog";
import Swatch from "./Swatch";
import { useReconstruction } from "./useReconstruction";
import type { ReconstructionState } from "./useReconstruction";
import type { UploadedPhoto } from "./PhotoUpload";

const MAX_DETAIL_PHOTOS = 5;
const MAX_OVERVIEW_PHOTOS = 3;

/**
 * There is no separate "result" step: the result *is* what we render once the
 * analysis is in and the 3D reconstruction is no longer worth waiting for.
 */
type Step = "input" | "working";

export interface QuoteCalculatorProps {
  /** Preselection handed over from the teaser on the home page. */
  initialService?: ServiceId;
  initialObjectType?: ObjectTypeId;
}

export default function QuoteCalculator({
  initialService = "reupholster",
  initialObjectType = "chair",
}: QuoteCalculatorProps) {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  /** Set when the customer would rather see the price than wait for the mesh. */
  const [skipWait, setSkipWait] = useState(false);

  // --- form state ---------------------------------------------------------
  const [service, setService] = useState<ServiceId>(initialService);
  const [objectType, setObjectType] = useState<ObjectTypeId>(initialObjectType);
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [height, setHeight] = useState("");
  const [detailPhotos, setDetailPhotos] = useState<UploadedPhoto[]>([]);
  const [overviewPhotos, setOverviewPhotos] = useState<UploadedPhoto[]>([]);

  // --- result state -------------------------------------------------------
  const [result, setResult] = useState<QuoteResponse | null>(null);
  const [selection, setSelection] = useState<QuoteSelection | null>(null);
  /** Runs alongside the analysis — see `useReconstruction`. */
  const reconstruction = useReconstruction();

  const breakdown = useMemo(() => {
    if (!result || !selection) return null;
    return priceQuote(result.estimate, selection);
  }, [result, selection]);

  const allPhotos = useMemo(
    () => [...overviewPhotos, ...detailPhotos],
    [overviewPhotos, detailPhotos],
  );

  const dimensions = useMemo(
    () => ({
      width: width ? Number(width) : undefined,
      depth: depth ? Number(depth) : undefined,
      height: height ? Number(height) : undefined,
    }),
    [width, depth, height],
  );

  // Same score the server uses, so the meter promises exactly what it delivers.
  const inputQuality = useMemo(
    () =>
      scoreInput({
        service,
        objectType,
        quantity,
        description,
        dimensions,
        photos: allPhotos.map((p) => p.dataUrl),
      }),
    [service, objectType, quantity, description, dimensions, allPhotos],
  );

  const submit = useCallback(async () => {
    setError(null);
    setSkipWait(false);
    setStep("working");

    // The 3D reconstruction starts first and runs in parallel: it is the slower
    // of the two, and the customer waits for one thing, not two in sequence.
    const best = bestPhoto(overviewPhotos, detailPhotos);
    if (best) void reconstruction.start(best.dataUrl, objectType);
    else reconstruction.reset();

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          objectType,
          quantity,
          description,
          dimensions,
          photos: allPhotos.map((p) => p.dataUrl),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          (data as { error?: string } | null)?.error ??
            "Die Kalkulation ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
        );
        setStep("input");
        return;
      }

      const quote = data as QuoteResponse;
      setResult(quote);
      setSelection(quote.selection);
      // Moving on is left to the effect below: if the 3D model is still being
      // built, the customer keeps watching progress instead of seeing the piece
      // pop in a moment after the price.
    } catch {
      setError("Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es erneut.");
      setStep("input");
    }
  }, [
    service,
    objectType,
    quantity,
    description,
    dimensions,
    allPhotos,
    overviewPhotos,
    detailPhotos,
    reconstruction,
  ]);

  // Both tracks have to land — or the 3D one has to be out of the running —
  // before the result is worth showing.
  const modelPending =
    reconstruction.state.phase !== "off" &&
    reconstruction.state.phase !== "done" &&
    reconstruction.state.phase !== "failed";

  const update = useCallback(<K extends keyof QuoteSelection>(key: K, value: QuoteSelection[K]) => {
    setSelection((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const toggleExtra = useCallback((id: ExtraId) => {
    setSelection((prev) => {
      if (!prev) return prev;
      const has = prev.extras.includes(id);
      return {
        ...prev,
        extras: has ? prev.extras.filter((x) => x !== id) : [...prev.extras, id],
      };
    });
  }, []);

  const showResult =
    step === "working" && result && selection && breakdown && (skipWait || !modelPending);

  if (showResult && result && selection && breakdown) {
    return (
      <ResultView
        result={result}
        selection={selection}
        breakdown={breakdown}
        photos={allPhotos}
        dimensions={dimensions}
        reconstruction={reconstruction.state}
        onUpdate={update}
        onToggleExtra={toggleExtra}
        onRestart={() => {
          setResult(null);
          setSelection(null);
          reconstruction.reset();
          setSkipWait(false);
          setStep("input");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16 lg:pt-14">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
          Schnellkalkulator
        </p>
        <h1 className="mt-2 font-serif text-3xl font-light tracking-tight text-stone-900 sm:text-4xl">
          Richtpreis in zwei Minuten
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
          Fotos hochladen, kurz beschreiben — Sie bekommen sofort einen Preisrahmen und können
          Stoff, Leder und Zusatzarbeiten daran ausprobieren.
        </p>
      </header>

      {step === "working" ? (
        <BuildProgress
          photoCount={allPhotos.length}
          assessmentDone={result !== null}
          modelPhase={reconstruction.state.phase}
          queuePosition={reconstruction.state.queuePosition}
          onSkip={result !== null ? () => setSkipWait(true) : undefined}
        />
      ) : (
        <div className="space-y-5">
          <Card step={1} title="Was sollen wir machen?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setService(s.id)}
                  aria-pressed={service === s.id}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${
                    service === s.id
                      ? "border-orange-500 bg-orange-50 ring-1 ring-orange-200"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <span className="block text-sm font-medium text-stone-900">{s.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card step={2} title="Um welches Objekt geht es?">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {OBJECT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setObjectType(t.id)}
                  aria-pressed={objectType === t.id}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition ${
                    objectType === t.id
                      ? "border-orange-500 bg-orange-50 ring-1 ring-orange-200"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <ObjectSilhouette
                    objectType={t.id}
                    color={objectType === t.id ? "#f59e0b" : "#d6d3d1"}
                    frameColor={objectType === t.id ? "#b45309" : "#a8a29e"}
                    className="h-9 w-full"
                  />
                  <span
                    className={`text-center text-[11px] font-medium leading-tight ${
                      objectType === t.id ? "text-orange-800" : "text-stone-600"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

          </Card>

          <Card step={3} title="Anzahl & Maße">
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
              <label className="block">
                <FieldLabel>Anzahl Stücke</FieldLabel>
                <Stepper
                  value={quantity}
                  onChange={(v) => setQuantity(Math.min(40, Math.max(1, v)))}
                />
              </label>

              {/* The one input that tightens the price band most — keep it the
                  visually loudest thing in this card. */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3.5">
                <FieldLabel>
                  Maße in cm{" "}
                  <span className="font-normal normal-case tracking-normal text-orange-600">
                    macht den Preis genauer
                  </span>
                </FieldLabel>
                <div className="flex gap-2">
                  <DimInput label="Breite" value={width} onChange={setWidth} />
                  <DimInput label="Tiefe" value={depth} onChange={setDepth} />
                  <DimInput label="Höhe" value={height} onChange={setHeight} />
                </div>
                <p className="mt-2 text-[11px] leading-snug text-stone-500">
                  Ohne Maße schätzen wir aus den Fotos — mit Maßen wird der Preisrahmen deutlich
                  enger.
                </p>
              </div>
            </div>
          </Card>

          <Card step={4} title="Fotos hochladen" hint="Je schärfer, desto enger der Preisrahmen">
            <div className="grid gap-5 sm:grid-cols-2">
              <PhotoUpload
                photos={overviewPhotos}
                onChange={setOverviewPhotos}
                max={MAX_OVERVIEW_PHOTOS}
                label="Gesamtansicht"
                hint="Vorne, seitlich und von hinten — damit die Bauform erkennbar ist."
              />
              <PhotoUpload
                photos={detailPhotos}
                onChange={setDetailPhotos}
                max={MAX_DETAIL_PHOTOS}
                label="Detailaufnahmen"
                hint="Möglichst nah und scharf auf Nähte, Kanten und beschädigte Stellen."
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
              Die Bilder werden ausschließlich für diese Kalkulation verarbeitet.
            </p>
          </Card>

          <Card step={5} title="Beschreibung" hint="optional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Was ist das für ein Stück, was stört Sie daran, gibt es Besonderheiten? Z. B. „Sessel aus den 60ern, Sitzfläche durchgesessen, Holzgestell soll bleiben.“"
              className="w-full resize-y rounded-xl border border-stone-200 px-3.5 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400"
            />
          </Card>

          <QualityMeter
            quality={inputQuality}
            photos={allPhotos.length}
            hasWidth={Boolean(dimensions.width)}
            hasText={description.trim().length >= 40}
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="hidden lg:block">
            <SubmitButton onClick={() => void submit()} />
            <Disclaimer />
          </div>

          {/* Mobile: the action stays reachable while scrolling the form. */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <SubmitButton onClick={() => void submit()} />
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600"
    >
      Richtpreis berechnen
    </button>
  );
}

function Disclaimer() {
  return (
    <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">
      Unverbindlicher Richtwert, kein Angebot. Der verbindliche Preis steht nach Sichtung des
      Objekts fest.
    </p>
  );
}

/**
 * Turns "wie genau wird das?" into something the customer can act on. The score
 * is the same one the analysis uses, so following the hint really does tighten
 * the price band they get.
 */
function QualityMeter({
  quality,
  photos,
  hasWidth,
  hasText,
}: {
  quality: number;
  photos: number;
  hasWidth: boolean;
  hasText: boolean;
}) {
  const pct = Math.round(quality * 100);
  const level = quality >= 0.75 ? "Hoch" : quality >= 0.45 ? "Mittel" : "Niedrig";
  const tone =
    quality >= 0.75 ? "bg-emerald-500" : quality >= 0.45 ? "bg-amber-500" : "bg-stone-400";

  const next =
    photos < 2
      ? "Zwei bis drei Fotos aus verschiedenen Winkeln hochladen"
      : !hasWidth
        ? "Breite in cm ergänzen"
        : photos < 4
          ? "Eine Detailaufnahme von Naht oder Schadstelle ergänzen"
          : !hasText
            ? "Kurz beschreiben, was gemacht werden soll"
            : null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        <span>Genauigkeit Ihrer Angaben</span>
        <span className="text-stone-700">{level}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone}`}
          style={{ width: `${Math.max(5, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] leading-snug text-stone-600">
        {next ? (
          <>
            <span className="font-medium text-stone-800">Nächster Schritt:</span> {next} — das macht
            den Preisrahmen enger.
          </>
        ) : (
          "Sehr gute Grundlage — der Preisrahmen wird entsprechend eng."
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Result & configurator                                                     */
/* -------------------------------------------------------------------------- */

function ResultView({
  result,
  selection,
  breakdown,
  photos,
  dimensions,
  reconstruction,
  onUpdate,
  onToggleExtra,
  onRestart,
}: {
  result: QuoteResponse;
  selection: QuoteSelection;
  breakdown: NonNullable<ReturnType<typeof priceQuote>>;
  photos: UploadedPhoto[];
  dimensions?: { width?: number; depth?: number; height?: number };
  reconstruction: ReconstructionState;
  onUpdate: <K extends keyof QuoteSelection>(key: K, value: QuoteSelection[K]) => void;
  onToggleExtra: (id: ExtraId) => void;
  onRestart: () => void;
}) {
  const { estimate } = result;
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  const fabric = getFabric(selection.fabricId);
  const leather = LEATHER_GRADES.find((g) => g.id === selection.leatherGradeId);
  const materialColor =
    selection.materialKind === "leather" ? (leather?.hex ?? "#6b4a35") : (fabric?.hex ?? "#c9a54a");
  const textureUrl = selection.materialKind === "fabric" ? fabric?.textureUrl : undefined;
  const materialName =
    selection.materialKind === "leather"
      ? (leather?.label ?? "Leder")
      : fabric
        ? `${fabric.brand} ${fabric.collection} — ${fabric.colorName}`
        : "Stoff";

  // What each extra actually adds, priced the same way as everything else. Far
  // more useful to a customer than the hours behind it.
  const extraCosts = useMemo(() => {
    const map = new Map<ExtraId, number>();
    for (const extra of EXTRAS) {
      const active = selection.extras.includes(extra.id);
      const other = active
        ? selection.extras.filter((x) => x !== extra.id)
        : [...selection.extras, extra.id];
      const diff = priceQuote(estimate, { ...selection, extras: other }).gross - breakdown.gross;
      map.set(extra.id, active ? -diff : diff);
    }
    return map;
  }, [estimate, selection, breakdown.gross]);

  const lowConfidence = estimate.confidence < 0.45;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px]">
      {/* ---------------------------------------------------------------- */}
      {/* Drawing                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100">
        <div className="lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto">
          {/* One column that actually uses the width it is given: the piece on
              top, then the evidence it was built from side by side. The card
              keeps a reading width so the summary doesn't become a long line. */}
          <div className="mx-auto w-full max-w-[1120px] px-5 py-6 sm:px-7">
            <PieceStage
              reconstruction={reconstruction}
              outline={estimate.outline}
              objectType={estimate.objectType}
              objectLabel={estimate.objectLabel}
              materialName={materialName}
              material={{
                color: materialColor,
                textureUrl,
                kind: selection.materialKind,
              }}
            />

            <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_200px]">
              <AnalysisCard
                estimate={estimate}
                meta={result.meta}
                expanded={showDetails}
                onToggle={() => setShowDetails((v) => !v)}
                className="md:max-w-[720px]"
              />

              {photos.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                    Ihre Fotos
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 md:grid-cols-2">
                    {photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.dataUrl}
                        alt={p.name}
                        className="aspect-square w-full rounded-lg object-cover opacity-90"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Configurator panel                                               */}
      {/* ---------------------------------------------------------------- */}
      <aside className="border-stone-200 bg-white pb-24 lg:border-l lg:pb-0">
        <div className="px-6 py-6 lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)] lg:overflow-y-auto">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
                Richtpreis
              </p>
              <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-500">
                {result.quoteCode}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-stone-900">{estimate.objectLabel}</h2>

            <p className="mt-3 text-4xl font-bold tracking-tight text-stone-900">
              <span className="mr-1 text-xl font-medium text-stone-400">ca.</span>
              {approx(breakdown.gross, 5)}
            </p>
            <p className="mt-1.5 text-[12px] text-stone-500">
              Erfahrungsgemäß zwischen{" "}
              <span className="font-medium text-stone-700">{approx(breakdown.low, 5)}</span> und{" "}
              <span className="font-medium text-stone-700">{approx(breakdown.high, 5)}</span> · inkl.
              MwSt.
              {selection.quantity > 1 && (
                <> · {approx(breakdown.gross / selection.quantity, 5)} pro Stück</>
              )}
            </p>
          </div>

          {lowConfidence && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
              Für dieses Stück reichen die Angaben nur für eine grobe Orientierung. Mit schärferen
              Fotos und den Maßen wird der Rahmen deutlich enger.
            </div>
          )}

          <Section label="Material">
            <div className="mb-3 flex gap-1.5">
              {(["fabric", "leather"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onUpdate("materialKind", kind)}
                  aria-pressed={selection.materialKind === kind}
                  className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selection.materialKind === kind
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {kind === "fabric" ? "Stoff" : "Leder"}
                </button>
              ))}
            </div>

            {selection.materialKind === "fabric" ? (
              <FabricGrid
                selectedId={selection.fabricId}
                onSelect={(id) => onUpdate("fabricId", id)}
                onOpenLibrary={() => setShowMaterials(true)}
              />
            ) : (
              <div className="space-y-1.5">
                {LEATHER_GRADES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onUpdate("leatherGradeId", g.id)}
                    aria-pressed={selection.leatherGradeId === g.id}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      selection.leatherGradeId === g.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <span
                      className="h-8 w-8 flex-shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: g.hex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-stone-900">{g.label}</span>
                      <span className="block truncate text-[11px] text-stone-500">{g.hint}</span>
                    </span>
                    <PriceTier
                      value={g.pricePerSqm}
                      min={LEATHER_GRADES[0].pricePerSqm}
                      max={LEATHER_GRADES[LEATHER_GRADES.length - 1].pricePerSqm}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowMaterials(true)}
                  className="w-full cursor-pointer rounded-xl bg-stone-100 px-3 py-2 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-200"
                >
                  Alle Materialien ansehen →
                </button>
              </div>
            )}
          </Section>

          <Section label="Zusatzarbeiten">
            <div className="space-y-1">
              {EXTRAS.map((extra) => {
                const active = selection.extras.includes(extra.id);
                const suggested = estimate.suggestedExtras.includes(extra.id);
                const cost = extraCosts.get(extra.id) ?? 0;
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => onToggleExtra(extra.id)}
                    aria-pressed={active}
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-orange-500 bg-orange-50"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] text-white transition ${
                        active ? "border-orange-500 bg-orange-500" : "border-stone-300"
                      }`}
                      aria-hidden
                    >
                      {active ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-stone-900">{extra.label}</span>
                        {suggested && (
                          <span className="rounded bg-orange-500 px-1 py-px text-[8px] font-semibold uppercase text-white">
                            erkannt
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] leading-snug text-stone-500">
                        {extra.hint}
                      </span>
                    </span>
                    <span className="flex-shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-stone-500">
                      {cost > 0 ? `+ ${approx(cost, 1)}` : "inklusive"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Zustand">
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onUpdate("condition", c.id as ConditionId)}
                  aria-pressed={selection.condition === c.id}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selection.condition === c.id
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Anzahl">
            <Stepper
              value={selection.quantity}
              onChange={(v) => onUpdate("quantity", Math.min(40, Math.max(1, v)))}
            />
          </Section>

          {/* Breakdown ---------------------------------------------------- */}
          <div className="border-t border-stone-100 py-4">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 transition hover:text-stone-800"
              aria-expanded={showBreakdown}
            >
              Was ist enthalten
              <span aria-hidden>{showBreakdown ? "−" : "+"}</span>
            </button>

            {showBreakdown && (
              <div className="mt-3 space-y-2">
                {breakdown.lines.map((line) => (
                  <div key={line.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="min-w-0 flex-1">
                      <span className="block text-stone-700">{line.label}</span>
                      {line.detail && (
                        <span className="block text-[11px] text-stone-400">{line.detail}</span>
                      )}
                    </span>
                    <span className="flex-shrink-0 tabular-nums text-stone-700">
                      {formatPrice(line.amount)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 text-xs font-semibold text-stone-900">
                  <span>Gesamt inkl. 19 % MwSt.</span>
                  <span className="tabular-nums">{formatPrice(breakdown.gross)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <PrimaryActions
              onRequest={() => setShowSubmit(true)}
              onRestart={onRestart}
              quoteCode={result.quoteCode}
            />
          </div>
        </div>

        {/* Mobile action bar ------------------------------------------------ */}
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-stone-400">
              Richtpreis
            </p>
            <p className="text-base font-bold text-stone-900">ca. {approx(breakdown.gross, 5)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="ml-auto flex-shrink-0 cursor-pointer rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Angebot anfragen
          </button>
        </div>
      </aside>

      {showMaterials && (
        <MaterialPicker
          materialKind={selection.materialKind}
          selectedFabricId={selection.fabricId}
          selectedLeatherId={selection.leatherGradeId}
          onSelectFabric={(id) => {
            onUpdate("materialKind", "fabric");
            onUpdate("fabricId", id);
          }}
          onSelectLeather={(id) => {
            onUpdate("materialKind", "leather");
            onUpdate("leatherGradeId", id);
          }}
          onClose={() => setShowMaterials(false)}
        />
      )}

      {showSubmit && (
        <SubmitDialog
          quoteCode={result.quoteCode}
          estimate={estimate}
          selection={selection}
          meta={result.meta}
          previewGross={breakdown.gross}
          photos={photos}
          dimensions={dimensions}
          onClose={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}

function PrimaryActions({
  onRequest,
  onRestart,
  quoteCode,
}: {
  onRequest: () => void;
  onRestart: () => void;
  quoteCode: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onRequest}
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Verbindliches Angebot anfragen
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="mt-2 w-full cursor-pointer rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
      >
        Neue Kalkulation
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">
        Unverbindlicher Richtwert. Notieren Sie sich {quoteCode} für Rückfragen.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

/**
 * What was recognised, in the customer's language. Everything that only the
 * workshop needs — hours, running metres, difficulty factors — stays out.
 */
function AnalysisCard({
  estimate,
  meta,
  expanded,
  onToggle,
  className,
}: {
  estimate: QuoteResponse["estimate"];
  meta: QuoteResponse["meta"];
  expanded: boolean;
  onToggle: () => void;
  /** Lets the caller cap the card's width on wide screens. */
  className?: string;
}) {
  const hasDetails =
    estimate.difficultyReasons.length > 0 ||
    estimate.riskFlags.length > 0 ||
    estimate.assumptions.length > 0;

  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          Das haben wir erkannt
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
          {meta.source === "ai" ? "Bildanalyse" : "Erfahrungswerte"}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-stone-700">{estimate.summary}</p>

      {(estimate.designStyle || estimate.era) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {estimate.designStyle && (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">
              {estimate.designStyle}
            </span>
          )}
          {estimate.era && (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">
              {estimate.era}
            </span>
          )}
        </div>
      )}

      {estimate.processSteps.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Ablauf in der Werkstatt
          </p>
          <ol className="mt-1.5 space-y-1">
            {estimate.processSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-snug text-stone-600">
                <span aria-hidden className="flex-shrink-0 tabular-nums text-stone-400">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {meta.notice && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          {meta.notice}
        </p>
      )}

      {estimate.riskFlags.length > 0 && (
        <BulletList title="Kann teurer werden, wenn" items={estimate.riskFlags} accent />
      )}

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="mt-4 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 transition hover:text-stone-800"
          >
            {expanded ? "Details ausblenden" : "Details zur Einschätzung"}
          </button>
          {expanded && (
            <>
              {estimate.difficultyReasons.length > 0 && (
                <BulletList title="Was den Aufwand treibt" items={estimate.difficultyReasons} />
              )}
              {estimate.assumptions.length > 0 && (
                <BulletList title="Angenommen haben wir" items={estimate.assumptions} muted />
              )}
            </>
          )}
        </>
      )}

      {estimate.followUpQuestions.length > 0 && (
        <div className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Das würde den Preis noch genauer machen
          </p>
          <ul className="mt-1.5 space-y-1">
            {estimate.followUpQuestions.map((q, i) => (
              <li key={i} className="text-[12px] leading-snug text-stone-600">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BulletList({
  title,
  items,
  accent,
  muted,
}: {
  title: string;
  items: string[];
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className={`flex gap-2 text-[12px] leading-snug ${
              accent ? "text-amber-800" : muted ? "text-stone-500" : "text-stone-600"
            }`}
          >
            <span aria-hidden className={accent ? "text-amber-500" : "text-stone-300"}>
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Relative price of a material, without publishing what we pay per metre. */
function PriceTier({ value, min, max }: { value: number; min: number; max: number }) {
  const span = Math.max(1, max - min);
  const level = value >= min + span * 0.66 ? 3 : value >= min + span * 0.33 ? 2 : 1;
  return (
    <span
      className="flex-shrink-0 text-[11px] tracking-tight text-stone-400"
      aria-label={`Preisklasse ${level} von 3`}
    >
      <span className="text-stone-700">{"€".repeat(level)}</span>
      {"€".repeat(3 - level)}
    </span>
  );
}

/**
 * A short row for a quick try, with the full library one click away. Showing
 * all hundred-odd swatches in a 460 px sidebar helps nobody choose.
 */
function FabricGrid({
  selectedId,
  onSelect,
  onOpenLibrary,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenLibrary: () => void;
}) {
  const selected = getFabric(selectedId);
  const prices = UPHOLSTERY_FABRICS.map((f) => f.pricePerMeter);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {QUICK_FABRICS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            title={`${f.brand} ${f.collection} — ${f.colorName}`}
            aria-label={`${f.brand} ${f.collection}, ${f.colorName}`}
            aria-pressed={selectedId === f.id}
            className={`cursor-pointer rounded-full transition ${
              selectedId === f.id ? "ring-2 ring-orange-500 ring-offset-2" : "hover:scale-110"
            }`}
          >
            <Swatch
              hex={f.hex}
              material={f.material}
              textureUrl={f.textureUrl}
              className="h-9 w-9 rounded-full ring-1 ring-black/10"
            />
          </button>
        ))}

        <button
          type="button"
          onClick={onOpenLibrary}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-stone-100 px-3.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-200"
        >
          Alle {UPHOLSTERY_FABRICS.length}
          <span aria-hidden>→</span>
        </button>
      </div>

      {selected && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-stone-500">
          <span className="min-w-0 truncate">
            {selected.brand} {selected.collection} — {selected.colorName}
          </span>
          <PriceTier value={selected.pricePerMeter} min={min} max={max} />
        </p>
      )}
    </div>
  );
}

/**
 * One colourway per collection, so the quick row spans the range of materials
 * rather than eleven shades of the same velvet.
 */
const QUICK_FABRICS = (() => {
  const seen = new Set<string>();
  return UPHOLSTERY_FABRICS.filter((f) => {
    const key = `${f.brand} ${f.collection}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
})();

function Card({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-white">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        {hint && <span className="ml-auto text-[11px] text-stone-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-stone-100 py-4 first:border-t-0">
      <span className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
      {children}
    </span>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-full bg-stone-100">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="cursor-pointer px-3.5 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-900"
        aria-label="Weniger"
      >
        −
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-stone-800">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="cursor-pointer px-3.5 py-2 text-lg leading-none text-stone-500 transition hover:text-stone-900"
        aria-label="Mehr"
      >
        +
      </button>
    </div>
  );
}

function DimInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block w-24">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={1000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={`${label} in cm`}
        className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400"
      />
    </label>
  );
}

/**
 * A price the customer should read as an estimate, not as an invoice: rounded
 * to whole euros on a sensible step, with no cents to suggest precision the
 * number does not have.
 */
function approx(cents: number, stepEuro: number): string {
  const euro = Math.round(cents / 100 / stepEuro) * stepEuro;
  return `${euro.toLocaleString("de-DE")} €`;
}

/**
 * The photo the reconstruction gets. An overview shot shows the whole piece,
 * which is what SAM needs; a close-up of a seam produces a lump.
 */
function bestPhoto(
  overview: UploadedPhoto[],
  detail: UploadedPhoto[],
): UploadedPhoto | undefined {
  return overview[0] ?? detail[0];
}
