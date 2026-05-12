"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type * as THREE from "three";
import type { FurnitureConfig, FurnitureStyle, CellInsert, Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

const FurnitureScene = dynamic(() => import("./FurnitureScene"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-gradient-to-br from-stone-100 to-stone-200" />
  ),
});

interface Props {
  product?: Product;
  initialName?: string;
  basePrice?: number;
}

const COLORS: { id: string; name: string; hex: string; tag?: string }[] = [
  { id: "white", name: "Weiß", hex: "#f5f4ef" },
  { id: "graphite", name: "Graphit", hex: "#1f1f1f" },
  { id: "rosewood", name: "Rosenholz", hex: "#9d4d3c" },
  { id: "stone", name: "Stein", hex: "#a8a39a" },
  { id: "mustard", name: "Senf", hex: "#c98c2a" },
  { id: "navy", name: "Navy", hex: "#26416a" },
  { id: "forest", name: "Forst", hex: "#3a4f3a", tag: "neu" },
  { id: "blush", name: "Rosé", hex: "#d9b9a8" },
  { id: "sand", name: "Sand", hex: "#d8c8a6" },
];

const STYLES: { id: FurnitureStyle; label: string; icon: string }[] = [
  { id: "frame", label: "Frame", icon: "▭" },
  { id: "grid", label: "Grid", icon: "▦" },
  { id: "gradient", label: "Gradient", icon: "▤" },
  { id: "mosaic", label: "Mosaic", icon: "▥" },
  { id: "pattern", label: "Pattern", icon: "▧" },
  { id: "pixel", label: "Pixel", icon: "▩" },
];

const WIDTH_STOPS = [45, 90, 135, 180, 225, 270, 315, 360];
const HEIGHT_STOPS = [42, 63, 84, 105, 126, 147, 168, 189, 210];
const DEPTHS = [24, 32, 40, 50] as const;

function snap(value: number, stops: number[]): number {
  return stops.reduce((best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best), stops[0]);
}

function pricePieces(c: FurnitureConfig): number {
  const cubicCm = c.width * c.height * c.depth;
  const base = 39900;
  const cells = c.cells.length;
  const doorCount = c.cells.filter((x) => x === "door").length;
  const drawerCount = c.cells.filter((x) => x === "drawer").length;
  const backsCost = c.backs ? cells * 1500 : 0;
  const finishMul = c.finish === "veneer" ? 1.35 : c.finish === "plywood" ? 1.1 : 1;
  const baseAdd = c.base === "plinth" ? 4900 : 2900;
  const densityAdd = c.style === "pixel" ? Math.round(cells * c.density * 60) : 0;
  return Math.round(
    (base + (cubicCm * 0.18) / 4 + cells * 1800 + doorCount * 2200 + drawerCount * 3100 + backsCost + baseAdd + densityAdd) *
      finishMul
  );
}

function buildCells(rows: number, cols: number, prev?: CellInsert[]): CellInsert[] {
  const total = rows * cols;
  const out: CellInsert[] = [];
  for (let i = 0; i < total; i++) out.push(prev?.[i] ?? "open");
  return out;
}

function applyStylePreset(style: FurnitureStyle, width: number, height: number): { columns: number; rows: number; cells: CellInsert[] } {
  const cols = Math.max(2, Math.min(8, Math.round(width / 45)));
  const rows = Math.max(1, Math.min(5, Math.round(height / 42)));
  const total = rows * cols;
  const cells: CellInsert[] = Array(total).fill("open");
  if (style === "frame") {
    for (let i = 0; i < total; i++) cells[i] = i % 3 === 0 ? "door" : "open";
  } else if (style === "grid") {
    for (let i = 0; i < total; i++) cells[i] = i % 2 === 0 ? "door" : "open";
  } else if (style === "gradient") {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells[r * cols + c] = c < cols / 2 ? "door" : "open";
      }
    }
  } else if (style === "mosaic") {
    for (let i = 0; i < total; i++) cells[i] = i % 4 === 0 || i % 4 === 3 ? "door" : "open";
  } else if (style === "pattern") {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells[r * cols + c] = (r + c) % 2 === 0 ? "drawer" : "open";
      }
    }
  } else if (style === "pixel") {
    for (let i = 0; i < total; i++) cells[i] = "open";
  }
  return { columns: cols, rows, cells };
}

function defaultConfig(): FurnitureConfig {
  const cols = 4;
  const rows = 2;
  return {
    style: "frame",
    width: 180,
    height: 84,
    depth: 40,
    columns: cols,
    rows,
    density: 30,
    base: "legs",
    backs: false,
    finish: "plywood",
    color: "#1f1f1f",
    cells: Array(cols * rows)
      .fill("open")
      .map((_, i) => (i < 3 ? "door" : "open")) as CellInsert[],
  };
}

