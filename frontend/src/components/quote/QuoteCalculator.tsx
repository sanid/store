"use client";

import { useCallback, useMemo, useState } from "react";
import { getFabric } from "@/lib/curtains";
import {
  CONDITIONS,
  DIFFICULTY_LABEL,
  EXTRAS,
  LEATHER_GRADES,
  OBJECT_TYPES,
  SERVICES,
  getObjectType,
} from "@/lib/quote/catalog";
import type { ConditionId, ExtraId, ObjectTypeId, ServiceId } from "@/lib/quote/catalog";
import {
  UPHOLSTERY_FABRICS,
  priceQuote,
} from "@/lib/quote/pricing";
import type { QuoteResponse, QuoteSelection } from "@/lib/quote/types";
import { formatPrice } from "@/lib/utils";
import ObjectSilhouette from "./ObjectSilhouette";
import PhotoUpload from "./PhotoUpload";
import SubmitDialog from "./SubmitDialog";
import type { UploadedPhoto } from "./PhotoUpload";

const MAX_DETAIL_PHOTOS = 5;
const MAX_OVERVIEW_PHOTOS = 3;

type Step = "input" | "analyzing" | "result";

export default function QuoteCalculator() {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // --- form state ---------------------------------------------------------
  const [service, setService] = useState<ServiceId>("reupholster");
  const [objectType, setObjectType] = useState<ObjectTypeId>("chair");
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

  const breakdown = useMemo(() => {
    if (!result || !selection) return null;
    return priceQuote(result.estimate, selection);
  }, [result, selection]);

  const allPhotos = useMemo(
    () => [...overviewPhotos, ...detailPhotos],
    [overviewPhotos, detailPhotos],
  );

  const submit = useCallback(async () => {
    setError(null);
    setStep("analyzing");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          objectType,
          quantity,
          description,
          dimensions: {
            width: width ? Number(width) : undefined,
            depth: depth ? Number(depth) : undefined,
            height: height ? Number(height) : undefined,
          },
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
      setStep("result");
    } catch {
      setError("Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es erneut.");
      setStep("input");
    }
  }, [service, objectType, quantity, description, width, depth, height, allPhotos]);

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

  if (step === "result" && result && selection && breakdown) {
    return (
      <ResultView
        result={result}
        selection={selection}
        breakdown={breakdown}
        photos={allPhotos}
        dimensions={{
          width: width ? Number(width) : undefined,
          depth: depth ? Number(depth) : undefined,
          height: height ? Number(height) : undefined,
        }}
        onUpdate={update}
        onToggleExtra={toggleExtra}
        onRestart={() => {
          setResult(null);
          setSelection(null);
          setStep("input");
        }}
      />
    );
  }

  const objectDef = getObjectType(objectType);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      <header className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
          KI-Schnellkalkulator
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 sm:text-4xl">
          Richtpreis in zwei Minuten
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
          Fotos hochladen, Objekt beschreiben — die Analyse schätzt Materialbedarf und
          Arbeitsaufwand. Danach wählen Sie Stoff, Leder und Zusatzarbeiten und sehen sofort, wie
          sich der Richtpreis verändert.
        </p>
      </header>

      {step === "analyzing" ? (
        <AnalyzingPanel photoCount={allPhotos.length} />
      ) : (
        <div className="space-y-8">
          <Card step={1} title="Was sollen wir machen?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setService(s.id)}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${
                    service === s.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-stone-200 hover:border-stone-300"
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
            <div className="flex flex-wrap gap-1.5">
              {OBJECT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setObjectType(t.id)}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    objectType === t.id
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Anzahl Stücke
                </span>
                <div className="flex items-center rounded-full bg-stone-100">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="cursor-pointer px-3.5 py-2 text-stone-500 hover:text-stone-900"
                    aria-label="Weniger"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-stone-800">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(40, q + 1))}
                    className="cursor-pointer px-3.5 py-2 text-stone-500 hover:text-stone-900"
                    aria-label="Mehr"
                  >
                    +
                  </button>
                </div>
              </label>

              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Maße in cm <span className="font-normal normal-case tracking-normal">(optional)</span>
                </span>
                <div className="flex gap-2">
                  <DimInput label="Breite" value={width} onChange={setWidth} />
                  <DimInput label="Tiefe" value={depth} onChange={setDepth} />
                  <DimInput label="Höhe" value={height} onChange={setHeight} />
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-stone-400">
              Erfahrungswert für {objectDef.label.toLowerCase()}: ca. {objectDef.fabric.base} lfm
              Stoff und {objectDef.hours.base} Std. pro Stück bei vollem Neubezug.
            </p>
          </Card>

          <Card step={3} title="Fotos hochladen">
            <div className="grid gap-6 sm:grid-cols-2">
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
            <p className="mt-4 rounded-xl bg-stone-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-stone-500">
              Ohne Fotos rechnen wir nur mit Erfahrungswerten — die Schätzung wird dann deutlich
              ungenauer. Die Bilder werden ausschließlich für diese Kalkulation verarbeitet.
            </p>
          </Card>

          <Card step={4} title="Beschreibung">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="Was ist das für ein Stück, was stört Sie daran, gibt es Besonderheiten? Z. B. „Sessel aus den 60ern, Sitzfläche durchgesessen, Holzgestell soll bleiben.“"
              className="w-full resize-y rounded-xl border border-stone-200 px-3.5 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400"
            />
            <p className="mt-1 text-right text-[11px] text-stone-400">{description.length}/2000</p>
          </Card>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            className="w-full cursor-pointer rounded-xl bg-orange-500 px-6 py-4 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Richtpreis berechnen
          </button>

          <p className="text-center text-[11px] leading-relaxed text-stone-400">
            Das Ergebnis ist ein unverbindlicher Richtwert, kein Angebot. Der verbindliche Preis
            steht erst nach Sichtung des Objekts fest.
          </p>
        </div>
      )}
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
  onUpdate,
  onToggleExtra,
  onRestart,
}: {
  result: QuoteResponse;
  selection: QuoteSelection;
  breakdown: NonNullable<ReturnType<typeof priceQuote>>;
  photos: UploadedPhoto[];
  dimensions?: { width?: number; depth?: number; height?: number };
  onUpdate: <K extends keyof QuoteSelection>(key: K, value: QuoteSelection[K]) => void;
  onToggleExtra: (id: ExtraId) => void;
  onRestart: () => void;
}) {
  const { estimate } = result;
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  const fabric = getFabric(selection.fabricId);
  const leather = LEATHER_GRADES.find((g) => g.id === selection.leatherGradeId);
  const materialColor =
    selection.materialKind === "leather" ? (leather?.hex ?? "#6b4a35") : (fabric?.hex ?? "#c9a54a");
  const textureUrl = selection.materialKind === "fabric" ? fabric?.textureUrl : undefined;

  const lowConfidence = estimate.confidence < 0.5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px]">
      {/* ---------------------------------------------------------------- */}
      {/* Visualisation                                                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100">
        <div className="lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto">
          <div className="px-6 py-8">
            <div className="mx-auto max-w-md">
              <ObjectSilhouette
                objectType={estimate.objectType}
                color={materialColor}
                textureUrl={textureUrl}
                className="w-full"
              />
              <p className="mt-2 text-center text-[11px] text-stone-400">
                Schematische Darstellung im gewählten Material — kein Abbild Ihres Stücks.
              </p>
            </div>

            {photos.length > 0 && (
              <div className="mx-auto mt-8 max-w-md">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Ihre Fotos
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt={p.name}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mx-auto mt-8 max-w-md space-y-3">
              <AnalysisCard estimate={estimate} meta={result.meta} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Configurator panel                                               */}
      {/* ---------------------------------------------------------------- */}
      <aside className="border-stone-200 bg-white lg:border-l">
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

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-600">
                {formatPrice(breakdown.low)}
              </span>
              <span className="text-lg text-stone-400">–</span>
              <span className="text-2xl font-semibold text-stone-700">
                {formatPrice(breakdown.high)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              inkl. 19 % MwSt. · Mittelwert {formatPrice(breakdown.gross)} ·{" "}
              {selection.quantity > 1
                ? `${formatPrice(Math.round(breakdown.gross / selection.quantity))} pro Stück`
                : "1 Stück"}
            </p>

            <ConfidenceBar confidence={estimate.confidence} />
          </div>

          {lowConfidence && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
              Die Erkennung ist bei diesem Objekt unsicher — der angezeigte Preis ist nur eine grobe
              Orientierung. Mit schärferen Fotos und Maßen wird die Schätzung deutlich genauer.
            </div>
          )}

          <Section label="Material">
            <div className="mb-3 flex gap-1.5">
              {(["fabric", "leather"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onUpdate("materialKind", kind)}
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
              />
            ) : (
              <div className="space-y-1.5">
                {LEATHER_GRADES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onUpdate("leatherGradeId", g.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      selection.leatherGradeId === g.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-stone-200 hover:border-stone-300"
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
                    <span className="flex-shrink-0 text-[11px] tabular-nums text-stone-500">
                      {formatPrice(g.pricePerSqm)}/m²
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section label="Zusatzarbeiten">
            <div className="space-y-1">
              {EXTRAS.map((extra) => {
                const active = selection.extras.includes(extra.id);
                const suggested = estimate.suggestedExtras.includes(extra.id);
                return (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => onToggleExtra(extra.id)}
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                      active ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:border-stone-300"
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
                      {active && (
                        <span className="mt-0.5 block text-[10px] leading-snug text-stone-400">
                          {suggested
                            ? "Im geschätzten Aufwand bereits enthalten"
                            : extra.hours
                              ? `+ ${extra.hours.toLocaleString("de-DE")} Std. Mehrarbeit`
                              : "Zusatzkosten ohne Mehrarbeit"}
                        </span>
                      )}
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
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full bg-stone-100">
                <button
                  type="button"
                  onClick={() => onUpdate("quantity", Math.max(1, selection.quantity - 1))}
                  className="cursor-pointer px-3.5 py-2 text-stone-500 hover:text-stone-900"
                  aria-label="Weniger"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-stone-800">
                  {selection.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdate("quantity", Math.min(40, selection.quantity + 1))}
                  className="cursor-pointer px-3.5 py-2 text-stone-500 hover:text-stone-900"
                  aria-label="Mehr"
                >
                  +
                </button>
              </div>
              <span className="text-[11px] text-stone-400">
                {breakdown.meta.fabricMeters.toLocaleString("de-DE", { maximumFractionDigits: 1 })} lfm
                Material · {breakdown.meta.laborHours.toLocaleString("de-DE", { maximumFractionDigits: 1 })}{" "}
                Std. Arbeit
              </span>
            </div>
          </Section>

          {/* Breakdown ---------------------------------------------------- */}
          <div className="border-t border-stone-100 py-4">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 transition hover:text-stone-800"
              aria-expanded={showBreakdown}
            >
              So kommt der Preis zustande
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
                <div className="mt-2 border-t border-stone-100 pt-2 text-xs">
                  <Row label="Netto" value={formatPrice(breakdown.net)} />
                  <Row label="19 % MwSt." value={formatPrice(breakdown.vat)} />
                  <Row label="Brutto" value={formatPrice(breakdown.gross)} strong />
                </div>
                <p className="pt-1 text-[11px] leading-relaxed text-stone-400">
                  Die angezeigte Spanne von ±
                  {Math.round(breakdown.meta.spread * 100)} % ergibt sich aus der Sicherheit der
                  Einschätzung.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSubmit(true)}
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
            Unverbindlicher Richtwert. Notieren Sie sich {result.quoteCode} für Rückfragen.
          </p>
        </div>
      </aside>

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

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function AnalysisCard({
  estimate,
  meta,
}: {
  estimate: QuoteResponse["estimate"];
  meta: QuoteResponse["meta"];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          Einschätzung
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
          {meta.source === "ai" ? "Bildanalyse" : "Erfahrungswerte"}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-stone-700">{estimate.summary}</p>

      {meta.notice && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
          {meta.notice}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4">
        <Stat label="Material" value={`${fmt(estimate.fabricMeters)} lfm`} />
        <Stat label="Arbeitszeit" value={`${fmt(estimate.laborHours)} Std.`} />
        <Stat label="Schwierigkeit" value={`${estimate.difficulty}/5`} hint={DIFFICULTY_LABEL[estimate.difficulty]} />
      </dl>

      {estimate.difficultyReasons.length > 0 && (
        <BulletList title="Was den Aufwand treibt" items={estimate.difficultyReasons} />
      )}
      {estimate.riskFlags.length > 0 && (
        <BulletList title="Mögliche Zusatzkosten" items={estimate.riskFlags} accent />
      )}
      {estimate.assumptions.length > 0 && (
        <BulletList title="Annahmen" items={estimate.assumptions} muted />
      )}
      {estimate.followUpQuestions.length > 0 && (
        <div className="mt-4 rounded-xl bg-stone-50 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Das würde die Schätzung schärfen
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.1em] text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-800">{value}</dd>
      {hint && <dd className="text-[10px] text-stone-400">{hint}</dd>}
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone = confidence >= 0.7 ? "bg-emerald-500" : confidence >= 0.5 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-stone-400">
        <span>Sicherheit der Schätzung</span>
        <span className="tabular-nums">{pct} %</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
}

function FabricGrid({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = getFabric(selectedId);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {UPHOLSTERY_FABRICS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            title={`${f.brand} ${f.collection} — ${f.colorName}`}
            aria-label={`${f.brand} ${f.collection}, ${f.colorName}`}
            className={`h-9 w-9 cursor-pointer overflow-hidden rounded-full border transition ${
              selectedId === f.id
                ? "ring-2 ring-orange-500 ring-offset-2"
                : "border-stone-300 hover:scale-110"
            }`}
            style={{ backgroundColor: f.hex }}
          >
            {f.textureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.textureUrl} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-[11px] text-stone-500">
          {selected.brand} {selected.collection} — {selected.colorName} ·{" "}
          <span className="tabular-nums">{formatPrice(selected.pricePerMeter)}/lfm</span> ·{" "}
          {selected.webWidthCm} cm breit
        </p>
      )}
    </div>
  );
}

function AnalyzingPanel({ photoCount }: { photoCount: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" />
      <p className="mt-5 text-sm font-medium text-stone-800">
        {photoCount > 0
          ? `${photoCount} Bild${photoCount === 1 ? "" : "er"} werden ausgewertet…`
          : "Kalkulation läuft…"}
      </p>
      <p className="mt-1 text-[12px] text-stone-500">
        Bauform, Nähte und Zustand werden mit den Werkstatt-Erfahrungswerten abgeglichen. Das dauert
        meist 10–30 Sekunden.
      </p>
    </div>
  );
}

function Card({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-white">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? "font-semibold text-stone-900" : "text-stone-600"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
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
    <label className="block w-20">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={1000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={`${label} in cm`}
        className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400"
      />
    </label>
  );
}

function fmt(v: number): string {
  return v.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}
