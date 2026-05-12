"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { FABRICS, type FabricSwatch } from "@/lib/curtains";

const BESTSELLER_IDS = [
  "romo-linara-azure",
  "zr-colibri-saffron",
  "kd-sahara-dove",
  "vn-geneva-birch",
  "uf-velluto-ruby",
  "uf-linum-natural",
  "uf-orto-floral-sand",
  "uf-wool-heather",
  "kd-sahara-teal",
  "uf-velluto-cream",
  "romo-linara-clay",
  "zr-colibri-emerald",
  "uf-decor-sage",
  "uf-decor-terracotta",
];

const BESTSELLERS = BESTSELLER_IDS
  .map((id) => FABRICS.find((f) => f.id === id))
  .filter((f): f is FabricSwatch => Boolean(f));

export default function BestsellersCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const recompute = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const total = el.scrollWidth;
    const view = el.clientWidth;
    const pages = Math.max(1, Math.ceil(total / view));
    setPageCount(pages);
    const current = view > 0 ? Math.round(el.scrollLeft / view) : 0;
    setPage(Math.min(current, pages - 1));
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + view < total - 4);
  }, []);

  useEffect(() => {
    recompute();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      el.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const scrollToPage = (p: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: p * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="border-t border-stone-200">
      <div className="py-16 lg:py-20">
        <div className="mx-auto mb-8 max-w-7xl px-6 lg:px-10">
          <h2 className="font-serif text-3xl font-light tracking-tight text-stone-900">
            Unsere Bestseller &amp; Empfehlungen
          </h2>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-stone-500">
              Die beliebtesten Stoffe unserer Kunden
            </p>
            <Link
              href="/stoffe"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-500 transition hover:text-stone-900"
            >
              Alle Stoffe ansehen →
            </Link>
          </div>
        </div>

        <div className="relative">
          {/* Edge fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />

          {/* Prev arrow */}
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canPrev}
            aria-label="Zurück"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center bg-white text-stone-900 shadow-md ring-1 ring-stone-200 transition hover:bg-stone-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Next arrow */}
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canNext}
            aria-label="Weiter"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center bg-white text-stone-900 shadow-md ring-1 ring-stone-200 transition hover:bg-stone-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Scroller */}
          <div
            ref={scrollerRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-2 lg:gap-5 lg:px-10"
            style={{ scrollbarWidth: "none" }}
          >
            {BESTSELLERS.map((f) => (
              <FabricCard key={f.id} fabric={f} />
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        {pageCount > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToPage(i)}
                aria-label={`Seite ${i + 1}`}
                className={`h-2 w-2 rounded-full transition ${
                  i === page ? "w-6 bg-stone-900" : "bg-stone-300 hover:bg-stone-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FabricCard({ fabric }: { fabric: FabricSwatch }) {
  const palette = FABRICS
    .filter((x) => x.brand === fabric.brand && x.collection === fabric.collection)
    .slice(0, 6);
  const variants = FABRICS.filter(
    (x) => x.brand === fabric.brand && x.collection === fabric.collection,
  ).length;
  const transparencyLabel: Record<FabricSwatch["transparency"], string> = {
    opaque: "Blickdicht",
    "semi-opaque": "Halbdicht",
    translucent: "Lichtdurchlässig",
    sheer: "Transparent",
  };
  const materialLabel: Record<FabricSwatch["material"], string> = {
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
      href={{ pathname: "/curtain-configurator", query: { fabric: fabric.id } }}
      className="group relative flex w-[260px] shrink-0 snap-start flex-col overflow-hidden border border-stone-200 bg-white transition hover:shadow-lg"
    >
      <div className="relative h-72 w-full overflow-hidden" style={{ backgroundColor: fabric.hex }}>
        {fabric.pattern === "photo" && (
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
          {variants} Farben
        </span>
        <span className="absolute right-3 bottom-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/85 drop-shadow">
          {fabric.brand}
        </span>
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/0 opacity-0 transition group-hover:bg-stone-900/30 group-hover:opacity-100">
          <span className="bg-stone-900 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
            Vorhang konfigurieren
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5">
          {palette.map((c) => (
            <span
              key={c.id}
              className="h-3 w-3 rounded-full ring-1 ring-stone-200"
              style={{ backgroundColor: c.hex }}
              title={c.colorName}
            />
          ))}
          {variants > palette.length && (
            <span className="text-[10px] text-stone-500">+{variants - palette.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone-500">
          <span>{materialLabel[fabric.material]}</span>
          <span className="text-stone-300">·</span>
          <span>{transparencyLabel[fabric.transparency]}</span>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-900">
            {fabric.brand}
          </div>
          <div className="mt-0.5 text-sm text-stone-700">
            {fabric.collection} <span className="font-semibold">{fabric.colorName}</span>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-emerald-700">sofort verfügbar</span>
          <span className="font-semibold text-stone-900">
            {(fabric.pricePerMeter / 100).toFixed(2)} €/m*
          </span>
        </div>
      </div>
    </Link>
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