const DRAFT_KEY = "store:furniture-draft";

export default function FurnitureConfigurator({ product, initialName, basePrice }: Props) {
  const { addItem, setCartOpen } = useCart();
  const [config, setConfig] = useState<FurnitureConfig>(defaultConfig);
  const [added, setAdded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  // Hydrate draft once on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as FurnitureConfig;
        if (parsed && Array.isArray(parsed.cells)) setConfig(parsed);
      }
    } catch {}
  }, []);

  // Width warning toast
  useEffect(() => {
    if (config.width > 240) {
      setToast("Bei einer Breite von mehr als 240 cm ist auf der Oberseite die Verbindungsstelle der zwei Regalteile sichtbar.");
    } else {
      setToast(null);
    }
  }, [config.width]);

  const handleReady = useCallback((gl: THREE.WebGLRenderer) => {
    glRef.current = gl;
  }, []);

  const capturePreview = useCallback((): string => {
    const gl = glRef.current;
    if (!gl) return "";
    try {
      const src = gl.domElement;
      const maxW = 720;
      const ratio = src.width > 0 ? src.height / src.width : 0.6;
      const w = Math.min(maxW, src.width);
      const h = Math.round(w * ratio);
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const ctx = off.getContext("2d");
      if (!ctx) return src.toDataURL("image/png");
      ctx.drawImage(src, 0, 0, w, h);
      return off.toDataURL("image/jpeg", 0.85);
    } catch {
      return "";
    }
  }, []);

  const update = useCallback(<K extends keyof FurnitureConfig>(key: K, value: FurnitureConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "rows" || key === "columns") {
        next.cells = buildCells(next.rows, next.columns, prev.cells);
      }
      if (key === "style") {
        const preset = applyStylePreset(value as FurnitureStyle, prev.width, prev.height);
        next.columns = preset.columns;
        next.rows = preset.rows;
        next.cells = preset.cells;
      }
      if (key === "width" || key === "height") {
        const cols = Math.max(2, Math.min(8, Math.round(next.width / 45)));
        const rows = Math.max(1, Math.min(5, Math.round(next.height / 42)));
        next.columns = cols;
        next.rows = rows;
        next.cells = buildCells(rows, cols, prev.cells);
      }
      return next;
    });
  }, []);

  const setCell = useCallback((idx: number, value: CellInsert) => {
    setConfig((prev) => {
      const cells = [...prev.cells];
      cells[idx] = value;
      return { ...prev, cells };
    });
  }, []);

  const totalPrice = useMemo(() => {
    if (basePrice) return basePrice + (pricePieces(config) - pricePieces(defaultConfig()));
    return pricePieces(config);
  }, [config, basePrice]);

  const totalCells = config.rows * config.columns;
  const sectionsCount = config.cells.filter((c) => c !== "open").length;
  const doorCount = config.cells.filter((c) => c === "door").length;
  const drawerCount = config.cells.filter((c) => c === "drawer").length;

  const adjustSections = useCallback(
    (delta: number) => {
      setConfig((prev) => {
        const cells = [...prev.cells];
        if (delta > 0) {
          const idx = cells.findIndex((c) => c === "open");
          if (idx >= 0) cells[idx] = "door";
        } else {
          const idx = [...cells].reverse().findIndex((c) => c !== "open");
          if (idx >= 0) cells[cells.length - 1 - idx] = "open";
        }
        return { ...prev, cells };
      });
    },
    []
  );

  const handleAdd = () => {
    const preview = capturePreview();
    addItem({
      productId: String(product?.id ?? "configurator"),
      documentId: product?.documentId ?? "configurator-sideboard",
      name: product?.name ?? initialName ?? "Konfiguriertes Sideboard",
      basePrice: product?.price ?? totalPrice,
      totalPrice,
      quantity: 1,
      image: preview,
      customization: { ...config } as Record<string, unknown>,
      customizationPriceAdjustment: totalPrice - (product?.price ?? totalPrice),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    setCartOpen(true);
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] min-h-[calc(100vh-57px)]">
      <div className="relative bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100">
        <div className="sticky top-[57px] h-[55vh] lg:h-[calc(100vh-57px)]">
          <FurnitureScene config={config} onReady={handleReady} />

          {/* Toolbar (left edge) */}
          <div className="pointer-events-auto absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
            <ToolbarButton title="Türen & Schubladen" icon="⌧" />
            <ToolbarButton title="Maße" icon="⊞" />
            <ToolbarButton title="Farbe" icon="◑" />
            <ToolbarButton title="Ansicht" icon="⛶" />
            <ToolbarButton title="Teilen" icon="↑" />
          </div>

          {/* Width toast */}
          {toast && (
            <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2">
              <div className="flex items-start gap-3 rounded-2xl bg-white/95 px-5 py-3 text-xs text-stone-700 shadow-lg backdrop-blur max-w-md">
                <span className="leading-snug">{toast}</span>
                <button
                  onClick={() => setToast(null)}
                  className="-mt-0.5 text-stone-400 hover:text-stone-700"
                  aria-label="Schließen"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Per-cell pencil overlay (anchored to a virtual unit footprint) */}
          <CellOverlay
            config={config}
            editingCell={editingCell}
            onOpen={(idx) => setEditingCell(idx)}
            onClose={() => setEditingCell(null)}
            onPick={(idx, v) => {
              setCell(idx, v);
              setEditingCell(null);
            }}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs text-stone-500 shadow-sm backdrop-blur">
            Ziehen zum Drehen · Stiftsymbol bearbeiten
          </div>
        </div>
      </div>

      <aside className="border-l border-stone-200 bg-white">
        <div className="px-6 py-6 lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)] lg:overflow-y-auto">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
              Sideboard nach Maß
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-900">
              {product?.name ?? initialName ?? "Sideboard mit Türen und Schubladen"}
            </h2>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-orange-600">{formatPrice(totalPrice)}</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              Maßgefertigt · Versand in 2–3 Wochen
            </p>
          </div>

          <Section label="Stil">
            <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => update("style", s.id)}
                  className={`flex min-w-[64px] cursor-pointer flex-col items-center gap-1 rounded-xl border px-3 py-2 transition ${
                    config.style === s.id
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-stone-200 text-stone-500 hover:border-stone-300"
                  }`}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-[10px] font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section label="Breite">
            <StepSlider
              value={config.width}
              stops={WIDTH_STOPS}
              unit="cm"
              onChange={(v) => update("width", v)}
            />
          </Section>

          <Section label="Höhe">
            <StepSlider
              value={config.height}
              stops={HEIGHT_STOPS}
              unit="cm"
              onChange={(v) => update("height", v)}
            />
          </Section>

          <Section label="Tiefe">
            <div className="flex gap-1.5">
              {DEPTHS.map((d) => (
                <button
                  key={d}
                  onClick={() => update("depth", d)}
                  className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    config.depth === d
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {d}cm
                </button>
              ))}
            </div>
          </Section>

          <Section label="Abschnitte">
            <div className="flex items-center gap-3">
              <Counter
                value={sectionsCount}
                min={0}
                max={totalCells}
                onChange={(v) => adjustSections(v - sectionsCount)}
              />
              <span className="text-[10px] text-stone-400">{totalCells} Fächer · {doorCount} Türen · {drawerCount} Schubladen</span>
            </div>
          </Section>

          {config.style === "pixel" && (
            <Section label="Dichte" suffixTag="neu">
              <div className="flex items-center gap-3">
                <RangeSlider
                  value={config.density}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) => update("density", v)}
                />
                <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-stone-700">
                  {config.density}%
                </span>
              </div>
            </Section>
          )}

          <Section label="Basis">
            <ChipRow
              options={[
                { id: "legs", label: "Füße" },
                { id: "plinth", label: "Sockel" },
              ]}
              value={config.base}
              onChange={(v) => update("base", v as FurnitureConfig["base"])}
            />
          </Section>

          <Section label="Rückwände">
            <ChipRow
              options={[
                { id: "off", label: "Aus" },
                { id: "on", label: "Mit" },
              ]}
              value={config.backs ? "on" : "off"}
              onChange={(v) => update("backs", v === "on")}
            />
          </Section>

          <Section label="Finish">
            <ChipRow
              options={[
                { id: "color", label: "Farbe" },
                { id: "plywood", label: "Multiplexplatte" },
                { id: "veneer", label: "Furnier" },
              ]}
              value={config.finish}
              onChange={(v) => update("finish", v as FurnitureConfig["finish"])}
            />
          </Section>

          <Section label="Farbe">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => update("color", c.hex)}
                  title={c.name}
                  aria-label={c.name}
                  className={`relative h-8 w-8 cursor-pointer rounded-full border transition ${
                    config.color === c.hex
                      ? "ring-2 ring-orange-500 ring-offset-2"
                      : "border-stone-300 hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {c.tag && (
                    <span className="absolute -right-2 -top-1 rounded bg-orange-500 px-1 text-[8px] font-semibold text-white">
                      {c.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-stone-400">
              Unentschlossen?{" "}
              <button className="underline hover:text-stone-700">Muster bestellen</button>
            </p>
          </Section>

          <button
            onClick={handleAdd}
            className="group mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            {added ? "Hinzugefügt!" : "In den Warenkorb"}
          </button>

          <button
            onClick={handleSaveDraft}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            {savedFlash ? "Gespeichert!" : "Entwurf speichern"}
          </button>

          <p className="mt-3 text-center text-[11px] text-stone-400">
            Versand in 2–3 Wochen · Maßgefertigt in der EU
          </p>
        </div>
      </aside>
    </div>
  );
}

function CellOverlay({
  config,
  editingCell,
  onOpen,
  onClose,
  onPick,
}: {
  config: FurnitureConfig;
  editingCell: number | null;
  onOpen: (idx: number) => void;
  onClose: () => void;
  onPick: (idx: number, v: CellInsert) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[14%] z-10 flex justify-center">
      <div
        className="pointer-events-auto grid"
        style={{
          gridTemplateColumns: `repeat(${config.columns}, minmax(0, 36px))`,
          gap: "2px",
          width: `min(60vw, ${config.columns * 56}px)`,
        }}
      >
        {Array.from({ length: config.columns }).map((_, col) => {
          const realIdx = (config.rows - 1) * config.columns + col;
          const value = config.cells[realIdx] ?? "open";
          const isEditing = editingCell === realIdx;
          return (
            <div key={col} className="relative flex justify-center">
              <button
                onClick={() => onOpen(realIdx)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition hover:scale-110 ${
                  value !== "open" ? "border-orange-400 text-orange-600" : "border-stone-200 text-stone-500"
                }`}
                aria-label={`Fach ${realIdx + 1} bearbeiten`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.79l-4 1 1-4 12.362-12.303Z" />
                </svg>
              </button>
              {isEditing && (
                <>
                  <button
                    onClick={onClose}
                    aria-label="Schließen"
                    className="fixed inset-0 z-20 cursor-default bg-transparent"
                  />
                  <div className="absolute bottom-10 z-30 flex flex-col gap-1 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-stone-200">
                    {(["open", "door", "drawer"] as CellInsert[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => onPick(realIdx, opt)}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          value === opt
                            ? "bg-stone-900 text-white"
                            : "text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {opt === "open" ? "Offen" : opt === "door" ? "Tür" : "Schublade"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolbarButton({ title, icon }: { title: string; icon: string }) {
  return (
    <button
      title={title}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-sm text-stone-600 shadow-sm ring-1 ring-stone-200 transition hover:text-stone-900"
    >
      {icon}
    </button>
  );
}

function Section({ label, children, suffixTag }: { label: string; children: React.ReactNode; suffixTag?: string }) {
  return (
    <div className="border-t border-stone-100 py-4 first:border-t-0">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          {label}
          {suffixTag && (
            <span className="ml-1.5 rounded bg-orange-500 px-1 text-[8px] font-semibold text-white">{suffixTag}</span>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === o.id
              ? "bg-orange-50 text-orange-700 ring-1 ring-orange-300"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Counter({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center rounded-full bg-stone-100">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="cursor-pointer px-3 py-1.5 text-stone-500 hover:text-stone-900"
        aria-label="Minus"
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-xs font-semibold tabular-nums text-stone-800">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="cursor-pointer px-3 py-1.5 text-stone-500 hover:text-stone-900"
        aria-label="Plus"
      >
        +
      </button>
    </div>
  );
}

function StepSlider({
  value,
  stops,
  unit,
  onChange,
}: {
  value: number;
  stops: number[];
  unit?: string;
  onChange: (v: number) => void;
}) {
  const min = stops[0];
  const max = stops[stops.length - 1];
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 h-7 flex items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-stone-200" />
        <div
          className="absolute left-0 h-1 rounded-full bg-orange-500"
          style={{ width: `${pct}%` }}
        />
        {stops.map((s) => {
          const p = ((s - min) / (max - min)) * 100;
          const passed = value >= s;
          return (
            <span
              key={s}
              className={`absolute h-2 w-2 -translate-x-1/2 rounded-full ${passed ? "bg-orange-500" : "bg-stone-300"}`}
              style={{ left: `${p}%` }}
            />
          );
        })}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(snap(Number(e.target.value), stops))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-600 shadow ring-1 ring-orange-300"
          style={{ left: `calc(${pct}% - 1.5rem)` }}
        >
          {value}
          {unit}
        </div>
      </div>
    </div>
  );
}

function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex-1 h-6 flex items-center">
      <div className="absolute inset-x-0 h-1 rounded-full bg-stone-200" />
      <div className="absolute left-0 h-1 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div
        className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white ring-2 ring-orange-500"
        style={{ left: `calc(${pct}% - 7px)` }}
      />
    </div>
  );
}
