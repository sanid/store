import { Link } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { FABRICS, type FabricSwatch } from "@/lib/curtains";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

// Editorial photo grid inspired by unique-factory.com.
// Tiles use placeholder gradients keyed to interior color palettes;
// swap in real photography by replacing `bg` with `bgImage` URLs later.
type Tile = {
  rowSpan?: number;
  colSpan?: number;
  bg: string;
  caption?: string;
};

const TILES: Tile[][] = [
  [
    { bg: "linear-gradient(135deg,#5e5953 0%,#3c3a36 60%,#1f1d1a 100%)", caption: "Wohnzimmer Marmor" },
    { bg: "linear-gradient(120deg,#c98c2a 0%,#9d5d28 100%)", colSpan: 2, caption: "Treppenhaus Ocker" },
  ],
  [
    { bg: "linear-gradient(135deg,#a8b09a 0%,#7e8a72 100%)", caption: "Salon Salbei" },
    { bg: "linear-gradient(140deg,#4a4842 0%,#28261f 100%)", colSpan: 2, caption: "Panorama Beton" },
  ],
  [
    { bg: "linear-gradient(135deg,#cfc6b6 0%,#a89e8a 100%)", colSpan: 3, caption: "Lounge Bouclé" },
  ],
  [
    { bg: "linear-gradient(135deg,#2c4760 0%,#1a2c3e 100%)", colSpan: 2, caption: "Suite Indigo" },
    { bg: "linear-gradient(135deg,#e29a8a 0%,#b9685a 100%)", caption: "Café Terracotta" },
  ],
  [
    { bg: "linear-gradient(135deg,#e7e2d5 0%,#c8c0ad 100%)", colSpan: 2, caption: "Atelier Licht" },
    { bg: "linear-gradient(135deg,#465548 0%,#283128 100%)", caption: "Studio Forest" },
  ],
  [
    { bg: "linear-gradient(135deg,#a3a98a 0%,#c98c2a 60%,#1f1d1a 100%)", colSpan: 3, caption: "Vorhang Konfigurator" },
  ],
];

