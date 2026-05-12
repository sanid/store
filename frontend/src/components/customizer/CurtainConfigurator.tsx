"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type * as THREE from "three";
import {
  defaultCurtainConfig,
  getFabric,
  priceCurtain,
  HEADER_PRICE,
  LINING_PRICE,
  ACCESSORY_PRICE,
  type CurtainConfig,
  type CurtainSide,
  type CurtainHeader,
  type FabricReserve,
  type CurtainLining,
  type CurtainAccessory,
} from "@/lib/curtains";
import FabricPicker from "./FabricPicker";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

const CurtainScene = dynamic(() => import("./CurtainScene"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-gradient-to-br from-stone-100 to-stone-200" />
  ),
});

const DRAFT_KEY = "uf:curtain-draft";

const SIDES: { id: CurtainSide; label: string; glyph: string }[] = [
  { id: "left", label: "links", glyph: "▎" },
  { id: "right", label: "rechts", glyph: "▕" },
  { id: "both", label: "beidseitig", glyph: "▎ ▕" },
];

const HEADERS: { id: CurtainHeader; label: string; surcharge: number; preview: string }[] = [
  { id: "wave", label: "Wellenband", surcharge: HEADER_PRICE.wave, preview: "〜〜〜" },
  { id: "flemish", label: "Flämische Falte", surcharge: HEADER_PRICE.flemish, preview: "⏝⏝⏝" },
  { id: "triple-pinch", label: "3er Falte", surcharge: HEADER_PRICE["triple-pinch"], preview: "ⵜⵜⵜ" },
];

const RESERVES: { id: FabricReserve; label: string }[] = [
  { id: "none", label: "Keine Falten" },
  { id: "low", label: "Geringe Falten" },
  { id: "normal", label: "Normale Falten" },
  { id: "high", label: "Viele Falten" },
];

const LININGS: { id: CurtainLining; label: string; surcharge: number; icon: string }[] = [
  { id: "none", label: "kein", surcharge: 0, icon: "○" },
  { id: "thermo", label: "Thermo", surcharge: LINING_PRICE.thermo, icon: "🌡" },
  { id: "acoustic", label: "Akustikstoff", surcharge: LINING_PRICE.acoustic, icon: "🔇" },
  { id: "dimout", label: "Dimout", surcharge: LINING_PRICE.dimout, icon: "☀" },
  { id: "blackout", label: "Blackout", surcharge: LINING_PRICE.blackout, icon: "◐" },
];

const ACCESSORIES: { id: CurtainAccessory; label: string; surcharge: number }[] = [
  { id: "none", label: "Keine", surcharge: 0 },
  { id: "glider-4mm", label: "Clic-Gleiter 4 mm", surcharge: ACCESSORY_PRICE["glider-4mm"] },
  { id: "glider-6mm", label: "Clic-Gleiter 6 mm", surcharge: ACCESSORY_PRICE["glider-6mm"] },
];

