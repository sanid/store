"use client";

import { useEffect, useMemo, useState } from "react";
import type { FabricSwatch } from "@/lib/curtains";
import { LEATHER_GRADES } from "@/lib/quote/catalog";
import type { LeatherGrade } from "@/lib/quote/catalog";
import { UPHOLSTERY_FABRICS } from "@/lib/quote/pricing";
import Swatch from "./Swatch";

interface Props {
  materialKind: "fabric" | "leather";
  selectedFabricId: string;
  selectedLeatherId: string;
  onSelectFabric: (id: string) => void;
  onSelectLeather: (id: string) => void;
  onClose: () => void;
}

type PriceBand = "all" | "low" | "mid" | "high";

/**
 * The full material library. The panel beside the piece keeps a short row of
 * swatches for a quick try; this is where someone actually chooses, so it is
 * searchable, grouped by collection, and every swatch is big enough to judge.
 */
export default function MaterialPicker({
  materialKind,
  selectedFabricId,
  selectedLeatherId,
  onSelectFabric,
  onSelectLeather,
  onClose,
}: Props) {
  const [kind, setKind] = useState<"fabric" | "leather">(materialKind);
  const [search, setSearch] = useState("");
  const [material, setMaterial] = useState<string>("all");
  const [band, setBand] = useState<PriceBand>("all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // The page behind must not scroll while this is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const prices = UPHOLSTERY_FABRICS.map((f) => f.pricePerMeter);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const third = (max - min) / 3;

  const materials = useMemo(
    () => [...new Set(UPHOLSTERY_FABRICS.map((f) => f.material))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return UPHOLSTERY_FABRICS.filter((f) => {
      if (material !== "all" && f.material !== material) return false;
      if (band === "low" && f.pricePerMeter >= min + third) return false;
      if (band === "mid" && (f.pricePerMeter < min + third || f.pricePerMeter >= min + third * 2))
        return false;
      if (band === "high" && f.pricePerMeter < min + third * 2) return false;
      if (q && !`${f.brand} ${f.collection} ${f.colorName} ${f.material}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [search, material, band, min, third]);

  const grouped = useMemo(() => {
    const map = new Map<string, FabricSwatch[]>();
    for (const f of filtered) {
      const key = `${f.brand} · ${f.collection}`;
      const list = map.get(key);
      if (list) list.push(f);
      else map.set(key, [f]);
    }
    return [...map.entries()];
  }, [filtered]);

  const count = kind === "fabric" ? filtered.length : LEATHER_GRADES.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Materialauswahl"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white sm:h-[86vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header ------------------------------------------------------- */}
        <div className="flex-shrink-0 border-b border-stone-200 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Material wählen</h2>
              <p className="mt-0.5 text-[12px] text-stone-500">
                {count} {kind === "fabric" ? "Stoffe" : "Lederqualitäten"} · Auswahl ist sofort am
                Objekt zu sehen
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {(["fabric", "leather"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    kind === k
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {k === "fabric" ? "Stoff" : "Leder"}
                </button>
              ))}
            </div>

            {kind === "fabric" && (
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kollektion oder Farbe suchen …"
                aria-label="Material suchen"
                className="ml-auto w-full min-w-0 rounded-full border border-stone-200 px-4 py-1.5 text-xs text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400 sm:w-64"
              />
            )}
          </div>

          {kind === "fabric" && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Chip active={material === "all"} onClick={() => setMaterial("all")}>
                Alle Materialien
              </Chip>
              {materials.map((m) => (
                <Chip key={m} active={material === m} onClick={() => setMaterial(m)}>
                  {MATERIAL_LABEL[m] ?? m}
                </Chip>
              ))}
              <span className="mx-1 w-px self-stretch bg-stone-200" aria-hidden />
              {(
                [
                  ["all", "Jeder Preis"],
                  ["low", "€"],
                  ["mid", "€€"],
                  ["high", "€€€"],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} active={band === id} onClick={() => setBand(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {/* Body --------------------------------------------------------- */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {kind === "leather" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {LEATHER_GRADES.map((g) => (
                <LeatherCard
                  key={g.id}
                  grade={g}
                  selected={selectedLeatherId === g.id}
                  onSelect={() => onSelectLeather(g.id)}
                />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-500">
              Nichts gefunden. Andere Suche oder Filter zurücksetzen.
            </p>
          ) : (
            <div className="space-y-7">
              {grouped.map(([label, fabrics]) => (
                <section key={label}>
                  <div className="mb-2.5 flex items-baseline justify-between gap-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                      {label}
                    </h3>
                    <span className="text-[11px] text-stone-400">
                      {MATERIAL_LABEL[fabrics[0].material] ?? fabrics[0].material}
                      {fabrics[0].description ? ` · ${fabrics[0].description}` : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
                    {fabrics.map((f) => (
                      <FabricCard
                        key={f.id}
                        fabric={f}
                        selected={selectedFabricId === f.id}
                        onSelect={() => onSelectFabric(f.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-stone-200 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}

function FabricCard({
  fabric,
  selected,
  onSelect,
}: {
  fabric: FabricSwatch;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group cursor-pointer text-left"
    >
      <Swatch
        hex={fabric.hex}
        material={fabric.material}
        textureUrl={fabric.textureUrl}
        className={`aspect-square w-full rounded-xl ring-1 transition ${
          selected
            ? "ring-2 ring-orange-500 ring-offset-2"
            : "ring-black/10 group-hover:ring-stone-400"
        }`}
      />
      <span className="mt-1.5 block truncate text-[11px] font-medium text-stone-800">
        {fabric.colorName}
      </span>
    </button>
  );
}

function LeatherCard({
  grade,
  selected,
  onSelect,
}: {
  grade: LeatherGrade;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`cursor-pointer rounded-xl border p-3 text-left transition ${
        selected ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:border-stone-400"
      }`}
    >
      <Swatch
        hex={grade.hex}
        material="leather"
        className="aspect-[3/2] w-full rounded-lg ring-1 ring-black/10"
      />
      <span className="mt-2 block text-xs font-medium text-stone-900">{grade.label}</span>
      <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">{grade.hint}</span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition ${
        active ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

const MATERIAL_LABEL: Record<string, string> = {
  velvet: "Samt",
  wool: "Wolle",
  linen: "Leinen",
  cotton: "Baumwolle",
  blend: "Mischgewebe",
  synthetic: "Synthetik",
  "silk-blend": "Seidenmisch",
  leather: "Leder",
};
