"use client";

import { useMemo, useState } from "react";
import { FABRICS, type FabricSwatch } from "@/lib/curtains";

interface Props {
  open: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (fabric: FabricSwatch) => void;
}

const BRANDS = Array.from(new Set(FABRICS.map((f) => f.brand)));
const MATERIALS: { id: FabricSwatch["material"]; label: string }[] = [
  { id: "cotton", label: "Baumwolle" },
  { id: "linen", label: "Leinen" },
  { id: "velvet", label: "Samt" },
  { id: "wool", label: "Wolle" },
  { id: "silk-blend", label: "Seide-Mix" },
  { id: "synthetic", label: "Synthetik" },
  { id: "blend", label: "Mischgewebe" },
];
const PATTERNS: { id: FabricSwatch["pattern"]; label: string }[] = [
  { id: "plain", label: "Uni" },
  { id: "stripe", label: "Streifen" },
  { id: "floral", label: "Floral" },
  { id: "geometric", label: "Geometrisch" },
  { id: "textured", label: "Strukturiert" },
  { id: "photo", label: "Motiv" },
];
const TRANSP: { id: FabricSwatch["transparency"]; label: string }[] = [
  { id: "opaque", label: "Blickdicht" },
  { id: "semi-opaque", label: "Halbdicht" },
  { id: "translucent", label: "Lichtdurchlässig" },
  { id: "sheer", label: "Transparent" },
];

export default function FabricPicker({ open, selectedId, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [material, setMaterial] = useState<FabricSwatch["material"] | null>(null);
  const [pattern, setPattern] = useState<FabricSwatch["pattern"] | null>(null);
  const [transparency, setTransparency] = useState<FabricSwatch["transparency"] | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FABRICS.filter((f) => {
      if (brand && f.brand !== brand) return false;
      if (material && f.material !== material) return false;
      if (pattern && f.pattern !== pattern) return false;
      if (transparency && f.transparency !== transparency) return false;
      if (
        q &&
        !`${f.brand} ${f.collection} ${f.colorName}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [search, brand, material, pattern, transparency]);

  // Group by collection for headline cards (like screenshot)
  const grouped = useMemo(() => {
    const map = new Map<string, FabricSwatch[]>();
    for (const f of filtered) {
      const key = `${f.brand}|${f.collection}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 p-4">
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
            {filtered.length}
          </span>
          <Dropdown
            label="Marke"
            value={brand}
            onChange={setBrand}
            options={BRANDS.map((b) => ({ id: b, label: b }))}
          />
          <Dropdown
            label="Material"
            value={material}
            onChange={(v) => setMaterial(v as FabricSwatch["material"] | null)}
            options={MATERIALS.map((m) => ({ id: m.id, label: m.label }))}
          />
          <Dropdown
            label="Muster"
            value={pattern}
            onChange={(v) => setPattern(v as FabricSwatch["pattern"] | null)}
            options={PATTERNS.map((p) => ({ id: p.id, label: p.label }))}
          />
          <Dropdown
            label="Transparenz"
            value={transparency}
            onChange={(v) => setTransparency(v as FabricSwatch["transparency"] | null)}
            options={TRANSP.map((t) => ({ id: t.id, label: t.label }))}
          />
          <div className="ml-auto relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Stoff suchen..."
              className="w-64 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:border-stone-900 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">⌕</span>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {grouped.map(([key, items]) => (
              <CollectionCard key={key} items={items} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
          {grouped.length === 0 && (
            <div className="py-20 text-center text-stone-400">Keine Stoffe gefunden.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 p-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full border border-stone-200 px-5 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300"
          >
            Abbrechen
          </button>
          <div className="text-xs text-stone-400">
            * Preis pro laufendem Meter, exkl. Konfektion
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({
  items,
  selectedId,
  onSelect,
}: {
  items: FabricSwatch[];
  selectedId: string;
  onSelect: (fabric: FabricSwatch) => void;
}) {
  const selectedInGroup = items.find((i) => i.id === selectedId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const active = items.find((i) => i.id === (hoveredId ?? selectedInGroup?.id)) ?? items[0];
  const colors = items.slice(0, 8);
  const isSelected = !!selectedInGroup;

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected ? "border-stone-900 ring-2 ring-stone-900" : "border-stone-200"
      }`}
      onClick={() => onSelect(active)}
    >
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
        {items.length} Farbe{items.length !== 1 ? "n" : ""}
      </div>
      <div
        className="relative h-56 w-full transition-colors duration-200"
        style={{ background: active.hex }}
      >
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: noiseSvg() }} />
        <div className="absolute right-3 bottom-3 text-[10px] font-bold uppercase tracking-wider text-white/80 drop-shadow">
          {active.brand}
        </div>
      </div>
      <div className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {colors.map((c) => {
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                className={`h-4 w-4 rounded-full transition ${
                  isActive
                    ? "ring-2 ring-stone-900 ring-offset-1 scale-110"
                    : "ring-1 ring-stone-300 hover:ring-stone-400"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.colorName}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredId(null);
                  onSelect(c);
                }}
              />
            );
          })}
          {items.length > 8 && (
            <span className="text-[10px] text-stone-500">+{items.length - 8}</span>
          )}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-900">
          {active.brand}
        </div>
        <div className="mt-0.5 text-sm text-stone-700">
          {active.collection} <span className="font-semibold">{active.colorName}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-stone-400">{active.material}</span>
          <span className="font-semibold text-stone-900">
            {(active.pricePerMeter / 100).toFixed(2)} €/m*
          </span>
        </div>
      </div>
    </div>
  );
}

function Dropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          value ? "border-stone-900 bg-stone-50 text-stone-700" : "border-stone-200 text-stone-700 hover:border-stone-300"
        }`}
      >
        {value ? options.find((o) => o.id === value)?.label ?? label : label}
        <span className="text-stone-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-stone-500 hover:bg-stone-50"
            >
              Alle
            </button>
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs transition ${
                  value === o.id ? "bg-stone-50 text-stone-700" : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function noiseSvg(): string {
  // Simple SVG noise pattern as data URL
  const svg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.6'/></svg>`
    );
  return `url("${svg}")`;
}