function HomeContent() {
  return (
    <div className="bg-white">
      {/* Hero — quiet, like the studio site */}
      <section className="border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center lg:py-24">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-500">
            Manufaktur · Berlin · seit 2014
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-serif text-3xl font-light leading-[1.2] tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
            Maßgefertigte Vorhänge,<br />
            in unserer Berliner Manufaktur konfektioniert.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-stone-600">
            Wir entwerfen, beraten und produzieren in Berlin — von der Stoffauswahl
            bis zur Montage. Konfigurieren Sie Ihren Vorhang in 3D und sehen Sie
            Stoff, Faltenfall und Maße in Echtzeit.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/curtain-configurator"
              className="group inline-flex items-center gap-2 bg-stone-900 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-stone-700"
            >
              Konfigurator öffnen
              <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#kontakt"
              className="inline-flex items-center border border-stone-300 px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              Beratung anfragen
            </a>
          </div>
        </div>
      </section>

      {/* Bestseller fabrics */}
      <BestsellersSection />

      {/* Editorial grid */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-light tracking-wide text-stone-900">
            Sie &amp; Wir
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-stone-500">
            Auswahl unserer Projekte
          </span>
        </div>
        <div className="flex flex-col gap-2 lg:gap-3">
          {TILES.map((row, ri) => (
            <div key={ri} className="grid gap-2 lg:gap-3" style={{ gridTemplateColumns: `repeat(${row.reduce((s, t) => s + (t.colSpan ?? 1), 0)}, minmax(0, 1fr))` }}>
              {row.map((t, ti) => (
                <ConfiguratorTile
                  key={ti}
                  bg={t.bg}
                  caption={t.caption}
                  colSpan={t.colSpan}
                  isHero={ri === TILES.length - 1}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Three-column manufacturer story */}
      <section className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
            <Pillar
              title="Manufaktur"
              body="Jeder Vorhang wird in unserer Werkstatt in Berlin-Mitte von Hand konfektioniert. Saum, Faltenband, Futter — keine Zwischenhändler, keine Schnellfertigung."
            />
            <Pillar
              title="Stoffe"
              body="Wir arbeiten mit Romo, Kirkby Design, Zimmer Rohde, Villa Nova und führen eigene Hauskollektionen — Leinen, Samt, Baumwolle, Voile."
            />
            <Pillar
              title="Service"
              body="Beratung im Atelier oder bei Ihnen zuhause. Aufmaß, Montage und Garantie inklusive. Lieferzeit 10 bis 14 Werktage."
            />
          </div>
        </div>
      </section>

      {/* CTA — kontakt */}
      <section id="kontakt" className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-serif text-3xl font-light tracking-tight text-stone-900">
            Sprechen wir.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-stone-600">
            Atelier Linienstraße · Mo–Fr 10–18 Uhr<br />
            Termin nach Vereinbarung.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-stone-700">
            <a href="tel:+493023590385" className="transition hover:text-black">
              +49 30 235 903 858
            </a>
            <a href="mailto:atelier@unique-factory.com" className="transition hover:text-black">
              atelier@unique-factory.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function ConfiguratorTile({
  bg,
  caption,
  colSpan = 1,
  isHero,
}: {
  bg: string;
  caption?: string;
  colSpan?: number;
  isHero?: boolean;
}) {
  return (
    <Link
      href="/curtain-configurator"
      className="group relative block aspect-[4/3] overflow-hidden"
      style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
      <div
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]"
        style={{ background: bg }}
      />
      <div className="absolute inset-0 bg-stone-900/0 transition group-hover:bg-stone-900/15" />
      {caption && (
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 mix-blend-difference">
              {caption}
            </span>
            {isHero && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white drop-shadow">
                Konfigurator →
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

// Curated picks across brands and patterns
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
];

function BestsellersSection() {
  const bestsellers = BESTSELLER_IDS
    .map((id) => FABRICS.find((f) => f.id === id))
    .filter((f): f is FabricSwatch => Boolean(f));

  return (
    <section className="border-t border-stone-200">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="mb-8">
          <h2 className="font-serif text-3xl font-light tracking-tight text-stone-900">
            Unsere Bestseller &amp; Empfehlungen
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Die beliebtesten Stoffe unserer Kunden
          </p>
        </div>

        <div className="-mx-6 overflow-x-auto px-6 pb-2 lg:-mx-10 lg:px-10">
          <div className="flex gap-4">
            {bestsellers.map((f) => (
              <FabricCard key={f.id} fabric={f} variants={countVariants(f)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function countVariants(f: FabricSwatch): number {
  return FABRICS.filter((x) => x.brand === f.brand && x.collection === f.collection).length;
}

function FabricCard({ fabric, variants }: { fabric: FabricSwatch; variants: number }) {
  const palette = FABRICS
    .filter((x) => x.brand === fabric.brand && x.collection === fabric.collection)
    .slice(0, 6);
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
      className="group relative flex w-[260px] shrink-0 flex-col overflow-hidden border border-stone-200 bg-white transition hover:shadow-lg"
    >
      <div
        className="relative h-72 w-full overflow-hidden"
        style={{ backgroundColor: fabric.hex }}
      >
        {/* Subtle texture noise */}
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: noiseUrl() }}
        />
        {/* Vertical pleat shading to suggest fabric folds */}
        <div className="absolute inset-0" style={{ backgroundImage: foldShading() }} />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-stone-700 shadow-sm">
          {variants} Farben
        </span>
        <span className="absolute right-3 bottom-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/85 drop-shadow">
          {fabric.brand}
        </span>
        {/* Hover CTA */}
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
  // Vertical light/dark bands mimicking fabric folds
  return "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 14px, rgba(0,0,0,0.10) 18px, rgba(0,0,0,0) 24px, rgba(255,255,255,0.06) 32px, rgba(255,255,255,0) 38px)";
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-serif text-xl font-light tracking-wide text-stone-900">{title}</h3>
      <div className="mt-4 h-px w-10 bg-stone-300" />
      <p className="mt-4 text-[15px] leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}