export default function CurtainConfigurator({ initialFabricId }: { initialFabricId?: string } = {}) {
  const { addItem, setCartOpen } = useCart();
  const [config, setConfig] = useState<CurtainConfig>(defaultCurtainConfig);
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    let next: CurtainConfig | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CurtainConfig;
        if (parsed && parsed.fabricId && getFabric(parsed.fabricId)) next = parsed;
      }
    } catch {}
    if (initialFabricId && getFabric(initialFabricId)) {
      next = { ...(next ?? defaultCurtainConfig()), fabricId: initialFabricId };
    }
    if (next) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(next);
    }
    setHydrated(true);
  }, [initialFabricId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
    } catch {}
  }, [config, hydrated]);

  const fabric = useMemo(() => getFabric(config.fabricId), [config.fabricId]);

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

  const update = useCallback(<K extends keyof CurtainConfig>(key: K, value: CurtainConfig[K]) => {
    setConfig((p) => ({ ...p, [key]: value }));
  }, []);

  const unitPrice = useMemo(() => priceCurtain(config), [config]);
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    if (!fabric) return;
    const preview = capturePreview();
    addItem({
      productId: "curtain",
      documentId: "curtain-custom",
      name: config.name || `Vorhang ${fabric.collection} ${fabric.colorName}`,
      basePrice: unitPrice,
      totalPrice,
      quantity,
      image: preview,
      customization: {
        fabric: fabric.hex,
        fabricLabel: `${fabric.collection} ${fabric.colorName} — ${fabric.brand}`,
        fabricId: config.fabricId,
        name: config.name,
        side: config.side,
        width: config.width,
        height: config.height,
        header: config.header,
        reserve: config.reserve,
        lining: config.lining,
        accessory: config.accessory,
        remark: config.remark,
      } as Record<string, unknown>,
      customizationPriceAdjustment: 0,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    setCartOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] min-h-[calc(100vh-57px)] bg-white">
      <div className="relative bg-gradient-to-br from-stone-50 to-stone-100">
        <div className="sticky top-[57px] h-[55vh] lg:h-[calc(100vh-57px)]">
          <CurtainScene config={config} fabric={fabric} onReady={handleReady} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs text-stone-500 shadow-sm backdrop-blur">
            Ziehen zum Drehen · Scrollen zum Zoomen
          </div>
        </div>
      </div>

      <aside className="flex flex-col border-l border-stone-200 lg:max-h-[calc(100vh-57px)]">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-2 flex items-center gap-2 text-xs text-stone-500">
            <span>Home</span>
            <span>›</span>
            <span className="text-stone-900">Vorhang Konfigurator</span>
          </div>

          {/* Step 1 — Maße & Seite */}
          <NumberedStep n={1} title="Masse & Seite">
            <Label>Name</Label>
            <input
              value={config.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="z.B. Wohnzimmer"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
            />

            <Label className="mt-4">Seite</Label>
            <div className="grid grid-cols-3 gap-2">
              {SIDES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => update("side", s.id)}
                  className={`relative cursor-pointer rounded-xl border px-3 py-3 text-xs font-medium transition ${
                    config.side === s.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <span className="absolute left-2 top-2 text-[10px] opacity-60">?</span>
                  <div className="text-base leading-none mb-1.5 mt-1">{s.glyph}</div>
                  {s.label}
                  {config.side === s.id && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 text-[10px] text-white">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-stone-200 p-4">
              <DimensionInput
                label="Breite"
                value={config.width}
                min={40}
                max={600}
                onCommit={(v) => update("width", v)}
              />
              <DimensionInput
                label="Höhe"
                value={config.height}
                min={40}
                max={400}
                onCommit={(v) => update("height", v)}
              />
            </div>
          </NumberedStep>

          {/* Step 2 — Konfektion */}
          <NumberedStep n={2} title="Konfektion">
            <Label>Faltenband</Label>
            <div className="grid grid-cols-3 gap-2">
              {HEADERS.map((h) => (
                <CardOption
                  key={h.id}
                  active={config.header === h.id}
                  onClick={() => update("header", h.id)}
                  label={h.label}
                  surcharge={h.surcharge}
                  preview={h.preview}
                />
              ))}
            </div>

            {/* Fabric summary card */}
            {fabric && (
              <div className="mt-4 rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-stone-500">
                  <span className="flex items-center gap-1">
                    Stoff
                    <button
                      onClick={() => setPickerOpen(true)}
                      className="cursor-pointer text-stone-400 hover:text-stone-700"
                      aria-label="Stoff ändern"
                    >
                      ✎
                    </button>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="h-9 w-9 cursor-pointer rounded-full ring-1 ring-stone-200"
                    style={{ backgroundColor: fabric.hex }}
                    aria-label="Stoff wechseln"
                  />
                  <div className="flex-1 text-sm text-stone-800">
                    {fabric.collection} <span className="font-semibold">{fabric.colorName}</span>{" "}
                    <span className="text-stone-500">— {fabric.brand}</span>
                  </div>
                </div>
              </div>
            )}

            <Label className="mt-4">Stoffzugabe</Label>
            <div className="grid grid-cols-4 gap-2">
              {RESERVES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => update("reserve", r.id)}
                  className={`cursor-pointer rounded-xl border px-2 py-2.5 text-[11px] font-medium transition ${
                    config.reserve === r.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <Label className="mt-4">Futterstoff</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {LININGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => update("lining", l.id)}
                  className={`relative cursor-pointer rounded-xl border px-1 py-2.5 text-[10px] font-medium transition ${
                    config.lining === l.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <div className="text-sm leading-none mb-1">{l.icon}</div>
                  {l.label}
                  {l.surcharge > 0 && (
                    <div className={`text-[9px] ${config.lining === l.id ? "text-stone-400" : "text-stone-500"}`}>
                      +{formatPrice(l.surcharge)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </NumberedStep>

          {/* Step 3 — Zubehör */}
          <NumberedStep n={3} title="Zubehör">
            <Label>Zubehör</Label>
            <div className="grid grid-cols-3 gap-2">
              {ACCESSORIES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => update("accessory", a.id)}
                  className={`cursor-pointer rounded-xl border px-2 py-2.5 text-[11px] font-medium transition ${
                    config.accessory === a.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </NumberedStep>

          {/* Step 4 — Bestellung */}
          <NumberedStep n={4} title="Bestellung">
            <Label>Bemerkung</Label>
            <textarea
              value={config.remark}
              onChange={(e) => update("remark", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              placeholder="Anmerkungen zur Bestellung"
            />
          </NumberedStep>

          <p className="mt-4 text-center text-[11px] text-stone-400">
            Maßgefertigt · Versand in 10–14 Werktagen
          </p>
        </div>

        {fabric && (
          <div className="border-t border-stone-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPickerOpen(true)}
                className="h-8 w-8 shrink-0 cursor-pointer rounded-full ring-1 ring-stone-200"
                style={{ backgroundColor: fabric.hex }}
                aria-label="Stoff wechseln"
              />
              <div className="flex-1 min-w-0 truncate text-sm text-stone-800">
                {fabric.collection} <span className="font-semibold">{fabric.colorName}</span>
              </div>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="w-14 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm"
              />
              <div className="min-w-[90px] text-right text-base font-bold text-stone-900">
                {formatPrice(totalPrice)}
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="mt-3 w-full cursor-pointer rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              {added ? "Hinzugefügt!" : "in den Warenkorb"}
            </button>
          </div>
        )}
      </aside>

      <FabricPicker
        open={pickerOpen}
        selectedId={config.fabricId}
        onClose={() => setPickerOpen(false)}
        onSelect={(f) => {
          update("fabricId", f.id);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function NumberedStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white">
          {n}
        </span>
        <h3 className="text-base font-bold text-stone-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 ${className}`}>
      {children}
    </div>
  );
}

function CardOption({
  active,
  onClick,
  label,
  surcharge,
  preview,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  surcharge: number;
  preview: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${
        active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
      }`}
    >
      <span className="absolute left-2 top-2 text-[10px] opacity-50">?</span>
      <div className="mt-2 text-xl tracking-widest leading-none">{preview}</div>
      <div className="mt-2 text-xs font-semibold">{label}</div>
      {surcharge > 0 && (
        <div className={`text-[10px] ${active ? "text-stone-400" : "text-stone-500"}`}>+{formatPrice(surcharge)}</div>
      )}
      {active && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 text-[10px] text-white">✓</span>
      )}
    </button>
  );
}

function DimensionInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setRaw(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.round(n)));
    setRaw(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-sm focus:border-stone-900 focus:outline-none"
        />
        <span className="text-xs text-stone-500">cm</span>
      </div>
    </div>
  );
}
