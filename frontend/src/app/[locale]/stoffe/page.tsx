"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import {
  FABRICS,
  type FabricSwatch,
  type FabricMaterial,
  type FabricPattern,
  type FabricTransparency,
} from "@/lib/curtains";
import { formatPrice } from "@/lib/utils";

const MATERIALS: { id: FabricMaterial; label: string }[] = [
  { id: "cotton", label: "Baumwolle" },
  { id: "linen", label: "Leinen" },
  { id: "velvet", label: "Samt" },
  { id: "wool", label: "Wolle" },
  { id: "silk-blend", label: "Seide-Mix" },
  { id: "synthetic", label: "Synthetik" },
  { id: "blend", label: "Mischgewebe" },
];

const PATTERNS: { id: FabricPattern | "all"; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "plain", label: "Uni" },
  { id: "stripe", label: "Streifen" },
  { id: "floral", label: "Floral" },
  { id: "geometric", label: "Geometrisch" },
  { id: "textured", label: "Strukturiert" },
  { id: "photo", label: "Motiv" },
];

const TRANSPARENCIES: { id: FabricTransparency | "all"; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "opaque", label: "Blickdicht" },
  { id: "semi-opaque", label: "Halbdicht" },
  { id: "translucent", label: "Lichtdurchlässig" },
  { id: "sheer", label: "Transparent" },
];

type GroupKey = string;

function groupFabrics(fabrics: FabricSwatch[]): [GroupKey, FabricSwatch[]][] {
  const map = new Map<GroupKey, FabricSwatch[]>();
  for (const f of fabrics) {
    const key = `${f.brand}|${f.collection}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }
  return Array.from(map.entries());
}

export default function StoffePage() {
  const [material, setMaterial] = useState<FabricMaterial | null>(null);
  const [pattern, setPattern] = useState<FabricPattern | "all">("all");
  const [transparency, setTransparency] = useState<FabricTransparency | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FABRICS.filter((f) => {
      if (material && f.material !== material) return false;
      if (pattern !== "all" && f.pattern !== pattern) return false;
      if (transparency !== "all" && f.transparency !== transparency) return false;
      if (q && !`${f.brand} ${f.collection} ${f.colorName}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [material, pattern, transparency, search]);

  const grouped = useMemo(() => groupFabrics(filtered), [filtered]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-2 flex items-center gap-2 text-xs text-stone-500">
        <Link href="/" className="transition hover:text-stone-900">
          Home
        </Link>
        <span>›</span>
        <span className="text-stone-900">Stoffe</span>
      </div>

      <h1 className="font-serif text-4xl font-light tracking-tight text-stone-900">
        Unsere Stoffe
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-600">
        Entdecken Sie unsere Kollektion — von feiner Baumwolle über schweren Samt
        bis zu transparentem Voile. Alle Stoffe direkt im 3D-Konfigurator
        ansehen und bestellen.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <FilterPill
          label="Material"
          value={material}
          onChange={setMaterial}
          options={MATERIALS.map((m) => ({ id: m.id, label: m.label }))}
        />
        <FilterPill
          label="Muster"
          value={pattern === "all" ? null : pattern}
          onChange={(v) => setPattern((v as FabricPattern) ?? "all")}
          options={PATTERNS.filter((p) => p.id !== "all").map((p) => ({
            id: p.id,
            label: p.label,
          }))}
        />
        <FilterPill
          label="Transparenz"
          value={transparency === "all" ? null : transparency}
          onChange={(v) => setTransparency((v as FabricTransparency) ?? "all")}
          options={TRANSPARENCIES.filter((t) => t.id !== "all").map((t) => ({
            id: t.id,
            label: t.label,
          }))}
        />
        <div className="ml-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Stoff suchen..."
            className="w-56 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-2 text-xs text-stone-500">
        {filtered.length} Stoff{filtered.length !== 1 ? "e" : ""} in{" "}
        {grouped.length} Kollektion{grouped.length !== 1 ? "en" : ""}
      </div>

      {grouped.length === 0 ? (
        <div className="py-20 text-center text-stone-400">
          Keine Stoffe gefunden.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {grouped.map(([key, items]) => (
            <CollectionCard key={key} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({ items }: { items: FabricSwatch[] }) {
  const head = items[0];
  const colors = items.slice(0, 8);
  const materialLabel: Record<FabricMaterial, string> = {
    cotton: "Baumwolle",
    linen: "Leinen",
    velvet: "Samt",
    wool: "Wolle",
    "silk-blend": "Seide-Mix",
    synthetic: "Synthetik",
    blend: "Mischgewebe",
  };

  return (
    <Link
      href={{
        pathname: "/curtain-configurator",
        query: { fabric: head.id },
      }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:shadow-lg"
    >
      <div
        className="relative h-48 w-full transition-colors duration-200"
        style={{ backgroundColor: head.hex }}
      >
        {head.pattern === "photo" && (
          <img
            src="/pattern.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-multiply"
          />
        )}
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: noiseUrl() }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: foldShading() }} />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-stone-700 shadow-sm">
          {items.length} Farbe{items.length !== 1 ? "n" : ""}
        </span>
        <span className="absolute right-3 bottom-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/85 drop-shadow">
          {head.brand}
        </span>
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/0 opacity-0 transition group-hover:bg-stone-900/30 group-hover:opacity-100">
          <span className="bg-stone-900 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
            Konfigurieren
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {colors.map((c) => (
            <span
              key={c.id}
              className="h-3 w-3 rounded-full ring-1 ring-stone-200"
              style={{ backgroundColor: c.hex }}
              title={c.colorName}
            />
          ))}
          {items.length > colors.length && (
            <span className="text-[10px] text-stone-500">
              +{items.length - colors.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone-500">
          <span>{materialLabel[head.material]}</span>
          <span className="text-stone-300">·</span>
          <span>{head.webWidthCm} cm Breite</span>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-900">
            {head.brand}
          </div>
          <div className="mt-0.5 text-sm text-stone-700">{head.collection}</div>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs pt-2 border-t border-stone-100">
          <span className="text-emerald-700">sofort verfügbar</span>
          <span className="font-semibold text-stone-900">
            ab {(head.pricePerMeter / 100).toFixed(2)} €/m
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterPill<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | null;
  onChange: (v: T | null) => void;
  options: { id: T; label: string }[];
}) {
  const active = options.find((o) => o.id === value);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        {label}:
      </span>
      <button
        onClick={() => onChange(null)}
        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
          !value
            ? "border-stone-900 bg-stone-900 text-white"
            : "border-stone-200 text-stone-600 hover:border-stone-300"
        }`}
      >
        Alle
      </button>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(value === o.id ? null : o.id)}
          className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
            value === o.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-200 text-stone-600 hover:border-stone-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function noiseUrl(): string {
  const svg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.5'/></svg>`
    );
  return `url("${svg}")`;
}

function foldShading(): string {
  return "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 14px, rgba(0,0,0,0.10) 18px, rgba(0,0,0,0) 24px, rgba(255,255,255,0.06) 32px, rgba(255,255,255,0) 38px)";
}
